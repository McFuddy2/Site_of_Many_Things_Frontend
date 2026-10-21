// Per-module-type metadata: the colour role a type defaults to, and its size
// rules in grid units. This table is the only place module sizing lives —
// adding a module type means adding a row here, never a per-card CSS hack.
//
//   defaultW/defaultH: the size a fresh module of this type starts at.
//   minW/minH: the smallest size at which everything inside is fully
//     visible — no clipped controls, no scrollbars. Resizing stops here.
//
// List-like types grow with their content (rows, checkboxes), so their
// heights are functions of the module (and, for wrapping content, its width)
// rather than constants. Everything is derived from the SIZE tokens in
// layoutConstants.js, so retuning a token resizes every type consistently.

import { SIZE, pxToUnits, unitsToPx, moduleChromeHeight } from "./layoutConstants.js";

const FIELD_CHROME = moduleChromeHeight();

// Inner width (px) of a module `w` units wide, once its border and body
// padding are taken out.
function bodyWidth(w) {
	return unitsToPx(w) - SIZE.moduleBorder * 2 - SIZE.bodyPad * 2;
}

function stackHeight(count, itemHeight, gap) {
	const n = Math.max(1, count);
	return n * itemHeight + (n - 1) * gap;
}

function checkboxRowHeight(module, w) {
	const count = module?.pieceOrder?.length ?? 0;
	const pitch = SIZE.checkbox + SIZE.checkboxGap;
	const perLine = Math.max(1, Math.floor((bodyWidth(w) + SIZE.checkboxGap) / pitch));
	const lines = Math.max(1, Math.ceil(count / perLine));
	return pxToUnits(FIELD_CHROME + stackHeight(lines, SIZE.checkbox, SIZE.checkboxGap));
}

function listTextHeight(module) {
	const rows = module?.pieceOrder?.length ?? 0;
	return pxToUnits(FIELD_CHROME + stackHeight(rows, SIZE.rowHeight, SIZE.rowGap));
}

function itemListHeight(module) {
	const rows = Math.ceil((module?.pieceOrder?.length ?? 0) / 2);
	// +1 row for the "Item Name | Qty" heading.
	return pxToUnits(FIELD_CHROME + stackHeight(rows + 1, SIZE.rowHeight, SIZE.rowGap));
}

// Labelled field with one control under its label bar (number, text, dropdown…).
const FIELD_H = pxToUnits(FIELD_CHROME + SIZE.inputHeight);
// A single-line row with no label bar (skills, saves, a lone checkbox).
const ROW_H = pxToUnits(SIZE.moduleBorder * 2 + SIZE.inputHeight);

export const MODULE_TYPES = {
	number: { role: "number", defaultW: 6, defaultH: FIELD_H, minW: 3, minH: FIELD_H },
	bigNumber: { role: "number", defaultW: 6, defaultH: FIELD_H, minW: 3, minH: FIELD_H },
	abilityScore: {
		role: "number",
		defaultW: 5,
		minW: 5,
		// Bonus row + Score row under the label bar.
		defaultH: pxToUnits(FIELD_CHROME + 30 + SIZE.bodyPad + SIZE.inputHeight),
		minH: pxToUnits(FIELD_CHROME + 30 + SIZE.bodyPad + SIZE.inputHeight),
	},
	passiveSkill: { role: "number", defaultW: 10, defaultH: ROW_H, minW: 9, minH: ROW_H },
	text: { role: "text", defaultW: 6, defaultH: FIELD_H, minW: 4, minH: FIELD_H },
	bigText: { role: "text", defaultW: 12, defaultH: FIELD_H, minW: 6, minH: FIELD_H },
	textArea: {
		role: "text",
		defaultW: 14,
		defaultH: 6,
		minW: 6,
		minH: pxToUnits(FIELD_CHROME + 40),
	},
	spellEntry: {
		role: "text",
		defaultW: 20,
		defaultH: 10,
		minW: 14,
		// Name, the stat columns (caption + field), then at least two lines of description.
		minH: pxToUnits(FIELD_CHROME + SIZE.inputHeight + 4 + (12 + SIZE.rowHeight) + 4 + 40),
	},
	dropdown: { role: "choice", defaultW: 8, defaultH: FIELD_H, minW: 5, minH: FIELD_H },
	checkbox: { role: "tracker", defaultW: 6, defaultH: ROW_H, minW: 4, minH: ROW_H },
	checkboxRow: { role: "tracker", defaultW: 9, defaultH: checkboxRowHeight, minW: 5, minH: checkboxRowHeight },
	skill: { role: "tracker", defaultW: 13, defaultH: ROW_H, minW: 10, minH: ROW_H },
	savingThrow: { role: "tracker", defaultW: 10, defaultH: ROW_H, minW: 8, minH: ROW_H },
	columnHeader: { role: "heading", defaultW: 13, defaultH: ROW_H, minW: 10, minH: ROW_H },
	listText: { role: "list", defaultW: 12, defaultH: listTextHeight, minW: 6, minH: listTextHeight },
	itemList: { role: "list", defaultW: 14, defaultH: itemListHeight, minW: 8, minH: itemListHeight },
	image: { role: "media", defaultW: 12, defaultH: 10, minW: 6, minH: 6 },
	currency: {
		role: "currency",
		defaultW: 12,
		minW: 11,
		// The gold total plus the four coins.
		defaultH: pxToUnits(FIELD_CHROME + stackHeight(5, SIZE.inputHeight, SIZE.rowGap)),
		minH: pxToUnits(FIELD_CHROME + stackHeight(5, SIZE.inputHeight, SIZE.rowGap)),
	},
	damageHeal: { role: "action", defaultW: 18, defaultH: FIELD_H, minW: 10, minH: FIELD_H },
};

// Module types without an entry (anything rendered by the generic view)
// get a roomy labelled box.
const FALLBACK_TYPE = { role: "text", defaultW: 8, defaultH: 4, minW: 4, minH: 4 };

export function getModuleType(type) {
	return MODULE_TYPES[type] || FALLBACK_TYPE;
}

const resolve = (value, module, w) => (typeof value === "function" ? value(module, w) : value);

// Concrete sizes for one module. `w` is the width (units) to evaluate
// width-dependent heights at; it defaults to the type's default width.
export function getModuleSizing(module, w = null) {
	const meta = getModuleType(module?.type);
	const width = w ?? meta.defaultW;
	const minH = resolve(meta.minH, module, width);
	return {
		role: meta.role,
		minW: meta.minW,
		minH,
		defaultW: meta.defaultW,
		defaultH: Math.max(minH, resolve(meta.defaultH, module, meta.defaultW)),
	};
}

export function getModuleRole(module) {
	return getModuleType(module?.type).role;
}
