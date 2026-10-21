// Whole-unit grid geometry for the Character Sheet. Every stored rect is
// { x, y, w, h } in grid units (see GRID_UNIT): cards on a page's grid, and
// modules on their card's module grid. Pure functions only — no React, no DOM.

import {
	GRID_UNIT,
	INSET,
	CARD_CHROME_W,
	CARD_CHROME_H,
	getTitleMinUnits,
} from "./layoutConstants.js";

// Strict intersection: rects that only share an edge don't overlap.
export function rectsOverlap(a, b) {
	return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// The columns/rows a set of rects reaches from the origin (0 for none).
export function boundingSize(rects) {
	let cols = 0;
	let rows = 0;
	for (const rect of rects) {
		cols = Math.max(cols, rect.x + rect.w);
		rows = Math.max(rows, rect.y + rect.h);
	}
	return { cols, rows };
}

// First free w x h spot in reading order (top-to-bottom, then
// left-to-right) within `maxCols` columns, starting from row `fromY`; if
// nothing fits, the spot just below the lowest rect.
export function findFreeSpot(rects, w, h, maxCols, fromY = 0) {
	const { rows } = boundingSize(rects);
	const lastX = Math.max(0, maxCols - w);
	for (let y = fromY; y <= rows; y += 1) {
		for (let x = 0; x <= lastX; x += 1) {
			const candidate = { x, y, w, h };
			if (!rects.some((rect) => rectsOverlap(candidate, rect))) {
				return candidate;
			}
		}
	}
	return { x: 0, y: rows, w, h };
}

// Rendered px box for a rect: its cells, inset by INSET on every side.
// Module rects are relative to their card's module grid, card rects to the
// page — the same formula serves both.
export function rectToPx(rect) {
	return {
		left: rect.x * GRID_UNIT + INSET,
		top: rect.y * GRID_UNIT + INSET,
		width: rect.w * GRID_UNIT - 2 * INSET,
		height: rect.h * GRID_UNIT - 2 * INSET,
	};
}

// A card's module grid size for a card of w x h units.
export function moduleGridSize(cardW, cardH) {
	return { cols: cardW - CARD_CHROME_W, rows: cardH - CARD_CHROME_H };
}

// Card size that exactly wraps a module arrangement (plus the header), floored
// at what the title needs.
export function fitCardSize(title, moduleRects) {
	const { cols, rows } = boundingSize(Object.values(moduleRects));
	return {
		w: Math.max(getTitleMinUnits(title), cols + CARD_CHROME_W),
		h: Math.max(CARD_CHROME_H + 1, rows + CARD_CHROME_H),
	};
}

// The smallest a placed card can be: its modules' bounding box plus header,
// and wide enough for its title.
export function getCardMinSize(card, layout) {
	const rects = layout.moduleOrder.map((id) => layout.moduleRects[id]).filter(Boolean);
	return fitCardSize(card?.title || "", Object.fromEntries(rects.map((rect, i) => [i, rect])));
}

// Cells covered by at least one rect / cells in the grid they span — 1 means
// no dead space. Used by the layout tests and the dev gallery.
export function coverage(rects, cols, rows) {
	if (!cols || !rows) {
		return 1;
	}
	let covered = 0;
	for (let y = 0; y < rows; y += 1) {
		for (let x = 0; x < cols; x += 1) {
			if (rects.some((rect) => x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h)) {
				covered += 1;
			}
		}
	}
	return covered / (cols * rows);
}
