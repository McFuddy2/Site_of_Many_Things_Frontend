// Free-form grid geometry for the Character Sheet canvas (cards on a page)
// and a card's body (modules within a card). Every rect is in px.
//
// The overlap helpers below are only used to pick a free spot for a
// brand-new card/module (see findInitialRect). Once something exists, the
// user may drag it wherever they like, including on top of a sibling —
// alignment guides and snapping are what keep layouts tidy (see snapping.js),
// and grid snapping itself is a toggle rather than a rule.

export const GRID_SIZE = 5;

// `size` lets callers snap to a coarser step than the base grid (or, with
// snap-to-grid switched off, be bypassed entirely — see snapping.js).
export function snap(value, size = GRID_SIZE) {
	return Math.round(value / size) * size;
}

// Strict intersection: touching edges (equal x2/x1 or y2/y1) do not count as
// overlap.
export function rectsOverlap(a, b) {
	return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

// Inflates `a` by `gap` on every side before testing against `b` — used to
// enforce a minimum-clearance rule (e.g. the default 1-grid-cell move gap)
// rather than a strict no-overlap rule.
export function rectsOverlapWithGap(a, b, gap) {
	const inflated = { x: a.x - gap, y: a.y - gap, width: a.width + gap * 2, height: a.height + gap * 2 };
	return rectsOverlap(inflated, b);
}

export function isValidPlacement(rect, others, gap = 0) {
	if (rect.x < 0 || rect.y < 0) {
		return false;
	}
	return others.every((other) => !rectsOverlapWithGap(rect, other, gap));
}

// A canvas whose children are all absolutely positioned contributes no
// intrinsic height of its own — this gives it one that fits its content.
export function boundingHeight(rects, padding = 0) {
	return rects.reduce((max, rect) => Math.max(max, rect.y + rect.height), 0) + padding;
}

// The width counterpart to boundingHeight — used to size a container (e.g. a
// brand-new card) to fit the rects just packed into it.
export function boundingWidth(rects, padding = 0) {
	return rects.reduce((max, rect) => Math.max(max, rect.x + rect.width), 0) + padding;
}

// Row-major scan from (0,0) in GRID_SIZE steps for the first placement of a
// default-sized rect that satisfies isValidPlacement — used once, when a
// card/module is first created, to pick an initial spot with the default
// move gap already respected. maxWidth (e.g. a card body's usable width)
// caps how far a row extends before wrapping to the next one, so a card's
// modules stack into rows instead of spilling off its right edge; omit it
// (page-level card placement, which can grow/scroll sideways) to place
// everything in a single row.
export function findInitialRect(defaultWidth, defaultHeight, others, gap, maxWidth = Infinity) {
	const width = snap(defaultWidth);
	const height = snap(defaultHeight);
	const unboundedRowWidth = others.reduce((max, rect) => Math.max(max, rect.x + rect.width), 0) + width + gap * 2;
	const rowWidth = Math.max(Number.isFinite(maxWidth) ? snap(maxWidth) : unboundedRowWidth, width);
	const maxY = others.reduce((max, rect) => Math.max(max, rect.y + rect.height), 0) + height + gap * 2;
	for (let y = 0; y <= maxY; y += GRID_SIZE) {
		for (let x = 0; x + width <= rowWidth; x += GRID_SIZE) {
			const candidate = { x, y, width, height };
			if (isValidPlacement(candidate, others, gap)) {
				return candidate;
			}
		}
	}
	return { x: 0, y: maxY, width, height };
}
