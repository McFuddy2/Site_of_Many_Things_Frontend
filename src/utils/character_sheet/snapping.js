// Lucidchart-style snapping geometry for the Character Sheet's free-form
// canvases (cards on a page, modules within a card). Pure functions over rects
// ({ x, y, width, height } in px) — no React, no DOM — so the drag/resize
// controller stays a thin state machine on top of these (see useLayoutCanvas).
//
// Unlike grid.js's clampMove/clampResize, nothing here forbids overlap: rects
// may sit on top of each other freely and z-order decides what reads on top.
// Alignment guides plus snapping are what keep a layout tidy, the same way
// Lucidchart does it.

import { GRID_SIZE, snap, rectsOverlap } from "./grid.js";

// How close (px) a moving edge/center has to get before it catches. Much below
// this it feels like the guide never catches; much above it fights you when
// you're deliberately placing a rect near — but not on — an alignment.
export const SNAP_TOLERANCE = 6;

// The 8 selection handles. dirX/dirY say which edges a handle moves:
// -1 = the low edge (left/top), 1 = the high edge (right/bottom), 0 = neither,
// so corner handles (both non-zero) drive width and height together and edge
// handles drive exactly one dimension.
export const RESIZE_HANDLES = [
	{ id: "nw", dirX: -1, dirY: -1, cursor: "nwse-resize" },
	{ id: "n", dirX: 0, dirY: -1, cursor: "ns-resize" },
	{ id: "ne", dirX: 1, dirY: -1, cursor: "nesw-resize" },
	{ id: "e", dirX: 1, dirY: 0, cursor: "ew-resize" },
	{ id: "se", dirX: 1, dirY: 1, cursor: "nwse-resize" },
	{ id: "s", dirX: 0, dirY: 1, cursor: "ns-resize" },
	{ id: "sw", dirX: -1, dirY: 1, cursor: "nesw-resize" },
	{ id: "w", dirX: -1, dirY: 0, cursor: "ew-resize" },
];

export const isCornerHandle = (handle) => handle.dirX !== 0 && handle.dirY !== 0;

// The three snappable positions per axis: both edges and the center. Matching
// any moving anchor against any target anchor is what makes edge-to-edge,
// center-to-center and edge-to-center alignments all catch.
const anchorsX = (rect) => [rect.x, rect.x + rect.width / 2, rect.x + rect.width];
const anchorsY = (rect) => [rect.y, rect.y + rect.height / 2, rect.y + rect.height];

// Nearest alignment between any of `movingRect`'s anchors and any target's, on
// one axis. Returns the delta to apply, the absolute position the guide should
// be drawn at, and every target that shares that position (so one guide can
// span all of them, rather than drawing a line per target).
function findAxisSnap(movingRect, targets, anchorsOf, tolerance) {
	let best = null;
	const movingAnchors = anchorsOf(movingRect);
	for (const target of targets) {
		for (const targetAnchor of anchorsOf(target)) {
			for (const movingAnchor of movingAnchors) {
				const delta = targetAnchor - movingAnchor;
				if (Math.abs(delta) <= tolerance && (!best || Math.abs(delta) < Math.abs(best.delta))) {
					best = { delta, position: targetAnchor };
				}
			}
		}
	}
	if (!best) {
		return null;
	}
	const matched = targets.filter((target) => anchorsOf(target).some((anchor) => Math.abs(anchor - best.position) < 0.5));
	return { ...best, matched };
}

// Same as findAxisSnap but for a single moving value (one resizing edge)
// rather than a whole rect's three anchors.
function findEdgeSnap(edgeValue, targets, anchorsOf, tolerance) {
	let best = null;
	for (const target of targets) {
		for (const anchor of anchorsOf(target)) {
			const delta = anchor - edgeValue;
			if (Math.abs(delta) <= tolerance && (!best || Math.abs(delta) < Math.abs(best.delta))) {
				best = { delta, position: anchor };
			}
		}
	}
	if (!best) {
		return null;
	}
	const matched = targets.filter((target) => anchorsOf(target).some((anchor) => Math.abs(anchor - best.position) < 0.5));
	return { ...best, matched };
}

// A guide line spans the union of the moving rect and every target it aligned
// with, so it visibly connects what's actually lined up.
function buildGuide(orientation, snapResult, movingRect) {
	const rects = [movingRect, ...snapResult.matched];
	const along = orientation === "vertical" ? rects.map((r) => [r.y, r.y + r.height]) : rects.map((r) => [r.x, r.x + r.width]);
	return {
		orientation,
		position: snapResult.position,
		start: Math.min(...along.map(([lo]) => lo)),
		end: Math.max(...along.map(([, hi]) => hi)),
	};
}

function buildGuides(rect, snapX, snapY) {
	const guides = [];
	if (snapX) {
		guides.push(buildGuide("vertical", snapX, rect));
	}
	if (snapY) {
		guides.push(buildGuide("horizontal", snapY, rect));
	}
	return guides;
}

// Resolves a proposed move. Object-to-object alignment wins on an axis when
// one is in range; the optional grid only catches on axes that found no
// object alignment, so the two snapping systems stay independent (and either
// can be off) without fighting each other.
export function computeMoveSnap(rect, targets, options = {}) {
	const { tolerance = SNAP_TOLERANCE, snapToObjects = true, snapToGrid = false, gridSize = GRID_SIZE } = options;
	const snapX = snapToObjects ? findAxisSnap(rect, targets, anchorsX, tolerance) : null;
	const snapY = snapToObjects ? findAxisSnap(rect, targets, anchorsY, tolerance) : null;
	let { x, y } = rect;
	if (snapX) {
		x += snapX.delta;
	} else if (snapToGrid) {
		x = snap(x, gridSize);
	}
	if (snapY) {
		y += snapY.delta;
	} else if (snapToGrid) {
		y = snap(y, gridSize);
	}
	const snapped = { ...rect, x, y };
	return { rect: snapped, guides: buildGuides(snapped, snapX, snapY) };
}

// Clamps width/height to their minimums, re-deriving the other dimension when
// the aspect ratio is locked so a min can't quietly break the ratio.
function applyMinSize(width, height, minWidth, minHeight, ratio) {
	let nextWidth = width;
	let nextHeight = height;
	if (nextWidth < minWidth) {
		nextWidth = minWidth;
		if (ratio) {
			nextHeight = nextWidth / ratio;
		}
	}
	if (nextHeight < minHeight) {
		nextHeight = minHeight;
		if (ratio) {
			nextWidth = nextHeight * ratio;
		}
	}
	return { width: Math.max(nextWidth, minWidth), height: Math.max(nextHeight, minHeight) };
}

// Applies a raw pointer delta to a rect for one handle. Only the edges the
// handle owns move, and dragging a low edge (dirX/dirY of -1) moves the rect's
// origin as well as its size so the opposite edge stays put. With lockAspect
// (Shift on a corner) the axis the pointer moved further along proportionally
// drives the other.
export function resizeRect(startRect, handle, delta, options = {}) {
	const { minWidth = 1, minHeight = 1, lockAspect = false } = options;
	const ratioLocked = lockAspect && isCornerHandle(handle) && startRect.height !== 0;
	const ratio = ratioLocked ? startRect.width / startRect.height : null;

	let width = startRect.width + handle.dirX * delta.dx;
	let height = startRect.height + handle.dirY * delta.dy;

	if (ratio) {
		const widthChange = Math.abs(width / startRect.width - 1);
		const heightChange = Math.abs(height / startRect.height - 1);
		if (widthChange >= heightChange) {
			height = width / ratio;
		} else {
			width = height * ratio;
		}
	}

	({ width, height } = applyMinSize(width, height, minWidth, minHeight, ratio));

	return {
		x: handle.dirX === -1 ? startRect.x + startRect.width - width : startRect.x,
		y: handle.dirY === -1 ? startRect.y + startRect.height - height : startRect.y,
		width,
		height,
	};
}

// Snaps the edges a resize is actually moving (never the stationary ones) to
// nearby target anchors. Skipped entirely while the aspect ratio is locked —
// there, holding the ratio matters more than catching an alignment.
export function computeResizeSnap(rect, handle, targets, options = {}) {
	const {
		tolerance = SNAP_TOLERANCE,
		snapToObjects = true,
		snapToGrid = false,
		gridSize = GRID_SIZE,
		minWidth = 1,
		minHeight = 1,
		lockAspect = false,
	} = options;

	if (lockAspect && isCornerHandle(handle)) {
		return { rect, guides: [] };
	}

	let next = { ...rect };
	const guides = [];

	if (handle.dirX !== 0) {
		const edge = handle.dirX === 1 ? next.x + next.width : next.x;
		const found = snapToObjects ? findEdgeSnap(edge, targets, anchorsX, tolerance) : null;
		const delta = found ? found.delta : snapToGrid ? snap(edge, gridSize) - edge : 0;
		if (handle.dirX === 1) {
			next.width = Math.max(minWidth, next.width + delta);
		} else {
			const width = Math.max(minWidth, next.width - delta);
			next.x = next.x + next.width - width;
			next.width = width;
		}
		if (found) {
			guides.push(buildGuide("vertical", found, next));
		}
	}

	if (handle.dirY !== 0) {
		const edge = handle.dirY === 1 ? next.y + next.height : next.y;
		const found = snapToObjects ? findEdgeSnap(edge, targets, anchorsY, tolerance) : null;
		const delta = found ? found.delta : snapToGrid ? snap(edge, gridSize) - edge : 0;
		if (handle.dirY === 1) {
			next.height = Math.max(minHeight, next.height + delta);
		} else {
			const height = Math.max(minHeight, next.height - delta);
			next.y = next.y + next.height - height;
			next.height = height;
		}
		if (found) {
			guides.push(buildGuide("horizontal", found, next));
		}
	}

	return { rect: next, guides };
}

// ---------- Bounds ----------

// Keeps a rect inside the canvas's origin (and optional far edges). Cards and
// modules may overlap each other, but neither may sit at a negative
// coordinate — nothing there would be reachable.
export function clampRectToBounds(rect, bounds) {
	if (!bounds) {
		return rect;
	}
	const { minX = 0, minY = 0, maxX = Infinity, maxY = Infinity } = bounds;
	return {
		...rect,
		x: Math.min(Math.max(rect.x, minX), Math.max(minX, maxX - rect.width)),
		y: Math.min(Math.max(rect.y, minY), Math.max(minY, maxY - rect.height)),
	};
}

// The offset needed to pull a whole group back inside bounds — applied to
// every member equally so a group drag never distorts relative positions.
export function boundsOffsetForGroup(rects, bounds) {
	if (!bounds || rects.length === 0) {
		return { dx: 0, dy: 0 };
	}
	const { minX = 0, minY = 0 } = bounds;
	const groupMinX = Math.min(...rects.map((rect) => rect.x));
	const groupMinY = Math.min(...rects.map((rect) => rect.y));
	return {
		dx: groupMinX < minX ? minX - groupMinX : 0,
		dy: groupMinY < minY ? minY - groupMinY : 0,
	};
}

// ---------- Bounding box ----------

export function unionRect(rects) {
	if (!rects.length) {
		return null;
	}
	const minX = Math.min(...rects.map((rect) => rect.x));
	const minY = Math.min(...rects.map((rect) => rect.y));
	const maxX = Math.max(...rects.map((rect) => rect.x + rect.width));
	const maxY = Math.max(...rects.map((rect) => rect.y + rect.height));
	return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

// ---------- Align / Distribute ----------

export const ALIGN_MODES = ["left", "hcenter", "right", "top", "vmiddle", "bottom"];

// Aligns every entry against the selection's own bounding box, so the outermost
// members stay put and the rest come to them. entries: [{ id, rect }].
// Returns { id: rect } for the entries that actually moved.
export function alignRects(entries, mode) {
	const bounds = unionRect(entries.map((entry) => entry.rect));
	if (!bounds || entries.length < 2) {
		return {};
	}
	const next = {};
	for (const { id, rect } of entries) {
		let moved = rect;
		switch (mode) {
			case "left":
				moved = { ...rect, x: bounds.x };
				break;
			case "hcenter":
				moved = { ...rect, x: bounds.x + (bounds.width - rect.width) / 2 };
				break;
			case "right":
				moved = { ...rect, x: bounds.x + bounds.width - rect.width };
				break;
			case "top":
				moved = { ...rect, y: bounds.y };
				break;
			case "vmiddle":
				moved = { ...rect, y: bounds.y + (bounds.height - rect.height) / 2 };
				break;
			case "bottom":
				moved = { ...rect, y: bounds.y + bounds.height - rect.height };
				break;
			default:
				break;
		}
		next[id] = moved;
	}
	return next;
}

// Evens out the gaps between entries along one axis, holding the two outermost
// in place. Needs at least 3 entries for there to be anything to distribute.
export function distributeRects(entries, axis) {
	if (entries.length < 3) {
		return {};
	}
	const isHorizontal = axis === "horizontal";
	const sizeOf = (rect) => (isHorizontal ? rect.width : rect.height);
	const posOf = (rect) => (isHorizontal ? rect.x : rect.y);

	const sorted = [...entries].sort((a, b) => posOf(a.rect) - posOf(b.rect));
	const first = sorted[0].rect;
	const last = sorted[sorted.length - 1].rect;
	const span = posOf(last) + sizeOf(last) - posOf(first);
	const totalSize = sorted.reduce((sum, entry) => sum + sizeOf(entry.rect), 0);
	const gap = (span - totalSize) / (sorted.length - 1);

	const next = {};
	let cursor = posOf(first);
	for (const { id, rect } of sorted) {
		next[id] = isHorizontal ? { ...rect, x: cursor } : { ...rect, y: cursor };
		cursor += sizeOf(rect) + gap;
	}
	return next;
}

// ---------- Marquee ----------

// Builds a positive-width/height rect from the two corners of a drag, so a
// marquee dragged up/left works the same as one dragged down/right.
export function rectFromPoints(start, end) {
	return {
		x: Math.min(start.x, end.x),
		y: Math.min(start.y, end.y),
		width: Math.abs(end.x - start.x),
		height: Math.abs(end.y - start.y),
	};
}

// Touch-select (any intersection), matching Lucidchart — not the
// fully-enclosed rule some editors use.
export function marqueeHits(marquee, entries) {
	return entries.filter(({ rect }) => rectsOverlap(marquee, rect)).map(({ id }) => id);
}
