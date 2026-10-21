// The one set of sizing tokens behind the whole Character Sheet. Everything
// on the page is laid out on a single grid of GRID_UNIT-px cells: cards are
// whole-cell rects on the page, modules are whole-cell rects inside a card,
// and every visual size in between (header, label bars, inputs, gaps) comes
// from here. The CSS reads the same numbers through tokenCssVars() (set
// inline on the page root), so JS sizing math and rendered CSS can't drift.
//
// Geometry is stored in integer grid units — never px. A rect is rendered
// INSET px in from its cell edges on every side, which is what makes every
// gap uniform without being stored: two neighbours are 2 * INSET apart, and
// a card's border + body padding are chosen so a module sits exactly that
// same distance from its card's edge.

export const GRID_UNIT = 20; // px per grid cell
export const INSET = 4; // px a rendered rect sits in from its cell edges
export const GAP = INSET * 2; // px between any two neighbours

// Card chrome. Horizontally a card spends INSET + border + padding = half a
// unit on each side, so a card is exactly one unit wider than its module
// grid. Vertically the header takes two more units on top.
export const CARD_BORDER = 2;
export const CARD_PAD = GRID_UNIT / 2 - INSET - CARD_BORDER; // 4px — module-to-card-edge gap is CARD_PAD + INSET = GAP
export const CARD_HEADER_UNITS = 2;
export const CARD_CHROME_W = 1; // card.w - module grid columns
export const CARD_CHROME_H = CARD_HEADER_UNITS + 1; // card.h - module grid rows
// Header bar height (40px): whatever the vertical chrome units leave once the
// inset, border and body padding on both edges are taken out.
export const CARD_HEADER_HEIGHT = CARD_CHROME_H * GRID_UNIT - 2 * (INSET + CARD_BORDER + CARD_PAD);

// Where a card's module grid starts, in px from the card's cell origin — for
// drawing module selection/guides on the page-level overlay.
export const MODULE_GRID_OFFSET_X = INSET + CARD_BORDER + CARD_PAD;
export const MODULE_GRID_OFFSET_Y = INSET + CARD_BORDER + CARD_HEADER_HEIGHT + CARD_PAD;

// Module internals (px). Things that do the same job are the same size on
// every card.
export const SIZE = {
	moduleBorder: 2,
	radius: 6,
	labelHeight: 18,
	labelFont: 12,
	bodyPad: 3,
	inputHeight: 24,
	inputFont: 14,
	bigInputHeight: 24,
	bigInputFont: 19,
	valueFont: 15,
	bigValueFont: 22,
	checkbox: 16,
	checkboxGap: 6,
	buttonHeight: 26,
	buttonFont: 13,
	rowHeight: 22, // one line of a list/table module
	rowGap: 2,
	headerFont: 16,
	headerPadX: 10,
	headerIcon: 24,
	captionFont: 11,
	statCheckCol: 66, // stat rows: proficiency column (fits the "Proficient?" heading)
	statSaveCheckCol: 28, // saving throws have no heading, so their column is just the box
	statValueCol: 48, // fits the "Modifier" heading and a signed two-digit value
};

// Phone sizes (see the phone view in SheetViewer): the same jobs, sized for
// fingers — inputs at 16px+ (which also stops iOS zooming in on focus) and
// comfortable touch targets. Only the phone gets these; desktop and the
// scaled tablet view keep the designed sizes, since their layout is the grid.
export const TOUCH_SIZE = {
	labelHeight: 24,
	labelFont: 13,
	inputHeight: 38,
	inputFont: 16,
	bigInputHeight: 40,
	bigInputFont: 22,
	valueFont: 17,
	bigValueFont: 24,
	checkbox: 24,
	checkboxGap: 10,
	buttonHeight: 38,
	buttonFont: 15,
	rowHeight: 38,
	captionFont: 12,
	statCheckCol: 100, // the "Proficient?" heading at 16px
	statSaveCheckCol: 40,
	statValueCol: 72,
};

// Pixel size of a whole-unit span once inset on both sides.
export function unitsToPx(units) {
	return units * GRID_UNIT - 2 * INSET;
}

// Smallest whole-unit span whose inset box is at least `px` big.
export function pxToUnits(px) {
	return Math.max(1, Math.ceil((px + 2 * INSET) / GRID_UNIT));
}

// px of a module's chrome (borders + label bar + body padding) around its
// content, for the size functions in moduleTypes.js.
export function moduleChromeHeight({ label = true } = {}) {
	return SIZE.moduleBorder * 2 + (label ? SIZE.labelHeight : 0) + SIZE.bodyPad * 2;
}

// Header title font, for measuring how wide a card must be to show its
// whole title (see getTitleMinUnits).
export const HEADER_FONT = `bold ${SIZE.headerFont}px Arial, Helvetica, sans-serif`;

// The widest a card's title is allowed to push its minimum width; anything
// longer is ellipsized (with the full title in a tooltip) instead.
export const TITLE_MIN_UNITS_CAP = 16;

let measureContext = null;
function measureTitle(title) {
	if (typeof document !== "undefined") {
		measureContext = measureContext || document.createElement("canvas").getContext("2d");
		if (measureContext) {
			measureContext.font = HEADER_FONT;
			return measureContext.measureText(title).width;
		}
	}
	// No DOM (node scripts): a deliberately generous per-character estimate.
	return title.length * SIZE.headerFont * 0.62;
}

// Minimum card width (units) that shows the whole title plus the header icon
// on one line.
export function getTitleMinUnits(title = "") {
	const px =
		measureTitle(title) + SIZE.headerPadX * 2 + SIZE.headerIcon + 6 + 2 * (INSET + CARD_BORDER) + 2;
	return Math.min(TITLE_MIN_UNITS_CAP, Math.max(3, Math.ceil(px / GRID_UNIT)));
}

// CSS custom properties mirroring the tokens above, applied inline on the
// sheet's root so the stylesheet never hard-codes a size the JS also uses.
// `touch` swaps in the phone sizes (TOUCH_SIZE).
export function tokenCssVars({ touch = false } = {}) {
	const px = (value) => `${value}px`;
	const size = touch ? { ...SIZE, ...TOUCH_SIZE } : SIZE;
	return {
		"--cs-unit": px(GRID_UNIT),
		"--cs-inset": px(INSET),
		"--cs-gap": px(GAP),
		"--cs-card-border": px(CARD_BORDER),
		"--cs-card-pad": px(CARD_PAD),
		"--cs-header-h": px(CARD_HEADER_HEIGHT),
		"--cs-header-font": px(size.headerFont),
		"--cs-header-pad-x": px(size.headerPadX),
		"--cs-header-icon": px(size.headerIcon),
		"--cs-module-border": px(size.moduleBorder),
		"--cs-radius": px(size.radius),
		"--cs-label-h": px(size.labelHeight),
		"--cs-label-font": px(size.labelFont),
		"--cs-body-pad": px(size.bodyPad),
		"--cs-input-h": px(size.inputHeight),
		"--cs-input-font": px(size.inputFont),
		"--cs-big-input-h": px(size.bigInputHeight),
		"--cs-big-input-font": px(size.bigInputFont),
		"--cs-value-font": px(size.valueFont),
		"--cs-big-value-font": px(size.bigValueFont),
		"--cs-checkbox": px(size.checkbox),
		"--cs-checkbox-gap": px(size.checkboxGap),
		"--cs-button-h": px(size.buttonHeight),
		"--cs-button-font": px(size.buttonFont),
		"--cs-row-h": px(size.rowHeight),
		"--cs-row-gap": px(size.rowGap),
		"--cs-caption-font": px(size.captionFont),
		"--cs-stat-check-col": px(size.statCheckCol),
		"--cs-stat-save-check-col": px(size.statSaveCheckCol),
		"--cs-stat-value-col": px(size.statValueCol),
	};
}
