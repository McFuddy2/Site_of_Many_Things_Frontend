import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GRID_SIZE } from "../../../utils/character_sheet/grid";
import {
	SNAP_TOLERANCE,
	RESIZE_HANDLES,
	computeMoveSnap,
	computeResizeSnap,
	resizeRect,
	boundsOffsetForGroup,
	alignRects,
	distributeRects,
	rectFromPoints,
	marqueeHits,
	unionRect,
} from "../../../utils/character_sheet/snapping";

// The drag/resize/select controller behind both free-form canvases (cards on a
// page, modules within a card). It owns a draft map of { id: rect }, the
// selection, undo/redo, and the live alignment guides; the consumer supplies
// the initial rects and renders whatever it likes at each rect.
//
// Everything a gesture needs lives in gestureRef rather than state, and
// pointermove only records the latest pointer position — all the geometry and
// the single setState happen inside a requestAnimationFrame callback, so a
// fast pointer or trackpad can't queue up more work than the display can show.
// There is no separate "live DOM" path, so what you see during a drag is the
// committed rect: nothing can jump at drag end.

const DEFAULT_MIN_SIZE = { width: 20, height: 20 };

// Anything the user can actually operate has to swallow the pointer instead of
// starting a move — otherwise you couldn't click into a text field on a card.
const INTERACTIVE_SELECTOR = "input, textarea, select, button, a, label, [contenteditable='true'], [data-no-drag]";

const shiftRect = (rect, dx, dy) => ({ ...rect, x: rect.x + dx, y: rect.y + dy });

const roundRect = (rect) => ({
	x: Math.round(rect.x),
	y: Math.round(rect.y),
	width: Math.round(rect.width),
	height: Math.round(rect.height),
});

// Routing every later pointermove/up to the element that started the gesture is
// what lets a fast drag leave the item (or the window) without dropping it.
// Browsers throw if the pointer is no longer active by the time we ask, which
// is harmless — the gesture simply ends on the next up/lost-capture event.
function capturePointer(element, pointerId) {
	try {
		element.setPointerCapture(pointerId);
	} catch {
		// Pointer already released; nothing to capture.
	}
}

function releasePointer(element, pointerId) {
	try {
		if (element.hasPointerCapture(pointerId)) {
			element.releasePointerCapture(pointerId);
		}
	} catch {
		// Already released.
	}
}

// Bounds handling for a resize, where (unlike a move) the rect can't just be
// pushed back inside — the edge being dragged has to stop instead, or the
// opposite edge would drift.
function clampResizedRect(rect, bounds, minWidth, minHeight) {
	if (!bounds) {
		return rect;
	}
	const { minX = 0, minY = 0 } = bounds;
	let { x, y, width, height } = rect;
	if (x < minX) {
		width = Math.max(minWidth, width - (minX - x));
		x = minX;
	}
	if (y < minY) {
		height = Math.max(minHeight, height - (minY - y));
		y = minY;
	}
	return { x, y, width, height };
}

export default function useLayoutCanvas({
	initialRects,
	minSize = DEFAULT_MIN_SIZE,
	bounds = { minX: 0, minY: 0 },
	snapToGrid: initialSnapToGrid = true,
	snapToObjects: initialSnapToObjects = true,
	gridSize = GRID_SIZE,
	tolerance = SNAP_TOLERANCE,
	disabled = false,
}) {
	const [rects, setRects] = useState(initialRects);
	const [selection, setSelection] = useState([]);
	const [guides, setGuides] = useState([]);
	const [marquee, setMarquee] = useState(null);
	const [activeId, setActiveId] = useState(null);
	const [gestureType, setGestureType] = useState(null);
	const [snapToGrid, setSnapToGrid] = useState(initialSnapToGrid);
	const [snapToObjects, setSnapToObjects] = useState(initialSnapToObjects);
	const [aspectLocked, setAspectLocked] = useState(false);
	const [history, setHistory] = useState([]);
	const [future, setFuture] = useState([]);

	const rectsRef = useRef(rects);
	const selectionRef = useRef(selection);
	const gestureRef = useRef(null);
	const frameRef = useRef(null);
	const canvasRef = useRef(null);
	// Ratio captured when the lock is engaged (not recomputed per keystroke, or
	// rounding would let the shape drift while you type into the size fields).
	const aspectRatioRef = useRef(null);

	rectsRef.current = rects;
	selectionRef.current = selection;

	// Per-item minimums: a plain object applies to everything, a function lets
	// the consumer floor an item against its own content (e.g. a card that has
	// to stay big enough to show all its modules). candidateWidth is the width
	// the in-progress edit is heading towards (if known) — a consumer whose
	// minimum height depends on width (e.g. a card whose header wraps to a
	// second line below some width) can factor it in; one that doesn't just
	// ignores the second argument.
	const minSizeFor = useCallback(
		(id, candidateWidth) => {
			const resolved = typeof minSize === "function" ? minSize(id, candidateWidth) : minSize;
			return { width: resolved?.width ?? DEFAULT_MIN_SIZE.width, height: resolved?.height ?? DEFAULT_MIN_SIZE.height };
		},
		[minSize]
	);

	const snapOptions = useMemo(
		() => ({ tolerance, snapToGrid, snapToObjects, gridSize }),
		[tolerance, snapToGrid, snapToObjects, gridSize]
	);
	const snapOptionsRef = useRef(snapOptions);
	snapOptionsRef.current = snapOptions;

	const pushHistory = useCallback((snapshot) => {
		setHistory((stack) => [...stack, snapshot]);
		setFuture([]);
	}, []);

	// ---------- Selection ----------

	const selectOnly = useCallback((id) => setSelection(id == null ? [] : [id]), []);

	const toggleSelected = useCallback((id) => {
		setSelection((current) => (current.includes(id) ? current.filter((existing) => existing !== id) : [...current, id]));
	}, []);

	const clearSelection = useCallback(() => setSelection([]), []);

	// Keep the aspect ratio pinned to whatever is selected at the moment the
	// lock goes on, so the panel's Width/Height fields stay tied to that shape.
	useEffect(() => {
		if (!aspectLocked || selection.length !== 1) {
			aspectRatioRef.current = null;
			return;
		}
		const rect = rectsRef.current[selection[0]];
		aspectRatioRef.current = rect && rect.height !== 0 ? rect.width / rect.height : null;
	}, [aspectLocked, selection]);

	// A rect that disappears (a module removed from the layout) must not linger
	// in the selection, or the precision panel would edit a ghost.
	useEffect(() => {
		setSelection((current) => {
			const kept = current.filter((id) => rects[id]);
			return kept.length === current.length ? current : kept;
		});
	}, [rects]);

	// ---------- Gesture plumbing ----------

	const cancelFrame = () => {
		if (frameRef.current !== null) {
			cancelAnimationFrame(frameRef.current);
			frameRef.current = null;
		}
	};

	const flush = useCallback(() => {
		const gesture = gestureRef.current;
		if (!gesture) {
			return;
		}
		const dx = gesture.pointer.x - gesture.start.x;
		const dy = gesture.pointer.y - gesture.start.y;

		if (gesture.type === "move") {
			// Bounds first, then snapping — so a snap can never be what pushes the
			// group off-canvas, and a guide is only shown if it actually applied.
			let appliedDx = dx;
			let appliedDy = dy;
			const rawGroup = gesture.ids.map((id) => shiftRect(gesture.startRects[id], appliedDx, appliedDy));
			const boundsOffset = boundsOffsetForGroup(rawGroup, bounds);
			appliedDx += boundsOffset.dx;
			appliedDy += boundsOffset.dy;

			const primaryStart = gesture.startRects[gesture.primaryId];
			const rawPrimary = shiftRect(primaryStart, appliedDx, appliedDy);
			const snapped = computeMoveSnap(rawPrimary, gesture.targets, snapOptionsRef.current);
			let snapDx = snapped.rect.x - rawPrimary.x;
			let snapDy = snapped.rect.y - rawPrimary.y;

			const snappedGroup = gesture.ids.map((id) => shiftRect(gesture.startRects[id], appliedDx + snapDx, appliedDy + snapDy));
			const snapOffset = boundsOffsetForGroup(snappedGroup, bounds);
			let nextGuides = snapped.guides;
			if (snapOffset.dx !== 0) {
				snapDx = 0;
				nextGuides = nextGuides.filter((guide) => guide.orientation !== "vertical");
			}
			if (snapOffset.dy !== 0) {
				snapDy = 0;
				nextGuides = nextGuides.filter((guide) => guide.orientation !== "horizontal");
			}

			const totalDx = appliedDx + snapDx;
			const totalDy = appliedDy + snapDy;
			setRects((current) => {
				const next = { ...current };
				for (const id of gesture.ids) {
					next[id] = shiftRect(gesture.startRects[id], totalDx, totalDy);
				}
				return next;
			});
			setGuides(nextGuides);
			return;
		}

		if (gesture.type === "resize") {
			const lockAspect = gesture.shiftKey;
			const startRect = gesture.startRects[gesture.primaryId];
			// Raw, unfloored width the drag is heading towards — enough for a
			// width-dependent minimum (see minSizeFor) to react to a header about
			// to wrap before the resize itself is computed.
			const candidateWidth = startRect.width + gesture.handle.dirX * dx;
			const { width: minWidth, height: minHeight } = minSizeFor(gesture.primaryId, candidateWidth);
			const resized = resizeRect(startRect, gesture.handle, { dx, dy }, { minWidth, minHeight, lockAspect });
			const snapped = computeResizeSnap(resized, gesture.handle, gesture.targets, {
				...snapOptionsRef.current,
				minWidth,
				minHeight,
				lockAspect,
			});
			const clamped = clampResizedRect(snapped.rect, bounds, minWidth, minHeight);
			setRects((current) => ({ ...current, [gesture.primaryId]: clamped }));
			setGuides(snapped.guides);
			return;
		}

		if (gesture.type === "marquee") {
			const area = rectFromPoints(gesture.originPoint, gesture.currentPoint);
			const entries = Object.entries(rectsRef.current).map(([id, rect]) => ({ id, rect }));
			const hits = marqueeHits(area, entries);
			setMarquee(area);
			setSelection(gesture.additive ? [...new Set([...gesture.baseSelection, ...hits])] : hits);
		}
	}, [bounds, minSizeFor]);

	const scheduleFrame = useCallback(() => {
		if (frameRef.current !== null) {
			return;
		}
		frameRef.current = requestAnimationFrame(() => {
			frameRef.current = null;
			flush();
		});
	}, [flush]);

	const endGesture = useCallback(
		(committed) => {
			const gesture = gestureRef.current;
			if (!gesture) {
				return;
			}
			gestureRef.current = null;
			cancelFrame();
			setGuides([]);
			setMarquee(null);
			setActiveId(null);
			setGestureType(null);

			if (gesture.type === "marquee") {
				return;
			}
			if (!committed || !gesture.moved) {
				// Nothing actually changed (a plain click, or a cancelled drag):
				// roll back to the snapshot rather than leaving an empty undo step.
				setRects(gesture.snapshot);
				return;
			}
			// Only whole gestures land in history, and only rounded rects get
			// stored — sub-pixel drift from free (grid-off) placement would
			// otherwise accumulate across drags.
			setRects((current) => {
				const next = { ...current };
				for (const id of gesture.ids) {
					if (next[id]) {
						next[id] = roundRect(next[id]);
					}
				}
				return next;
			});
			pushHistory(gesture.snapshot);
		},
		[pushHistory]
	);

	// Escape aborts a gesture in flight; Shift is read live during a resize so
	// the ratio can be locked or released mid-drag without moving the pointer.
	useEffect(() => {
		if (!gestureType || gestureType === "marquee") {
			return undefined;
		}
		const handleKey = (event) => {
			const gesture = gestureRef.current;
			if (!gesture) {
				return;
			}
			if (event.key === "Escape") {
				endGesture(false);
				return;
			}
			if (event.key === "Shift" && gesture.type === "resize") {
				gesture.shiftKey = event.type === "keydown";
				scheduleFrame();
			}
		};
		window.addEventListener("keydown", handleKey);
		window.addEventListener("keyup", handleKey);
		return () => {
			window.removeEventListener("keydown", handleKey);
			window.removeEventListener("keyup", handleKey);
		};
	}, [gestureType, endGesture, scheduleFrame]);

	useEffect(() => cancelFrame, []);

	// ---------- Item props ----------

	const getItemProps = useCallback(
		(id) => ({
			"data-canvas-item": id,
			onPointerDown: (event) => {
				if (disabled || event.button !== 0) {
					return;
				}
				if (event.target.closest(INTERACTIVE_SELECTOR)) {
					return;
				}
				event.stopPropagation();
				event.preventDefault();

				// Shift+click toggles membership; clicking an unselected item
				// replaces the selection; clicking one already in a multi-selection
				// keeps the group so the whole thing can be dragged.
				let ids;
				if (event.shiftKey) {
					const already = selectionRef.current.includes(id);
					const next = already
						? selectionRef.current.filter((existing) => existing !== id)
						: [...selectionRef.current, id];
					setSelection(next);
					if (already) {
						return;
					}
					ids = next;
				} else if (selectionRef.current.includes(id)) {
					ids = [...selectionRef.current];
				} else {
					ids = [id];
					setSelection(ids);
				}

				const snapshot = rectsRef.current;
				const startRects = Object.fromEntries(ids.filter((each) => snapshot[each]).map((each) => [each, snapshot[each]]));
				gestureRef.current = {
					type: "move",
					ids: Object.keys(startRects),
					primaryId: id,
					startRects,
					snapshot,
					// Everything outside the moving set is a snap target — a card
					// can't usefully align to itself or to something moving with it.
					targets: Object.entries(snapshot)
						.filter(([targetId]) => !startRects[targetId])
						.map(([, rect]) => rect),
					start: { x: event.clientX, y: event.clientY },
					pointer: { x: event.clientX, y: event.clientY },
					moved: false,
				};
				setActiveId(id);
				setGestureType("move");
				capturePointer(event.currentTarget, event.pointerId);
			},
			onPointerMove: (event) => {
				const gesture = gestureRef.current;
				if (!gesture || gesture.type !== "move" || gesture.primaryId !== id) {
					return;
				}
				gesture.pointer = { x: event.clientX, y: event.clientY };
				gesture.moved =
					gesture.moved || Math.abs(event.clientX - gesture.start.x) > 1 || Math.abs(event.clientY - gesture.start.y) > 1;
				scheduleFrame();
			},
			onPointerUp: (event) => {
				releasePointer(event.currentTarget, event.pointerId);
				cancelFrame();
				flush();
				endGesture(true);
			},
			onLostPointerCapture: () => {
				if (gestureRef.current?.type === "move") {
					endGesture(true);
				}
			},
		}),
		[disabled, scheduleFrame, flush, endGesture]
	);

	const getHandleProps = useCallback(
		(id, handleId) => {
			const handle = RESIZE_HANDLES.find((each) => each.id === handleId);
			return {
				"data-resize-handle": handleId,
				style: { cursor: handle.cursor },
				onPointerDown: (event) => {
					if (disabled || event.button !== 0) {
						return;
					}
					event.stopPropagation();
					event.preventDefault();
					const snapshot = rectsRef.current;
					if (!snapshot[id]) {
						return;
					}
					setSelection([id]);
					gestureRef.current = {
						type: "resize",
						ids: [id],
						primaryId: id,
						handle,
						startRects: { [id]: snapshot[id] },
						snapshot,
						targets: Object.entries(snapshot)
							.filter(([targetId]) => targetId !== id)
							.map(([, rect]) => rect),
						start: { x: event.clientX, y: event.clientY },
						pointer: { x: event.clientX, y: event.clientY },
						shiftKey: event.shiftKey,
						moved: false,
					};
					setActiveId(id);
					setGestureType("resize");
					capturePointer(event.currentTarget, event.pointerId);
				},
				onPointerMove: (event) => {
					const gesture = gestureRef.current;
					if (!gesture || gesture.type !== "resize" || gesture.primaryId !== id) {
						return;
					}
					gesture.pointer = { x: event.clientX, y: event.clientY };
					gesture.shiftKey = event.shiftKey;
					gesture.moved =
						gesture.moved ||
						Math.abs(event.clientX - gesture.start.x) > 1 ||
						Math.abs(event.clientY - gesture.start.y) > 1;
					scheduleFrame();
				},
				onPointerUp: (event) => {
					releasePointer(event.currentTarget, event.pointerId);
					cancelFrame();
					flush();
					endGesture(true);
				},
				onLostPointerCapture: () => {
					if (gestureRef.current?.type === "resize") {
						endGesture(true);
					}
				},
			};
		},
		[disabled, scheduleFrame, flush, endGesture]
	);

	// ---------- Canvas props (marquee + deselect) ----------

	const getCanvasProps = useCallback(
		() => ({
			ref: canvasRef,
			onPointerDown: (event) => {
				// Only a press on bare canvas starts a marquee; a press that landed
				// on an item was already handled (and stopped) by getItemProps.
				if (disabled || event.button !== 0 || event.target.closest("[data-canvas-item]")) {
					return;
				}
				const canvasBox = canvasRef.current?.getBoundingClientRect();
				if (!canvasBox) {
					return;
				}
				const point = { x: event.clientX - canvasBox.left, y: event.clientY - canvasBox.top };
				if (!event.shiftKey) {
					setSelection([]);
				}
				gestureRef.current = {
					type: "marquee",
					ids: [],
					canvasBox,
					originPoint: point,
					currentPoint: point,
					additive: event.shiftKey,
					baseSelection: event.shiftKey ? [...selectionRef.current] : [],
					start: { x: event.clientX, y: event.clientY },
					pointer: { x: event.clientX, y: event.clientY },
					moved: false,
				};
				setGestureType("marquee");
				capturePointer(event.currentTarget, event.pointerId);
			},
			onPointerMove: (event) => {
				const gesture = gestureRef.current;
				if (!gesture || gesture.type !== "marquee") {
					return;
				}
				gesture.currentPoint = {
					x: event.clientX - gesture.canvasBox.left,
					y: event.clientY - gesture.canvasBox.top,
				};
				gesture.moved = true;
				scheduleFrame();
			},
			onPointerUp: (event) => {
				releasePointer(event.currentTarget, event.pointerId);
				// Flush before ending: a marquee drawn and released inside a single
				// frame never got a rAF callback, and would otherwise select nothing.
				cancelFrame();
				flush();
				endGesture(true);
			},
			onLostPointerCapture: () => {
				if (gestureRef.current?.type === "marquee") {
					endGesture(true);
				}
			},
		}),
		[disabled, scheduleFrame, flush, endGesture]
	);

	// ---------- Direct edits (precision panel, align, distribute) ----------

	// Applies a partial rect to one item, honouring the min size, the aspect
	// lock and the canvas bounds. Used by the numeric fields, where the value
	// arrives already final rather than as a delta. recordHistory is off for
	// the keystrokes after the first in one editing session, so typing "240"
	// is a single undo step rather than three.
	const updateRect = useCallback(
		(id, patch, { recordHistory = true } = {}) => {
			const current = rectsRef.current[id];
			if (!current) {
				return;
			}
			let next = { ...current, ...patch };

			const ratio = aspectRatioRef.current;
			if (ratio) {
				if (patch.width !== undefined && patch.height === undefined) {
					next.height = next.width / ratio;
				} else if (patch.height !== undefined && patch.width === undefined) {
					next.width = next.height * ratio;
				}
			}

			const { width: minWidth, height: minHeight } = minSizeFor(id, next.width);
			next.width = Math.max(minWidth, next.width);
			next.height = Math.max(minHeight, next.height);
			next.x = Math.max(bounds?.minX ?? 0, next.x);
			next.y = Math.max(bounds?.minY ?? 0, next.y);

			if (recordHistory) {
				pushHistory(rectsRef.current);
			}
			setRects((currentRects) => ({ ...currentRects, [id]: roundRect(next) }));
		},
		[bounds, minSizeFor, pushHistory]
	);

	const applyToSelection = useCallback(
		(compute) => {
			const entries = selectionRef.current.filter((id) => rectsRef.current[id]).map((id) => ({ id, rect: rectsRef.current[id] }));
			const changes = compute(entries);
			if (!changes || Object.keys(changes).length === 0) {
				return;
			}
			pushHistory(rectsRef.current);
			setRects((current) => {
				const next = { ...current };
				for (const [id, rect] of Object.entries(changes)) {
					next[id] = roundRect(rect);
				}
				return next;
			});
		},
		[pushHistory]
	);

	const align = useCallback((mode) => applyToSelection((entries) => alignRects(entries, mode)), [applyToSelection]);
	const distribute = useCallback((axis) => applyToSelection((entries) => distributeRects(entries, axis)), [applyToSelection]);

	// ---------- History ----------

	const undo = useCallback(() => {
		setHistory((stack) => {
			if (!stack.length) {
				return stack;
			}
			const previous = stack[stack.length - 1];
			setFuture((forward) => [rectsRef.current, ...forward]);
			setRects(previous);
			return stack.slice(0, -1);
		});
	}, []);

	const redo = useCallback(() => {
		setFuture((stack) => {
			if (!stack.length) {
				return stack;
			}
			const [next, ...rest] = stack;
			setHistory((back) => [...back, rectsRef.current]);
			setRects(next);
			return rest;
		});
	}, []);

	// Lets the consumer fold a change of its own (e.g. removing a module from
	// the layout) into the same undo stack the canvas manages.
	const commitRects = useCallback(
		(nextRects) => {
			pushHistory(rectsRef.current);
			setRects(nextRects);
		},
		[pushHistory]
	);

	const selectionBounds = useMemo(
		() => unionRect(selection.map((id) => rects[id]).filter(Boolean)),
		[selection, rects]
	);

	return {
		rects,
		setRects,
		commitRects,
		selection,
		selectionBounds,
		selectOnly,
		toggleSelected,
		clearSelection,
		guides,
		marquee,
		activeId,
		gestureType,
		isInteracting: gestureType !== null,
		snapToGrid,
		setSnapToGrid,
		snapToObjects,
		setSnapToObjects,
		gridSize,
		aspectLocked,
		setAspectLocked,
		updateRect,
		align,
		distribute,
		undo,
		redo,
		canUndo: history.length > 0,
		canRedo: future.length > 0,
		getItemProps,
		getHandleProps,
		getCanvasProps,
		canvasRef,
		minSizeFor,
	};
}
