// Shared sizing constants for the Character Sheet's free-form grid canvases
// (page-level card placement and per-card module placement) and their drag/
// resize handles. See grid.js for the geometry rules these constants feed.

export const CARD_GAP = 5; // px — 1 grid cell, the enforced minimum gap while moving a card
export const CARD_MIN_WIDTH = 180;
export const CARD_MIN_HEIGHT = 120;
export const CARD_DEFAULT_WIDTH = 320;
export const CARD_DEFAULT_HEIGHT = 240;

// A card body's padding (both sides combined) — subtracted from a card's
// width to get the usable row width new modules wrap within (see
// findInitialRect in grid.js). Matches .cs-card-body's padding in CSS.
export const CARD_BODY_INSET = 24;

export const MODULE_GAP = 5; // px — 1 grid cell, the enforced minimum gap while moving a module
export const MODULE_MIN_WIDTH = 64;
export const MODULE_MIN_HEIGHT = 48;
export const MODULE_DEFAULT_WIDTH = 120;
export const MODULE_DEFAULT_HEIGHT = 90;

// Per-module-type default sizes (px, multiples of GRID_SIZE) — big enough that
// a freshly-created module fits its own content without needing a scrollbar
// (see each module's view in CharacterSheetCard.jsx and its CSS class in
// CharacterSheetStyles.css for the content these were sized against). Types
// without an entry (custom/not-yet-built module kinds) fall back to the flat
// MODULE_DEFAULT_WIDTH/MODULE_DEFAULT_HEIGHT above.
export const MODULE_DEFAULT_SIZES = {
	abilityScore: { width: 110, height: 150 },
	number: { width: 150, height: 80 },
	bigNumber: { width: 120, height: 90 },
	bigText: { width: 260, height: 70 },
	savingThrow: { width: 200, height: 55 },
	skill: { width: 210, height: 40 },
	columnHeader: { width: 210, height: 40 },
	passiveSkill: { width: 210, height: 50 },
	checkbox: { width: 160, height: 55 },
	checkboxRow: { width: 230, height: 65 },
	text: { width: 170, height: 80 },
	textArea: { width: 260, height: 130 },
	dropdown: { width: 190, height: 85 },
	listText: { width: 240, height: 170 },
	itemList: { width: 260, height: 190 },
	image: { width: 230, height: 250 },
	currency: { width: 280, height: 190 },
	spellEntry: { width: 400, height: 210 },
	damageHeal: { width: 185, height: 150 },
};

export function getModuleDefaultSize(type) {
	return MODULE_DEFAULT_SIZES[type] || { width: MODULE_DEFAULT_WIDTH, height: MODULE_DEFAULT_HEIGHT };
}

// A module's content scales with its box: at the type's default size the
// content renders at its designed size (scale 1), and it grows or shrinks
// proportionally as the box is resized (see --cs-scale in CharacterSheetStyles.css,
// which drives every font/padding inside the module off this one number). The
// scale tracks the *smaller* of the two dimension ratios so the designed content
// always still fits the box in both axes — that's what lets us drop the module's
// scrollbars entirely (overflow: hidden) without ever clipping.
export const MODULE_MIN_SCALE = 0.75; // floor: content never shrinks below 3/4 of its designed size, so it stays readable

export function getModuleContentScale(rect, type) {
	const { width, height } = getModuleDefaultSize(type);
	if (!width || !height) {
		return 1;
	}
	const raw = Math.min(rect.width / width, rect.height / height);
	return Math.max(MODULE_MIN_SCALE, Number(raw.toFixed(3)));
}

// Per-type resize floor: a module can't be dragged smaller than this, so its
// content (scaled down to MODULE_MIN_SCALE at this size) stays big enough to
// read and interact with. Derived from the type's own default so a naturally
// small module (a save-throw row) and a large one (an ability tile) each keep
// sensible proportions, rather than sharing one flat minimum.
export function getModuleMinSize(type) {
	const { width, height } = getModuleDefaultSize(type);
	return {
		width: Math.round(width * MODULE_MIN_SCALE),
		height: Math.round(height * MODULE_MIN_SCALE),
	};
}

// A card's header bar height (see .cs-card-header in CharacterSheetStyles.css) —
// added on top of a fresh card's packed module height so a new card's body
// isn't short by the header's own space. Measured against a single-line
// header; see MIN_HEADER_WIDTH_OVERHEAD below for what keeps it single-line.
export const CARD_HEADER_HEIGHT = 45;

// Rough per-character width of the header's bold title text, plus its fixed
// overhead (side padding + the title/button gap + the "Edit Layout" button) —
// used only to floor a fresh card's width so the header never wraps to two
// lines. A wrapped header eats into the body's height (flex: 1 within a
// fixed-height card) without anything accounting for the extra line, which
// reintroduces the scrollbar this sizing exists to avoid.
export const HEADER_TITLE_CHAR_WIDTH = 9.5;
export const HEADER_FIXED_OVERHEAD = 145;

export function getMinHeaderWidth(title) {
	return Math.ceil(HEADER_FIXED_OVERHEAD + (title?.length || 0) * HEADER_TITLE_CHAR_WIDTH);
}

// .cs-card's own border (both sides combined, box-sizing: border-box) — it
// eats into the width/height otherwise available to the header + body, so a
// fresh card's fit-to-content size needs to add it back on top of the module
// content. (Module slots are absolutely positioned within .cs-card-body, so
// unlike normal-flow content they sit flush against *its* box edge regardless
// of its own CSS padding — the deliberate one-grid-cell margin added when
// packing a fresh card's modules is what keeps them off the edge, not the
// card body's padding.)
export const CARD_BORDER_WIDTH = 4;
