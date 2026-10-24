// Default module arrangements, authored on the grid as each card type's
// `rows` (see cardDefinitions.js). Each row lists its modules' widths in
// units, in module order; a row's height is the tallest default height among
// its modules (or `h` when given). Every module in a row is stretched to the
// row's height and every row spans the same width, so a fresh card has no
// dead space — and the card itself is sized to exactly that bounding box
// plus its header (see fitCardSize in grid.js).
//
// Card types without rows (custom cards, an unknown type from an older save,
// or a standard card whose modules no longer match its recipe) fall back to
// autoPackRows below.

import { getModuleSizing } from "./moduleTypes.js";
import { getTitleMinUnits, CARD_CHROME_W } from "./layoutConstants.js";
import { fitCardSize } from "./grid.js";
import { CARD_DEFINITIONS } from "./cardDefinitions.js";

// Widest a custom card's rows run before wrapping.
const AUTO_PACK_COLUMNS = 24;

// Greedy rows for cards without an authored recipe: modules in order at their
// default widths, wrapping before AUTO_PACK_COLUMNS.
function autoPackRows(card) {
	const rows = [];
	let current = { w: [] };
	let used = 0;
	for (const moduleId of card.moduleOrder) {
		const { defaultW } = getModuleSizing(card.modules[moduleId]);
		if (current.w.length && used + defaultW > AUTO_PACK_COLUMNS) {
			rows.push(current);
			current = { w: [] };
			used = 0;
		}
		current.w.push(defaultW);
		used += defaultW;
	}
	if (current.w.length) {
		rows.push(current);
	}
	return rows;
}

function recipeFor(card) {
	const recipe = CARD_DEFINITIONS[card.type]?.rows;
	const count = recipe ? recipe.reduce((total, row) => total + row.w.length, 0) : -1;
	return count === card.moduleOrder.length ? recipe : autoPackRows(card);
}

// Lays a card's modules out from its recipe. Rows are widened to the widest
// row (and to whatever the card's title needs) by stretching each row's last
// module, so the result is always a gap-free rectangle.
export function buildDefaultModuleRects(card) {
	const rows = recipeFor(card);
	const ids = card.moduleOrder;
	const titleCols = getTitleMinUnits(card.title) - CARD_CHROME_W;
	const cols = Math.max(titleCols, ...rows.map((row) => row.w.reduce((sum, w) => sum + w, 0)));

	const rects = {};
	let index = 0;
	let y = 0;
	for (const row of rows) {
		const rowIds = ids.slice(index, index + row.w.length);
		index += row.w.length;
		const widths = [...row.w];
		widths[widths.length - 1] += cols - widths.reduce((sum, w) => sum + w, 0);

		let h = row.h ?? 0;
		rowIds.forEach((moduleId, i) => {
			const sizing = getModuleSizing(card.modules[moduleId], widths[i]);
			h = Math.max(h, row.h ? sizing.minH : sizing.defaultH, sizing.minH);
		});

		let x = 0;
		rowIds.forEach((moduleId, i) => {
			rects[moduleId] = { x, y, w: widths[i], h };
			x += widths[i];
		});
		y += h;
	}
	return rects;
}

// A card's default placement minus the position: its module rects and the
// card size that exactly fits them. What previews draw before a card exists.
export function buildDefaultLayout(card) {
	const moduleRects = buildDefaultModuleRects(card);
	return { moduleOrder: [...card.moduleOrder], moduleRects, ...fitCardSize(card.title, moduleRects) };
}
