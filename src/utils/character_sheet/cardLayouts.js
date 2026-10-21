// Default module arrangements, authored on the grid. Each standard card type
// lists its rows in module order: `w` is each module's width in units, and a
// row's height is the tallest default height among its modules (or `h` when
// given). Every module in a row is stretched to the row's height and every
// row spans the same width, so a fresh card has no dead space — and the card
// itself is sized to exactly that bounding box plus its header (see
// fitCardSize in grid.js).
//
// Card types without an entry here (custom cards, or a standard card whose
// modules no longer match its recipe) fall back to autoPackRows below.

import { getModuleSizing } from "./moduleTypes.js";
import { getTitleMinUnits, CARD_CHROME_W } from "./layoutConstants.js";
import { fitCardSize } from "./grid.js";

const column = (count, width, h) => Array.from({ length: count }, () => ({ w: [width], ...(h ? { h } : {}) }));

export const CARD_DEFAULT_ROWS = {
	abilityScores: [{ w: [5, 5, 5, 5, 5, 5] }],
	allies: column(2, 14),
	appearance: [{ w: [12] }, { w: [12] }],
	armorClass: [{ w: [7] }],
	attack: [{ w: [8, 5, 6, 5] }, { w: [8, 8, 8] }, { w: [24], h: 4 }],
	backstory: [{ w: [14], h: 8 }],
	basicDescriptions: [{ w: [6, 6, 6] }, { w: [6, 6, 6] }],
	basicInfo: [{ w: [6, 3, 6, 6] }, { w: [6, 7, 8] }],
	characterName: [{ w: [12] }],
	deathSaves: column(2, 9),
	equipment: [{ w: [14] }],
	feature: [{ w: [14] }, { w: [14] }],
	health: [{ w: [6, 6, 6] }, { w: [18] }],
	hitDice: [{ w: [6, 5, 9] }],
	initiative: [{ w: [6] }],
	inspiration: [{ w: [7] }],
	money: [{ w: [12] }],
	movementSpeed: [{ w: [6, 4, 4, 4] }],
	passiveSkills: [{ w: [10] }],
	personality: [{ w: [10, 10] }, { w: [10, 10] }],
	proficiencies: [{ w: [14] }],
	proficiencyBonus: [{ w: [7] }],
	savingThrows: column(6, 10),
	skills: column(19, 13),
	spellcastingStats: [{ w: [8, 7, 6] }],
	spellList: [{ w: [20] }],
	symbol: [{ w: [12] }, { w: [12] }],
	treasure: [{ w: [14] }],
};

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
	const recipe = CARD_DEFAULT_ROWS[card.type];
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
