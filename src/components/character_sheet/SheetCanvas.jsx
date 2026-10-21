import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import CharacterSheetCard from "./CharacterSheetCard";
import { useCharacterSheet } from "./CharacterSheetContext";
import SelectionToolbar from "./SelectionToolbar";
import ContextMenu from "./ContextMenu";
import PositionSizePopover from "./PositionSizePopover";
import AddModuleDialog from "./AddModuleDialog";
import { BUCKET_CURSOR } from "./icons";
import { cloneCard, cloneModule } from "../../utils/character_sheet/schema";
import { rectToPx, getCardMinSize, moduleGridSize, boundingSize } from "../../utils/character_sheet/grid";
import {
	planCardChange,
	planModuleChange,
	pageColumnLimit,
	alignRects,
	distributeRects,
} from "../../utils/character_sheet/placement";
import { RESIZE_HANDLES, snapMove, resizeSnap, boxesTouch, boxFromPoints } from "../../utils/character_sheet/snapping";
import { getModuleSizing } from "../../utils/character_sheet/moduleTypes";
import { canDeleteCard, canDeleteModule } from "../../utils/character_sheet/references";
import { countCardPlacements } from "../../utils/character_sheet/sheetOps";
import {
	GRID_UNIT,
	MODULE_GRID_OFFSET_X,
	MODULE_GRID_OFFSET_Y,
} from "../../utils/character_sheet/layoutConstants";

// The page canvas, and the whole direct-manipulation layer on top of it —
// there's no separate "edit layout" mode. Content is always live: a press on
// an input, checkbox or button just works and never starts a drag. Anything
// else is chrome:
//
//   card header         select the card; drag to move it
//   module chrome       (label bar, border, padding) select the module; drag to move it
//   card body (empty)   click selects the card; drag marquee-selects its modules
//   empty canvas        click clears; drag marquee-selects cards
//   handles             resize the selected card/module from any edge or corner
//
// Selection is one level at a time (cards, or modules within one card).
// Moves and resizes snap to whole grid cells, with smart guides (Alt turns
// them off), preview live — including where everything they push will land
// (see placement.js) — and commit on release as one undo step. Esc cancels.

const DRAG_THRESHOLD = 3; // px a press must travel before it's a drag
const NO_SELECTION = { level: null, layoutId: null, ids: [] };
const INTERACTIVE_SELECTOR = "input, textarea, select, button, a, label, [contenteditable='true']";
const HANDLE_HIT = 16; // px thickness of an edge's grab strip
const CORNER_HIT = 20; // px square of a corner's grab area
const TOOLBAR_HEIGHT = 40;
const TOOLBAR_HALF_WIDTH = 104;
const TOOLBAR_GAP = 14; // clears the selection's handles

const rectOf = (layout) => ({ x: layout.x, y: layout.y, w: layout.w, h: layout.h });
const sameRect = (a, b) => a && b && a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;

function isFieldFocused() {
	const element = document.activeElement;
	if (!element) {
		return false;
	}
	return ["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName) || element.isContentEditable;
}

function blurField() {
	if (isFieldFocused()) {
		document.activeElement.blur();
	}
}

// px box of a module inside a card at `cardRect`, in canvas coordinates.
function moduleBox(cardRect, moduleRect) {
	const box = rectToPx(moduleRect);
	return {
		left: cardRect.x * GRID_UNIT + MODULE_GRID_OFFSET_X + box.left,
		top: cardRect.y * GRID_UNIT + MODULE_GRID_OFFSET_Y + box.top,
		width: box.width,
		height: box.height,
	};
}

function handleStyle(box, handle) {
	const edgeX = handle.dirX === -1 ? box.left : box.left + box.width;
	const edgeY = handle.dirY === -1 ? box.top : box.top + box.height;
	if (handle.dirX && handle.dirY) {
		return { left: edgeX - CORNER_HIT / 2, top: edgeY - CORNER_HIT / 2, width: CORNER_HIT, height: CORNER_HIT };
	}
	if (handle.dirY) {
		return {
			left: box.left + CORNER_HIT / 2,
			width: Math.max(0, box.width - CORNER_HIT),
			top: edgeY - HANDLE_HIT / 2,
			height: HANDLE_HIT,
		};
	}
	return {
		top: box.top + CORNER_HIT / 2,
		height: Math.max(0, box.height - CORNER_HIT),
		left: edgeX - HANDLE_HIT / 2,
		width: HANDLE_HIT,
	};
}

function Handles({ box, level, id, layoutId }) {
	return RESIZE_HANDLES.map((handle) => (
		<div
			key={handle.id}
			className={`cs-handle cs-handle--${handle.dirX && handle.dirY ? "corner" : handle.dirY ? "edge-h" : "edge-v"}`}
			data-handle={handle.id}
			data-level={level}
			data-id={id}
			data-layout={layoutId}
			style={{ ...handleStyle(box, handle), cursor: handle.cursor }}
		/>
	));
}

// Explains why something can't be deleted yet and lets the player jump to
// each card that still references it.
function DeleteBlockedDialog({ blocked, onClose, onNavigate }) {
	return (
		<Dialog.Root open={Boolean(blocked)} onOpenChange={(open) => !open && onClose()}>
			<Dialog.Portal>
				<Dialog.Overlay className="cs-modal-overlay" />
				<Dialog.Content className="cs-modal" aria-describedby={undefined}>
					{blocked && (
						<>
							<Dialog.Title className="cs-modal-title">Can’t Delete “{blocked.title}” Yet</Dialog.Title>
							<p className="cs-builder-hint">
								Something else on the sheet still uses its values. Remove those references first — click a card
								below to go to it.
							</p>
							<ul className="cs-delete-blocked-list">
								{blocked.referencedBy.map((entry) => (
									<li key={entry.cardId}>
										<button
											type="button"
											className="cs-modal-button"
											onClick={() => {
												onClose();
												onNavigate(entry.cardId);
											}}
										>
											{entry.cardTitle}
										</button>
									</li>
								))}
							</ul>
							<div className="cs-modal-actions">
								<button type="button" className="cs-modal-button" onClick={onClose}>
									Close
								</button>
							</div>
						</>
					)}
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}

export default function SheetCanvas({ showGrid, getPageColumns, focusRequest }) {
	const { sheet, dispatch } = useCharacterSheet();
	const page = sheet.pages.find((existing) => existing.id === sheet.activePageId) || sheet.pages[0];
	const layouts = page.cardLayouts;
	const canvasRef = useRef(null);
	const gestureRef = useRef(null);
	const frameRef = useRef(null);
	const [selection, setSelection] = useState(NO_SELECTION);
	const [preview, setPreview] = useState(null);
	// The preview is also kept in a ref, so a gesture's commit reads exactly
	// what was last shown.
	const previewRef = useRef(null);
	const showPreview = useCallback((next) => {
		previewRef.current = next;
		setPreview(next);
	}, []);
	const [blocked, setBlocked] = useState(null);
	const [pendingFocus, setPendingFocus] = useState(null); // card ids to select (and scroll to) once they're on screen
	const [menu, setMenu] = useState(null); // { x, y, items, label }
	const [positionPopover, setPositionPopover] = useState(null); // { x, y }
	const [renamingId, setRenamingId] = useState(null); // layout id whose title is being edited
	const [addModuleTo, setAddModuleTo] = useState(null); // layout id
	const [paintMode, setPaintMode] = useState(false);
	const [paintColor, setPaintColor] = useState("#5b9bd5");
	const [, setScrollTick] = useState(0);

	// Latest values for the window-level listeners below.
	const live = useRef({});
	live.current = { sheet, page, layouts, selection, preview, blocked, paintMode, menu, positionPopover };

	const layoutById = useMemo(() => Object.fromEntries(layouts.map((layout) => [layout.id, layout])), [layouts]);
	const maxCols = useCallback(
		() => pageColumnLimit(live.current.layouts, getPageColumns ? getPageColumns() : 0),
		[getPageColumns]
	);

	// Selection belongs to a page: switching pages starts fresh.
	const lastPageRef = useRef(page.id);
	useEffect(() => {
		if (lastPageRef.current !== page.id) {
			lastPageRef.current = page.id;
			setSelection(NO_SELECTION);
			setMenu(null);
			setPositionPopover(null);
		}
	}, [page.id]);

	// A card someone asked to see — a freshly added card, or one a "referenced
	// by" link jumped to — is selected and scrolled into view once its page
	// shows it.
	useEffect(() => {
		if (focusRequest?.cardId) {
			setPendingFocus([focusRequest.cardId]);
		}
	}, [focusRequest]);

	useEffect(() => {
		const targets = (pendingFocus || []).map((cardId) => layouts.find((each) => each.cardId === cardId));
		if (!targets.length || targets.some((layout) => !layout)) {
			return;
		}
		setSelection({ level: "cards", layoutId: null, ids: targets.map((layout) => layout.id) });
		setPendingFocus(null);
		requestAnimationFrame(() =>
			canvasRef.current?.querySelector(`[data-layout-id="${targets[0].id}"]`)?.scrollIntoView({
				block: "nearest",
				inline: "nearest",
				behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
			})
		);
	}, [pendingFocus, layouts]);

	// The toolbar flips below the selection when there's no room above it in
	// the visible area, so it needs to re-measure as the page scrolls.
	useEffect(() => {
		const scroller = canvasRef.current?.parentElement;
		if (!scroller) {
			return undefined;
		}
		const onScroll = () => setScrollTick((tick) => tick + 1);
		scroller.addEventListener("scroll", onScroll, { passive: true });
		return () => scroller.removeEventListener("scroll", onScroll);
	}, []);

	// Anything that disappears (deleted, undone) drops out of the selection.
	useEffect(() => {
		setSelection((current) => {
			if (!current.level) {
				return current;
			}
			if (current.level === "cards") {
				const ids = current.ids.filter((id) => layoutById[id]);
				return ids.length === current.ids.length ? current : ids.length ? { ...current, ids } : NO_SELECTION;
			}
			const layout = layoutById[current.layoutId];
			const ids = layout ? current.ids.filter((id) => layout.moduleRects[id]) : [];
			return ids.length === current.ids.length ? current : ids.length ? { ...current, ids } : NO_SELECTION;
		});
	}, [layoutById]);

	const isSelected = (level, id, layoutId = null) =>
		selection.level === level && selection.ids.includes(id) && (level === "cards" || selection.layoutId === layoutId);

	// ---------- Gesture plumbing ----------

	const canvasPoint = (event) => {
		const box = canvasRef.current.getBoundingClientRect();
		return { x: event.clientX - box.left + canvasRef.current.scrollLeft, y: event.clientY - box.top + canvasRef.current.scrollTop };
	};

	// Recomputes the live preview for the gesture in flight from its start
	// state and the latest pointer — never from the previous frame, so the
	// preview and the final commit always agree.
	const computeFrame = useCallback(() => {
		const gesture = gestureRef.current;
		if (!gesture || gesture.phase !== "active") {
			return;
		}
		const { sheet: currentSheet, layouts: currentLayouts } = live.current;
		const du = {
			dx: (gesture.pointer.clientX - gesture.start.clientX) / GRID_UNIT,
			dy: (gesture.pointer.clientY - gesture.start.clientY) / GRID_UNIT,
		};
		const guides = !gesture.altKey;

		if (gesture.type === "moveCards") {
			const primary = gesture.startRects[gesture.primaryId];
			const targets = currentLayouts.filter((layout) => !gesture.startRects[layout.id]).map(rectOf);
			const snapped = snapMove({ ...primary, x: primary.x + du.dx, y: primary.y + du.dy }, targets, { guides });
			let dx = snapped.rect.x - primary.x;
			let dy = snapped.rect.y - primary.y;
			const group = Object.values(gesture.startRects);
			const clampedX = Math.max(dx, -Math.min(...group.map((rect) => rect.x)));
			const clampedY = Math.max(dy, -Math.min(...group.map((rect) => rect.y)));
			const lines = snapped.guides.filter(
				(line) => (line.orientation === "vertical" ? clampedX === dx : clampedY === dy)
			);
			dx = clampedX;
			dy = clampedY;
			const moved = Object.fromEntries(
				Object.entries(gesture.startRects).map(([id, rect]) => [id, { ...rect, x: rect.x + dx, y: rect.y + dy }])
			);
			showPreview({
				cardRects: planCardChange(currentLayouts, moved, { maxCols: maxCols() }),
				guides: { level: "cards", lines },
				active: Object.keys(moved),
			});
			return;
		}

		if (gesture.type === "resizeCard") {
			const layout = currentLayouts.find((each) => each.id === gesture.layoutId);
			const card = currentSheet.cards[layout.cardId];
			const min = getCardMinSize(card, layout);
			const targets = currentLayouts.filter((each) => each.id !== layout.id).map(rectOf);
			const result = resizeSnap(gesture.startRect, gesture.handle, du, {
				minW: min.w,
				minHFor: () => min.h,
				lockAspect: gesture.shiftKey,
				targets,
				guides,
			});
			showPreview({
				cardRects: planCardChange(currentLayouts, { [layout.id]: result.rect }, { maxCols: maxCols() }),
				guides: { level: "cards", lines: result.guides },
				active: [layout.id],
			});
			return;
		}

		if (gesture.type === "moveModules" || gesture.type === "resizeModule") {
			const layout = currentLayouts.find((each) => each.id === gesture.layoutId);
			const card = currentSheet.cards[layout.cardId];
			const { cols } = moduleGridSize(layout.w, layout.h);
			let changed;
			let lines;
			if (gesture.type === "moveModules") {
				const primary = gesture.startRects[gesture.primaryId];
				const targets = layout.moduleOrder
					.filter((id) => layout.moduleRects[id] && !gesture.startRects[id])
					.map((id) => layout.moduleRects[id]);
				const snapped = snapMove({ ...primary, x: primary.x + du.dx, y: primary.y + du.dy }, targets, { guides });
				let dx = snapped.rect.x - primary.x;
				let dy = snapped.rect.y - primary.y;
				const group = Object.values(gesture.startRects);
				const minX = Math.min(...group.map((rect) => rect.x));
				const maxRight = Math.max(...group.map((rect) => rect.x + rect.w));
				const clampedX = Math.min(Math.max(dx, -minX), cols - maxRight);
				const clampedY = Math.max(dy, -Math.min(...group.map((rect) => rect.y)));
				lines = snapped.guides.filter((line) => (line.orientation === "vertical" ? clampedX === dx : clampedY === dy));
				dx = clampedX;
				dy = clampedY;
				changed = Object.fromEntries(
					Object.entries(gesture.startRects).map(([id, rect]) => [id, { ...rect, x: rect.x + dx, y: rect.y + dy }])
				);
			} else {
				const module = card.modules[gesture.moduleId];
				const targets = layout.moduleOrder
					.filter((id) => layout.moduleRects[id] && id !== gesture.moduleId)
					.map((id) => layout.moduleRects[id]);
				const result = resizeSnap(gesture.startRect, gesture.handle, du, {
					minW: Math.min(getModuleSizing(module).minW, cols),
					minHFor: (w) => getModuleSizing(module, w).minH,
					maxRight: cols,
					lockAspect: gesture.shiftKey,
					targets,
					guides,
				});
				changed = { [gesture.moduleId]: result.rect };
				lines = result.guides;
			}
			const plan = planModuleChange(card, layout, changed, currentLayouts, { maxCols: maxCols() });
			showPreview({
				cardRects: plan.pageRects,
				moduleLayoutId: layout.id,
				moduleRects: plan.moduleRects,
				guides: { level: "modules", layoutId: layout.id, lines },
				active: Object.keys(changed),
			});
			return;
		}

		if (gesture.type === "marqueeCards") {
			const box = boxFromPoints(gesture.startPoint, gesture.point);
			const hits = currentLayouts.filter((layout) => boxesTouch(box, rectToPx(layout))).map((layout) => layout.id);
			const ids = gesture.additive ? [...new Set([...gesture.baseIds, ...hits])] : hits;
			setSelection(ids.length ? { level: "cards", layoutId: null, ids } : NO_SELECTION);
			showPreview({ marquee: { box } });
			return;
		}

		if (gesture.type === "marqueeModules") {
			const layout = currentLayouts.find((each) => each.id === gesture.layoutId);
			const box = boxFromPoints(gesture.startPoint, gesture.point);
			const hits = layout.moduleOrder.filter(
				(id) => layout.moduleRects[id] && boxesTouch(box, moduleBox(layout, layout.moduleRects[id]))
			);
			const ids = gesture.additive ? [...new Set([...gesture.baseIds, ...hits])] : hits;
			setSelection(ids.length ? { level: "modules", layoutId: layout.id, ids } : NO_SELECTION);
			showPreview({ marquee: { box } });
		}
	}, [maxCols, showPreview]);

	const scheduleFrame = useCallback(() => {
		if (frameRef.current !== null) {
			return;
		}
		frameRef.current = requestAnimationFrame(() => {
			frameRef.current = null;
			computeFrame();
		});
	}, [computeFrame]);

	const endGesture = useCallback(
		(commit) => {
			const gesture = gestureRef.current;
			gestureRef.current = null;
			if (frameRef.current !== null) {
				cancelAnimationFrame(frameRef.current);
				frameRef.current = null;
			}
			if (!gesture) {
				return;
			}
			if (gesture.phase === "active" && commit) {
				// Flush the final pointer position synchronously so a drag that
				// finishes within one frame still lands where it was released.
				computeFrame();
			}
			const current = previewRef.current;
			if (commit && gesture.phase === "active" && current && (current.cardRects || current.moduleRects)) {
				const { page: currentPage, layouts: currentLayouts } = live.current;
				const cardRects = {};
				for (const layout of currentLayouts) {
					const next = current.cardRects?.[layout.id];
					if (next && !sameRect(next, layout)) {
						cardRects[layout.id] = next;
					}
				}
				const moduleLayout = current.moduleLayoutId ? currentLayouts.find((each) => each.id === current.moduleLayoutId) : null;
				const moduleChanged =
					moduleLayout && Object.entries(current.moduleRects).some(([id, rect]) => !sameRect(rect, moduleLayout.moduleRects[id]));
				if (Object.keys(cardRects).length || moduleChanged) {
					dispatch({
						type: "applyPageLayout",
						pageId: currentPage.id,
						cardRects,
						moduleLayoutId: moduleChanged ? moduleLayout.id : null,
						moduleRects: moduleChanged ? current.moduleRects : null,
					});
				}
			}
			showPreview(null);
			if (gesture.phase === "press") {
				gesture.onClick?.();
			}
		},
		[computeFrame, dispatch, showPreview]
	);

	// Starts tracking a press; it becomes a drag (`activate`) once the pointer
	// travels past DRAG_THRESHOLD, or a click (`onClick`) if it doesn't.
	const beginPress = (event, { activate, onClick }) => {
		event.preventDefault();
		blurField();
		try {
			canvasRef.current.setPointerCapture(event.pointerId);
		} catch {
			// Pointer already gone.
		}
		gestureRef.current = {
			phase: "press",
			activate,
			onClick,
			start: { clientX: event.clientX, clientY: event.clientY },
			pointer: { clientX: event.clientX, clientY: event.clientY },
			startPoint: canvasPoint(event),
			point: canvasPoint(event),
			altKey: event.altKey,
			shiftKey: event.shiftKey,
		};
	};

	// Press-to-select on an item (card or module). Shift/Ctrl toggles it in
	// the selection; a press on an already-selected item keeps the group (so
	// the whole group can be dragged) and narrows to just it on a plain click.
	const pressItem = (event, level, id, layoutId, activate) => {
		const additive = event.shiftKey || event.ctrlKey || event.metaKey;
		const sameLevel = selection.level === level && (level === "cards" || selection.layoutId === layoutId);
		const already = sameLevel && selection.ids.includes(id);
		let ids;
		if (additive) {
			ids = already ? selection.ids.filter((each) => each !== id) : sameLevel ? [...selection.ids, id] : [id];
			setSelection(ids.length ? { level, layoutId, ids } : NO_SELECTION);
			if (already) {
				event.preventDefault();
				blurField();
				return;
			}
		} else if (!already) {
			ids = [id];
			setSelection({ level, layoutId, ids });
		} else {
			ids = selection.ids;
		}
		beginPress(event, {
			activate: () => activate(ids),
			onClick: already && !additive ? () => setSelection({ level, layoutId, ids: [id] }) : null,
		});
	};

	const onPointerDown = (event) => {
		if (event.button !== 0 || gestureRef.current) {
			return;
		}
		const target = event.target;
		if (target.closest("[data-canvas-ui]")) {
			return;
		}
		const handle = target.closest("[data-handle]");
		if (handle) {
			const spec = RESIZE_HANDLES.find((each) => each.id === handle.dataset.handle);
			const layout = layoutById[handle.dataset.layout || handle.dataset.id];
			if (!layout) {
				return;
			}
			if (handle.dataset.level === "cards") {
				beginPress(event, {
					activate: () => ({ type: "resizeCard", layoutId: layout.id, handle: spec, startRect: rectOf(layout) }),
				});
			} else {
				const moduleId = handle.dataset.id;
				beginPress(event, {
					activate: () => ({
						type: "resizeModule",
						layoutId: layout.id,
						moduleId,
						handle: spec,
						startRect: layout.moduleRects[moduleId],
					}),
				});
			}
			return;
		}
		if (target.closest(INTERACTIVE_SELECTOR)) {
			return;
		}
		const cardEl = target.closest("[data-layout-id]");
		const layout = cardEl ? layoutById[cardEl.dataset.layoutId] : null;
		const moduleEl = target.closest("[data-module-id]");
		const additive = event.shiftKey || event.ctrlKey || event.metaKey;

		if (layout && moduleEl) {
			const moduleId = moduleEl.dataset.moduleId;
			pressItem(event, "modules", moduleId, layout.id, (ids) => ({
				type: "moveModules",
				layoutId: layout.id,
				primaryId: moduleId,
				startRects: Object.fromEntries(ids.map((id) => [id, layout.moduleRects[id]]).filter(([, rect]) => rect)),
			}));
			return;
		}
		if (layout && target.closest(".cs-card-header")) {
			pressItem(event, "cards", layout.id, null, (ids) => ({
				type: "moveCards",
				primaryId: layout.id,
				startRects: Object.fromEntries(ids.filter((id) => layoutById[id]).map((id) => [id, rectOf(layoutById[id])])),
			}));
			return;
		}
		if (layout) {
			const baseIds = selection.level === "modules" && selection.layoutId === layout.id && additive ? selection.ids : [];
			beginPress(event, {
				activate: () => ({ type: "marqueeModules", layoutId: layout.id, additive, baseIds }),
				onClick: () => {
					if (additive && selection.level === "cards") {
						const ids = selection.ids.includes(layout.id)
							? selection.ids.filter((id) => id !== layout.id)
							: [...selection.ids, layout.id];
						setSelection(ids.length ? { level: "cards", layoutId: null, ids } : NO_SELECTION);
					} else {
						setSelection({ level: "cards", layoutId: null, ids: [layout.id] });
					}
				},
			});
			return;
		}
		const baseIds = selection.level === "cards" && additive ? selection.ids : [];
		beginPress(event, {
			activate: () => ({ type: "marqueeCards", additive, baseIds }),
			onClick: additive ? null : () => setSelection(NO_SELECTION),
		});
	};

	// What a pointer event landed on: { layout, moduleId } (moduleId null for
	// the card itself), or null for empty canvas.
	const itemAt = (target) => {
		const cardEl = target.closest("[data-layout-id]");
		const layout = cardEl ? layoutById[cardEl.dataset.layoutId] : null;
		if (!layout) {
			return null;
		}
		return { layout, moduleId: target.closest("[data-module-id]")?.dataset.moduleId || null };
	};

	// Paint Mode: every click colours exactly the part it lands on — a
	// module's label bar, a module's body, a card's header, or the card's
	// background (the empty space around its modules) — instead of focusing,
	// typing or selecting; each one undo step. Runs in the capture phase so
	// nothing inside the card ever sees the press.
	const onPointerDownCapture = (event) => {
		if (!paintMode || event.button !== 0 || event.target.closest("[data-canvas-ui]")) {
			return;
		}
		event.preventDefault();
		event.stopPropagation();
		const hit = itemAt(event.target);
		if (!hit) {
			return;
		}
		const cardId = hit.layout.cardId;
		let item = null;
		if (hit.moduleId) {
			item = { cardId, moduleId: hit.moduleId, part: event.target.closest(".cs-mod-label") ? "label" : "body" };
		} else if (event.target.closest(".cs-card-header")) {
			item = { cardId, part: "header" };
		} else {
			item = { cardId, part: "background" };
		}
		if (item) {
			dispatch({ type: "setItemsColor", items: [item], color: paintColor });
		}
	};

	// Right-click: the selection's menu. A right-click on something outside
	// the selection selects it first; inside a field the browser's own menu
	// (copy, paste…) is left alone.
	const onContextMenu = (event) => {
		if (paintMode || event.target.closest(`${INTERACTIVE_SELECTOR}, [data-canvas-ui]`)) {
			return;
		}
		const hit = itemAt(event.target);
		if (!hit) {
			return;
		}
		event.preventDefault();
		const level = hit.moduleId ? "modules" : "cards";
		const id = hit.moduleId || hit.layout.id;
		const already = isSelected(level, id, hit.layout.id);
		const next = already ? selection : { level, layoutId: hit.moduleId ? hit.layout.id : null, ids: [id] };
		if (!already) {
			setSelection(next);
		}
		openMenu(next, event.clientX, event.clientY);
	};

	// Double-clicking a card's title renames it in place. The press captured
	// the pointer to the canvas, which makes the browser aim the click (and
	// double-click) at the canvas itself — so look up what's actually under
	// the pointer rather than trusting event.target.
	const onDoubleClick = (event) => {
		if (paintMode) {
			return;
		}
		const under = document.elementFromPoint(event.clientX, event.clientY);
		if (!under?.closest(".cs-card-title")) {
			return;
		}
		const hit = itemAt(under);
		if (hit) {
			setRenamingId(hit.layout.id);
		}
	};

	const onPointerMove = (event) => {
		const gesture = gestureRef.current;
		if (!gesture) {
			return;
		}
		gesture.pointer = { clientX: event.clientX, clientY: event.clientY };
		gesture.point = canvasPoint(event);
		gesture.altKey = event.altKey;
		gesture.shiftKey = event.shiftKey;
		if (gesture.phase === "press") {
			const travelled = Math.hypot(event.clientX - gesture.start.clientX, event.clientY - gesture.start.clientY);
			if (travelled <= DRAG_THRESHOLD || !gesture.activate) {
				return;
			}
			Object.assign(gesture, gesture.activate(), { phase: "active" });
		}
		scheduleFrame();
	};

	const onPointerUp = (event) => {
		if (!gestureRef.current) {
			return;
		}
		try {
			canvasRef.current.releasePointerCapture(event.pointerId);
		} catch {
			// Already released.
		}
		endGesture(true);
	};

	// ---------- Keyboard ----------

	const nudge = useCallback(
		(dx, dy) => {
			const { sheet: currentSheet, page: currentPage, layouts: currentLayouts, selection: current } = live.current;
			if (current.level === "cards") {
				const group = current.ids.map((id) => currentLayouts.find((layout) => layout.id === id)).filter(Boolean);
				const stepX = Math.max(dx, -Math.min(...group.map((layout) => layout.x)));
				const stepY = Math.max(dy, -Math.min(...group.map((layout) => layout.y)));
				if (!group.length || (!stepX && !stepY)) {
					return;
				}
				const moved = Object.fromEntries(group.map((layout) => [layout.id, { ...rectOf(layout), x: layout.x + stepX, y: layout.y + stepY }]));
				const rects = planCardChange(currentLayouts, moved, { maxCols: maxCols() });
				dispatch({ type: "applyPageLayout", pageId: currentPage.id, cardRects: rects });
				return;
			}
			if (current.level === "modules") {
				const layout = currentLayouts.find((each) => each.id === current.layoutId);
				if (!layout) {
					return;
				}
				const { cols } = moduleGridSize(layout.w, layout.h);
				const group = current.ids.map((id) => layout.moduleRects[id]).filter(Boolean);
				const minX = Math.min(...group.map((rect) => rect.x));
				const maxRight = Math.max(...group.map((rect) => rect.x + rect.w));
				const stepX = Math.min(Math.max(dx, -minX), cols - maxRight);
				const stepY = Math.max(dy, -Math.min(...group.map((rect) => rect.y)));
				if (!group.length || (!stepX && !stepY)) {
					return;
				}
				const changed = Object.fromEntries(
					current.ids
						.filter((id) => layout.moduleRects[id])
						.map((id) => [id, { ...layout.moduleRects[id], x: layout.moduleRects[id].x + stepX, y: layout.moduleRects[id].y + stepY }])
				);
				const plan = planModuleChange(currentSheet.cards[layout.cardId], layout, changed, currentLayouts, { maxCols: maxCols() });
				dispatch({
					type: "applyPageLayout",
					pageId: currentPage.id,
					cardRects: plan.pageRects,
					moduleLayoutId: layout.id,
					moduleRects: plan.moduleRects,
				});
			}
		},
		[dispatch, maxCols]
	);

	// Deletes the selection. Anything another card still references stays,
	// and the dialog explains which cards are holding on to it.
	const deleteSelection = useCallback(() => {
		const { sheet: currentSheet, page: currentPage, layouts: currentLayouts, selection: current } = live.current;
		if (current.level === "cards") {
			const allowed = [];
			let firstBlocked = null;
			for (const layoutId of current.ids) {
				const layout = currentLayouts.find((each) => each.id === layoutId);
				if (!layout) {
					continue;
				}
				const check = countCardPlacements(currentSheet, layout.cardId) > 1 ? { ok: true } : canDeleteCard(currentSheet, layout.cardId);
				if (check.ok) {
					allowed.push(layoutId);
				} else if (!firstBlocked) {
					firstBlocked = { title: currentSheet.cards[layout.cardId].title, referencedBy: check.referencedBy };
				}
			}
			if (allowed.length) {
				dispatch({ type: "deleteLayouts", pageId: currentPage.id, layoutIds: allowed });
			}
			setSelection(NO_SELECTION);
			setBlocked(firstBlocked);
			return;
		}
		if (current.level === "modules") {
			const layout = currentLayouts.find((each) => each.id === current.layoutId);
			if (!layout) {
				return;
			}
			const card = currentSheet.cards[layout.cardId];
			const allowed = [];
			let firstBlocked = null;
			for (const moduleId of current.ids) {
				const check = canDeleteModule(currentSheet, card.id, moduleId);
				if (check.ok) {
					allowed.push(moduleId);
				} else if (!firstBlocked) {
					firstBlocked = { title: card.modules[moduleId]?.label || "this module", referencedBy: check.referencedBy };
				}
			}
			if (allowed.length) {
				dispatch({ type: "deleteModules", cardId: card.id, moduleIds: allowed });
			}
			setSelection(NO_SELECTION);
			setBlocked(firstBlocked);
		}
	}, [dispatch]);

	// ---------- Selection actions (toolbar, menus, shortcuts) ----------
	// All of these read live.current so they act on what's on screen now, and
	// each dispatches exactly once: one action, one undo step.

	// The selection as colourable items: { cardId } for a card (its header),
	// { cardId, moduleId, part } for a module.
	const selectionItems = (part = "all") => {
		const { sheet: currentSheet, layouts: currentLayouts, selection: current } = live.current;
		if (current.level === "cards") {
			return current.ids
				.map((id) => currentLayouts.find((layout) => layout.id === id))
				.filter(Boolean)
				.map((layout) => ({ cardId: layout.cardId }));
		}
		if (current.level === "modules") {
			const layout = currentLayouts.find((each) => each.id === current.layoutId);
			const card = layout && currentSheet.cards[layout.cardId];
			return card ? current.ids.filter((id) => card.modules[id]).map((moduleId) => ({ cardId: card.id, moduleId, part })) : [];
		}
		return [];
	};

	const colorSelection = useCallback(
		(color, part = "all") => {
			const items = selectionItems(part);
			if (items.length) {
				dispatch({ type: "setItemsColor", items, color });
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[dispatch]
	);

	const duplicateSelection = useCallback(() => {
		const { sheet: currentSheet, page: currentPage, layouts: currentLayouts, selection: current } = live.current;
		if (current.level === "cards") {
			const entries = current.ids
				.map((id) => currentLayouts.find((layout) => layout.id === id))
				.filter(Boolean)
				.map((layout) => ({ sourceLayoutId: layout.id, card: cloneCard(currentSheet.cards[layout.cardId]) }));
			if (entries.length) {
				dispatch({ type: "duplicateCards", pageId: currentPage.id, entries, maxCols: maxCols() });
				setPendingFocus(entries.map((entry) => entry.card.id));
			}
		} else if (current.level === "modules") {
			const layout = currentLayouts.find((each) => each.id === current.layoutId);
			const card = layout && currentSheet.cards[layout.cardId];
			if (!card) {
				return;
			}
			const entries = current.ids
				.filter((id) => card.modules[id])
				.map((id) => ({ sourceModuleId: id, module: cloneModule(card.modules[id]) }));
			if (entries.length) {
				dispatch({ type: "duplicateModules", cardId: card.id, entries });
				setSelection({ level: "modules", layoutId: layout.id, ids: entries.map((entry) => entry.module.id) });
			}
		}
	}, [dispatch, maxCols]);

	// Fit to Contents: shrinks each selected card to exactly its modules plus
	// header — how a player reclaims space they made bigger than needed.
	const fitSelection = () => {
		const { sheet: currentSheet, page: currentPage, layouts: currentLayouts, selection: current } = live.current;
		const cardRects = {};
		for (const id of current.ids) {
			const layout = currentLayouts.find((each) => each.id === id);
			if (layout) {
				const min = getCardMinSize(currentSheet.cards[layout.cardId], layout);
				cardRects[id] = { ...rectOf(layout), w: min.w, h: min.h };
			}
		}
		dispatch({ type: "applyPageLayout", pageId: currentPage.id, cardRects });
	};

	// Align / distribute: `compute(rects, ids)` returns the rects that change;
	// anything they'd now overlap is pushed clear (the first selected item
	// holds its place if the aligned items collide with each other).
	const arrangeSelection = (compute) => {
		const { sheet: currentSheet, page: currentPage, layouts: currentLayouts, selection: current } = live.current;
		if (current.level === "cards") {
			const rects = Object.fromEntries(currentLayouts.map((layout) => [layout.id, rectOf(layout)]));
			const changed = compute(rects, current.ids);
			if (Object.keys(changed).length) {
				const cardRects = planCardChange(currentLayouts, changed, { maxCols: maxCols(), anchorId: current.ids[0] });
				dispatch({ type: "applyPageLayout", pageId: currentPage.id, cardRects });
			}
		} else if (current.level === "modules") {
			const layout = currentLayouts.find((each) => each.id === current.layoutId);
			if (!layout) {
				return;
			}
			const changed = compute(layout.moduleRects, current.ids);
			if (Object.keys(changed).length) {
				const plan = planModuleChange(currentSheet.cards[layout.cardId], layout, changed, currentLayouts, {
					maxCols: maxCols(),
					anchorId: current.ids[0],
				});
				dispatch({
					type: "applyPageLayout",
					pageId: currentPage.id,
					cardRects: plan.pageRects,
					moduleLayoutId: layout.id,
					moduleRects: plan.moduleRects,
				});
			}
		}
	};

	// The single selected item's rect, in units (for Position & Size).
	const selectedRect = () => {
		if (selection.ids.length !== 1) {
			return null;
		}
		if (selection.level === "cards") {
			const layout = layoutById[selection.ids[0]];
			return layout ? rectOf(layout) : null;
		}
		return layoutById[selection.layoutId]?.moduleRects[selection.ids[0]] || null;
	};

	// Position & Size: applies an exact rect, clamped to what's allowed
	// (minimum sizes, a module inside its card's width), pushing neighbours.
	const applyPositionSize = (next) => {
		const { sheet: currentSheet, page: currentPage, layouts: currentLayouts, selection: current } = live.current;
		if (current.ids.length !== 1) {
			return;
		}
		if (current.level === "cards") {
			const layout = currentLayouts.find((each) => each.id === current.ids[0]);
			const min = getCardMinSize(currentSheet.cards[layout.cardId], layout);
			const rect = {
				x: Math.max(0, next.x),
				y: Math.max(0, next.y),
				w: Math.max(min.w, next.w),
				h: Math.max(min.h, next.h),
			};
			const cardRects = planCardChange(currentLayouts, { [layout.id]: rect }, { maxCols: maxCols() });
			dispatch({ type: "applyPageLayout", pageId: currentPage.id, cardRects });
			return;
		}
		const layout = currentLayouts.find((each) => each.id === current.layoutId);
		const card = currentSheet.cards[layout.cardId];
		const module = card.modules[current.ids[0]];
		const { cols } = moduleGridSize(layout.w, layout.h);
		const sizing = getModuleSizing(module);
		const w = Math.min(cols, Math.max(Math.min(sizing.minW, cols), next.w));
		const rect = {
			x: Math.min(Math.max(0, next.x), cols - w),
			y: Math.max(0, next.y),
			w,
			h: Math.max(getModuleSizing(module, w).minH, next.h),
		};
		const plan = planModuleChange(card, layout, { [module.id]: rect }, currentLayouts, { maxCols: maxCols() });
		dispatch({
			type: "applyPageLayout",
			pageId: currentPage.id,
			cardRects: plan.pageRects,
			moduleLayoutId: layout.id,
			moduleRects: plan.moduleRects,
		});
	};

	const ALIGN_ITEMS = [
		["left", "Align Left"],
		["hcenter", "Align Centers"],
		["right", "Align Right"],
		["top", "Align Tops"],
		["vmiddle", "Align Middles"],
		["bottom", "Align Bottoms"],
	];

	// The selection's menu (right-click, or a card's ⋮).
	const openMenu = (target, x, y) => {
		const single = target.ids.length === 1;
		const isCards = target.level === "cards";
		const items = [{ id: "duplicate", label: "Duplicate", hint: "Ctrl+D", onSelect: duplicateSelection }];
		if (isCards && single) {
			items.push({ id: "rename", label: "Rename…", onSelect: () => setRenamingId(target.ids[0]) });
			items.push({ id: "addModule", label: "Add Module…", onSelect: () => setAddModuleTo(target.ids[0]) });
		}
		items.push({
			id: "position",
			label: "Position & Size…",
			disabled: !single,
			onSelect: () => setPositionPopover({ x, y }),
		});
		if (isCards) {
			items.push({ id: "fit", label: "Fit to Contents", onSelect: fitSelection });
		}
		items.push({ id: "resetColor", label: "Reset Color", onSelect: () => colorSelection(null) });
		if (target.ids.length >= 2) {
			items.push({ separator: true }, { heading: "Align" });
			for (const [mode, label] of ALIGN_ITEMS) {
				items.push({ id: `align-${mode}`, label, onSelect: () => arrangeSelection((rects, ids) => alignRects(rects, ids, mode)) });
			}
		}
		if (target.ids.length >= 3) {
			items.push({
				id: "distribute-h",
				label: "Distribute Horizontally",
				onSelect: () => arrangeSelection((rects, ids) => distributeRects(rects, ids, "horizontal")),
			});
			items.push({
				id: "distribute-v",
				label: "Distribute Vertically",
				onSelect: () => arrangeSelection((rects, ids) => distributeRects(rects, ids, "vertical")),
			});
		}
		items.push({ separator: true }, { id: "delete", label: "Delete", hint: "Del", danger: true, onSelect: deleteSelection });
		const what = isCards ? (single ? "Card" : `${target.ids.length} cards`) : single ? "Module" : `${target.ids.length} modules`;
		setMenu({ x, y, items, label: `${what} options` });
	};

	// A card's ⋮: selects the card and opens its menu just under the button.
	const openCardMenu = (layoutId, event) => {
		const target = { level: "cards", layoutId: null, ids: [layoutId] };
		setSelection(target);
		const box = event.currentTarget.getBoundingClientRect();
		openMenu(target, box.left, box.bottom + 4);
	};

	const commitRename = (layoutId, title) => {
		setRenamingId(null);
		const layout = layoutById[layoutId];
		const trimmed = title.trim();
		if (layout && trimmed && trimmed !== sheet.cards[layout.cardId].title) {
			dispatch({ type: "setCardTitle", cardId: layout.cardId, title: trimmed });
		}
	};

	useEffect(() => {
		const handleKey = (event) => {
			const gesture = gestureRef.current;
			if (gesture?.phase === "active") {
				if (event.key === "Escape") {
					event.preventDefault();
					endGesture(false);
				} else if (event.key === "Shift" || event.key === "Alt") {
					gesture.shiftKey = event.shiftKey;
					gesture.altKey = event.altKey;
					scheduleFrame();
				}
				return;
			}
			// Typing is never hijacked: inside a field, every key (Ctrl+Z
			// included) does what the field does.
			const { blocked: blockedNow, paintMode: painting, menu: menuOpen, positionPopover: popoverOpen } = live.current;
			if (event.type !== "keydown" || isFieldFocused() || blockedNow || menuOpen || popoverOpen) {
				return;
			}
			const mod = event.ctrlKey || event.metaKey;
			const key = event.key.toLowerCase();
			if (event.key === "Escape" && painting) {
				setPaintMode(false);
			} else if (mod && key === "z") {
				event.preventDefault();
				dispatch({ type: event.shiftKey ? "redo" : "undo" });
			} else if (mod && key === "y") {
				event.preventDefault();
				dispatch({ type: "redo" });
			} else if (event.key === "Escape") {
				setSelection(NO_SELECTION);
			} else if (!live.current.selection.level) {
				return;
			} else if (mod && key === "d") {
				event.preventDefault();
				duplicateSelection();
			} else if (mod) {
				return;
			} else if (event.key === "Delete" || event.key === "Backspace") {
				event.preventDefault();
				deleteSelection();
			} else if (event.key.startsWith("Arrow")) {
				event.preventDefault();
				const step = event.shiftKey ? 5 : 1;
				const dx = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
				const dy = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;
				nudge(dx, dy);
			}
		};
		window.addEventListener("keydown", handleKey);
		window.addEventListener("keyup", handleKey);
		return () => {
			window.removeEventListener("keydown", handleKey);
			window.removeEventListener("keyup", handleKey);
		};
	}, [dispatch, deleteSelection, duplicateSelection, endGesture, nudge, scheduleFrame]);

	useEffect(() => () => frameRef.current !== null && cancelAnimationFrame(frameRef.current), []);

	// Jumps to a card (from the "referenced by" dialog): its page, selected,
	// scrolled into view.
	const navigateToCard = (cardId) => {
		const targetPage = layouts.some((layout) => layout.cardId === cardId)
			? page
			: sheet.pages.find((each) => each.cardLayouts.some((layout) => layout.cardId === cardId));
		if (!targetPage) {
			return;
		}
		if (targetPage.id !== page.id) {
			dispatch({ type: "setActivePage", pageId: targetPage.id });
		}
		setPendingFocus([cardId]);
	};

	// ---------- Rendering ----------

	const displayRect = (layout) => preview?.cardRects?.[layout.id] || rectOf(layout);
	const displayModules = (layout) => (preview?.moduleLayoutId === layout.id ? preview.moduleRects : layout.moduleRects);
	const extent = boundingSize(layouts.map(displayRect));

	const overlay = [];
	const selectedBoxes = [];
	if (selection.level === "cards") {
		for (const id of selection.ids) {
			const layout = layoutById[id];
			if (!layout) {
				continue;
			}
			const box = rectToPx(displayRect(layout));
			selectedBoxes.push(box);
			overlay.push(<div key={`outline-${id}`} className="cs-selection-outline" style={box} />);
			// No handles while painting: they'd sit on top of what's being painted.
			if (selection.ids.length === 1 && !paintMode) {
				overlay.push(<Handles key={`handles-${id}`} box={box} level="cards" id={id} />);
			}
		}
	} else if (selection.level === "modules" && layoutById[selection.layoutId]) {
		const layout = layoutById[selection.layoutId];
		const cardRect = displayRect(layout);
		const moduleRects = displayModules(layout);
		for (const id of selection.ids) {
			if (!moduleRects[id]) {
				continue;
			}
			const box = moduleBox(cardRect, moduleRects[id]);
			selectedBoxes.push(box);
			overlay.push(<div key={`outline-${id}`} className="cs-selection-outline cs-selection-outline--module" style={box} />);
			if (selection.ids.length === 1 && !paintMode) {
				overlay.push(<Handles key={`handles-${id}`} box={box} level="modules" id={id} layoutId={layout.id} />);
			}
		}
	}
	if (preview?.guides) {
		const { level, layoutId, lines } = preview.guides;
		const origin =
			level === "modules" && layoutById[layoutId]
				? {
						left: displayRect(layoutById[layoutId]).x * GRID_UNIT + MODULE_GRID_OFFSET_X,
						top: displayRect(layoutById[layoutId]).y * GRID_UNIT + MODULE_GRID_OFFSET_Y,
				  }
				: { left: 0, top: 0 };
		lines.forEach((line, index) => {
			const style =
				line.orientation === "vertical"
					? { left: origin.left + line.position * GRID_UNIT, top: origin.top + line.start * GRID_UNIT, height: (line.end - line.start) * GRID_UNIT }
					: { top: origin.top + line.position * GRID_UNIT, left: origin.left + line.start * GRID_UNIT, width: (line.end - line.start) * GRID_UNIT };
			overlay.push(<div key={`guide-${index}`} className={`cs-guide cs-guide--${line.orientation}`} style={style} />);
		});
	}
	if (preview?.marquee) {
		overlay.push(<div key="marquee" className="cs-marquee" style={preview.marquee.box} />);
	}

	// The floating toolbar sits centred above the selection — or below it when
	// the top of the selection is scrolled up against the visible area.
	const gestureInFlight = Boolean(preview);
	if (selectedBoxes.length && !gestureInFlight && renamingId === null) {
		// What the colour wheels show: the selected item's own colour for that
		// part if it has one, otherwise the bucket's current colour.
		const firstModule =
			selection.level === "modules" ? sheet.cards[layoutById[selection.layoutId]?.cardId]?.modules[selection.ids[0]] : null;
		const firstCard = selection.level === "cards" ? sheet.cards[layoutById[selection.ids[0]]?.cardId] : null;
		const colors =
			selection.level === "modules"
				? [
						{ part: "label", label: "Label color", value: firstModule?.labelColor || paintColor },
						{ part: "body", label: "Module color", value: firstModule?.bodyColor || paintColor },
				  ]
				: [{ part: "paint", label: "Paint color", value: paintColor }];
		const left = Math.min(...selectedBoxes.map((box) => box.left));
		const right = Math.max(...selectedBoxes.map((box) => box.left + box.width));
		const top = Math.min(...selectedBoxes.map((box) => box.top));
		const bottom = Math.max(...selectedBoxes.map((box) => box.top + box.height));
		const canvas = canvasRef.current;
		const scroller = canvas?.parentElement;
		const visibleTop = canvas && scroller ? scroller.getBoundingClientRect().top - canvas.getBoundingClientRect().top : 0;
		const placement = top - TOOLBAR_HEIGHT - TOOLBAR_GAP < visibleTop ? "below" : "above";
		const style = {
			left: Math.max(TOOLBAR_HALF_WIDTH, (left + right) / 2),
			top: placement === "above" ? top - TOOLBAR_HEIGHT - TOOLBAR_GAP : bottom + TOOLBAR_GAP,
		};
		overlay.push(
			<SelectionToolbar
				key="toolbar"
				style={style}
				placement={placement}
				colors={colors}
				onColorInput={setPaintColor}
				onColorCommit={colorSelection}
				paintMode={paintMode}
				onTogglePaint={() => setPaintMode((on) => !on)}
				canPositionSize={selection.ids.length === 1}
				onPositionSize={(event) => {
					const box = event.currentTarget.getBoundingClientRect();
					setPositionPopover({ x: box.left, y: box.bottom + 6 });
				}}
				onDelete={deleteSelection}
				count={selection.ids.length}
			/>
		);
	}

	const activeIds = new Set(preview?.active || []);
	const popoverRect = positionPopover ? selectedRect() : null;
	const popoverTitle =
		selection.level === "cards"
			? sheet.cards[layoutById[selection.ids[0]]?.cardId]?.title
			: sheet.cards[layoutById[selection.layoutId]?.cardId]?.modules[selection.ids[0]]?.label;
	const addModuleLayout = addModuleTo ? layoutById[addModuleTo] : null;

	return (
		<>
			<div
				ref={canvasRef}
				className={`cs-canvas cs-canvas--editable${showGrid ? " cs-canvas--grid" : ""}${paintMode ? " cs-canvas--paint" : ""}`}
				style={{
					minHeight: (extent.rows + 8) * GRID_UNIT,
					minWidth: extent.cols * GRID_UNIT,
					...(paintMode ? { "--cs-paint-cursor": BUCKET_CURSOR } : null),
				}}
				onPointerDownCapture={onPointerDownCapture}
				onPointerDown={onPointerDown}
				onPointerMove={onPointerMove}
				onPointerUp={onPointerUp}
				onPointerCancel={() => endGesture(false)}
				onLostPointerCapture={() => gestureRef.current && endGesture(true)}
				onContextMenu={onContextMenu}
				onDoubleClick={onDoubleClick}
			>
				{layouts.length === 0 ? (
					<p className="cs-empty">This page is empty — press N or use “New Card” to add your first card.</p>
				) : null}
				{layouts.map((layout) => (
					<CharacterSheetCard
						key={layout.id}
						layout={{ ...layout, ...displayRect(layout), moduleRects: displayModules(layout) }}
						dragging={activeIds.has(layout.id)}
						selected={isSelected("cards", layout.id)}
						onMenu={(event) => openCardMenu(layout.id, event)}
						renaming={renamingId === layout.id}
						onRenameCommit={(title) => commitRename(layout.id, title)}
						onRenameCancel={() => setRenamingId(null)}
						showGrid={showGrid}
					/>
				))}
				<div className="cs-selection-layer">{overlay}</div>
			</div>
			{paintMode ? (
				<div className="cs-paint-banner" role="status">
					<span className="cs-paint-swatch" style={{ backgroundColor: paintColor }} aria-hidden="true" />
					Painting — click a label, a module, a card’s header or a card’s background to color it.
					<button type="button" className="cs-paint-stop" onClick={() => setPaintMode(false)}>
						Done (Esc)
					</button>
				</div>
			) : null}
			{menu ? <ContextMenu x={menu.x} y={menu.y} items={menu.items} label={menu.label} onClose={() => setMenu(null)} /> : null}
			{positionPopover && popoverRect ? (
				<PositionSizePopover
					title={popoverTitle || "selection"}
					rect={popoverRect}
					anchor={positionPopover}
					onApply={applyPositionSize}
					onClose={() => setPositionPopover(null)}
				/>
			) : null}
			{addModuleLayout ? (
				<AddModuleDialog
					card={sheet.cards[addModuleLayout.cardId]}
					onAdd={(module) => {
						dispatch({ type: "addModuleToCard", cardId: addModuleLayout.cardId, module });
						setSelection({ level: "modules", layoutId: addModuleLayout.id, ids: [module.id] });
					}}
					onClose={() => setAddModuleTo(null)}
				/>
			) : null}
			<DeleteBlockedDialog blocked={blocked} onClose={() => setBlocked(null)} onNavigate={navigateToCard} />
		</>
	);
}
