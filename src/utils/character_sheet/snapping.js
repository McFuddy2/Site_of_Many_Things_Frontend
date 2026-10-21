// Snapping and smart guides for moving/resizing on the unit grid. Pure
// functions over { x, y, w, h } rects in grid units — no React, no DOM.
//
// Everything always lands on whole grid cells. On top of that, smart guides
// add magnetism: a moving edge or centre that comes within SNAP_TOLERANCE of
// lining up with another item's edge or centre catches there (even if plain
// rounding would have picked the neighbouring cell), and a guide line shows
// what it lined up with. Holding Alt passes `guides: false`, which turns the
// magnetism and the lines off — rounding to the grid still applies, so Alt
// can never produce an off-grid position.

// How close (in units) an alignment has to be before it catches.
export const SNAP_TOLERANCE = 0.6;

// The 8 resize handles. dirX/dirY say which edges a handle moves: -1 = the
// low edge (left/top), 1 = the high edge (right/bottom), 0 = neither.
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

const AXES = {
	x: { start: "x", size: "w", crossStart: "y", crossSize: "h", orientation: "vertical" },
	y: { start: "y", size: "h", crossStart: "x", crossSize: "w", orientation: "horizontal" },
};

const anchorsOf = (rect, axis) => {
	const start = rect[AXES[axis].start];
	const size = rect[AXES[axis].size];
	return [start, start + size / 2, start + size];
};

// Best whole-unit position for a moving span on one axis. `offsets` are the
// anchor offsets from the span's start that may align (edges and centre for
// a move; just the moving edge for a resize). Returns { value, position }
// where position is the aligned guide line, or null if it just rounded.
function snapAxis(rawStart, offsets, targets, axis, tolerance) {
	let best = null;
	for (const target of targets) {
		for (const anchor of anchorsOf(target, axis)) {
			for (const offset of offsets) {
				const candidate = anchor - offset;
				if (!Number.isInteger(candidate)) {
					continue;
				}
				const distance = Math.abs(candidate - rawStart);
				if (distance <= tolerance && (!best || distance < best.distance)) {
					best = { value: candidate, position: anchor, distance };
				}
			}
		}
	}
	return best ? { value: best.value, position: best.position } : { value: Math.round(rawStart), position: null };
}

// One guide line per aligned axis, spanning the moving rect and every target
// that shares that line.
function guideFor(rect, targets, axis, position) {
	if (position === null) {
		return null;
	}
	const { crossStart, crossSize, orientation } = AXES[axis];
	const aligned = targets.filter((target) => anchorsOf(target, axis).includes(position));
	if (!aligned.length) {
		return null;
	}
	const spans = [rect, ...aligned];
	return {
		orientation,
		position,
		start: Math.min(...spans.map((span) => span[crossStart])),
		end: Math.max(...spans.map((span) => span[crossStart] + span[crossSize])),
	};
}

// A move: `raw` is the rect at its unrounded position. Returns the whole-unit
// rect plus any guides it lined up with.
export function snapMove(raw, targets, { guides = true, tolerance = SNAP_TOLERANCE } = {}) {
	const pool = guides ? targets : [];
	const x = snapAxis(raw.x, [0, raw.w / 2, raw.w], pool, "x", tolerance);
	const y = snapAxis(raw.y, [0, raw.h / 2, raw.h], pool, "y", tolerance);
	const rect = { x: x.value, y: y.value, w: raw.w, h: raw.h };
	return { rect, guides: [guideFor(rect, pool, "x", x.position), guideFor(rect, pool, "y", y.position)].filter(Boolean) };
}

// A resize from `handle`, by `delta` units (unrounded). minW is a number;
// minHFor(w) gives the minimum height at a width (some modules get taller as
// they get narrower). maxRight caps the right edge (a module can't grow past
// its card's width). Shift-drag (lockAspect) keeps the starting proportions
// on corner handles.
export function resizeSnap(start, handle, delta, options = {}) {
	const {
		minW = 1,
		minHFor = () => 1,
		maxRight = Infinity,
		lockAspect = false,
		targets = [],
		guides = true,
		tolerance = SNAP_TOLERANCE,
	} = options;
	const pool = guides ? targets : [];
	let left = start.x;
	let right = start.x + start.w;
	let top = start.y;
	let bottom = start.y + start.h;
	if (handle.dirX === 1) right += delta.dx;
	if (handle.dirX === -1) left += delta.dx;
	if (handle.dirY === 1) bottom += delta.dy;
	if (handle.dirY === -1) top += delta.dy;

	if (lockAspect && isCornerHandle(handle) && start.h > 0) {
		const ratio = start.w / start.h;
		const w = right - left;
		const h = bottom - top;
		if (Math.abs(w / start.w) >= Math.abs(h / start.h)) {
			const nextH = w / ratio;
			if (handle.dirY === 1) bottom = top + nextH;
			else top = bottom - nextH;
		} else {
			const nextW = h * ratio;
			if (handle.dirX === 1) right = left + nextW;
			else left = right - nextW;
		}
	}

	let xGuide = null;
	let yGuide = null;
	if (handle.dirX === 1) {
		const snapped = snapAxis(right, [0], pool, "x", tolerance);
		right = snapped.value;
		xGuide = snapped.position;
	} else if (handle.dirX === -1) {
		const snapped = snapAxis(left, [0], pool, "x", tolerance);
		left = snapped.value;
		xGuide = snapped.position;
	}
	if (handle.dirY === 1) {
		const snapped = snapAxis(bottom, [0], pool, "y", tolerance);
		bottom = snapped.value;
		yGuide = snapped.position;
	} else if (handle.dirY === -1) {
		const snapped = snapAxis(top, [0], pool, "y", tolerance);
		top = snapped.value;
		yGuide = snapped.position;
	}

	// Limits: the moving edge stops instead of the opposite edge drifting.
	if (handle.dirX === -1) left = Math.max(0, Math.min(left, right - minW));
	if (handle.dirX === 1) right = Math.min(Math.max(right, left + minW), Math.max(maxRight, left + minW));
	const minH = minHFor(right - left);
	if (handle.dirY === -1) top = Math.max(0, Math.min(top, bottom - minH));
	if (handle.dirY === 1) bottom = Math.max(bottom, top + minH);
	if (handle.dirY === 0 && bottom - top < minH) bottom = top + minH;

	const rect = { x: left, y: top, w: right - left, h: bottom - top };
	const lines = [];
	if (xGuide !== null && anchorsOf(rect, "x").includes(xGuide)) lines.push(guideFor(rect, pool, "x", xGuide));
	if (yGuide !== null && anchorsOf(rect, "y").includes(yGuide)) lines.push(guideFor(rect, pool, "y", yGuide));
	return { rect, guides: lines.filter(Boolean) };
}

// Marquee hit test against an item (both px boxes { left, top, width,
// height }): anything the marquee touches counts.
export function boxesTouch(a, b) {
	return a.left <= b.left + b.width && a.left + a.width >= b.left && a.top <= b.top + b.height && a.top + a.height >= b.top;
}

export function boxFromPoints(start, end) {
	return {
		left: Math.min(start.x, end.x),
		top: Math.min(start.y, end.y),
		width: Math.abs(end.x - start.x),
		height: Math.abs(end.y - start.y),
	};
}
