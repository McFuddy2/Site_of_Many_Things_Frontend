// Pure state transitions for a character sheet. Every op takes a sheet and returns
// a new sheet (no mutation), so they can back a useReducer and the layout editor's
// undo/redo can snapshot layouts safely.

import { createCardLayout, createPage, createTextPiece, createCheckboxPiece } from "./schema.js";
import { buildPieceIndex, getPieceNumericValue, canDeleteCard } from "./references.js";
import { findInitialRect, boundingHeight, boundingWidth, snap, GRID_SIZE } from "./grid.js";
import {
	CARD_GAP,
	CARD_MIN_WIDTH,
	CARD_MIN_HEIGHT,
	CARD_DEFAULT_WIDTH,
	CARD_DEFAULT_HEIGHT,
	CARD_HEADER_HEIGHT,
	CARD_BODY_INSET,
	MODULE_GAP,
	getModuleDefaultSize,
	getModuleMinSize,
	getMinHeaderWidth,
	CARD_BORDER_WIDTH,
} from "./layoutConstants.js";

// Places a sequence of modules (in order) into an initially empty area, each
// avoiding the ones placed before it and wrapping within maxWidth — the
// default arrangement a brand-new card/layout starts with, before the user
// drags anything. Every module gets its own type's default size (see
// getModuleDefaultSize) instead of one flat size, so nothing starts smaller
// than its content needs. The whole packed group is inset by one grid cell
// (GRID_SIZE) from the top/left, and maxWidth is shrunk by the same amount on
// the right, so a fresh card reads with a one-grid-cell margin on every edge
// instead of modules sitting flush against the card body's padding.
function packModuleRects(moduleIds, modulesById, maxWidth) {
	const rects = {};
	const placed = [];
	const wrapWidth = Number.isFinite(maxWidth) ? Math.max(GRID_SIZE, maxWidth - GRID_SIZE) : maxWidth;
	for (const moduleId of moduleIds) {
		const size = getModuleDefaultSize(modulesById[moduleId]?.type);
		const rect = findInitialRect(size.width, size.height, placed, MODULE_GAP, wrapWidth);
		rects[moduleId] = rect;
		placed.push(rect);
	}
	for (const moduleId of moduleIds) {
		rects[moduleId] = { ...rects[moduleId], x: rects[moduleId].x + GRID_SIZE, y: rects[moduleId].y + GRID_SIZE };
	}
	return rects;
}

// How many columns a card type's modules wrap into when it's first placed —
// the default arrangement each standard card starts with, matching how it's
// drawn in the spec (a stack of skill rows is 1, a grid of Basic Info fields is
// 3, and so on). Types with no entry pack into a single row and let the card
// size itself to fit (see fitCardToModules) rather than wrapping at all.
const CARD_PACK_COLUMNS = {
	allies: 1,
	appearance: 1,
	backstory: 1,
	deathSaves: 1,
	equipment: 1,
	feature: 1,
	money: 1,
	personality: 1,
	proficiencies: 1,
	savingThrows: 1,
	skills: 1,
	spellList: 1,
	symbol: 1,
	treasure: 1,
	spellcastingStats: 2,
	basicDescriptions: 3,
	basicInfo: 3,
	hitDice: 3,
	movementSpeed: 3,
	attack: 3,
};

// The wrap width that fits `columns` of the card's widest module side by side,
// gaps included. The extra grid cell cancels the one packModuleRects reserves
// as the right-hand margin, so the last column isn't pushed onto its own row.
function packWidthForCard(card) {
	const columns = CARD_PACK_COLUMNS[card.type];
	if (!columns) {
		return Infinity;
	}
	const widest = card.moduleOrder.reduce(
		(max, moduleId) => Math.max(max, getModuleDefaultSize(card.modules[moduleId]?.type).width),
		0
	);
	return columns * widest + (columns - 1) * MODULE_GAP + GRID_SIZE;
}

// Sizes a card to snugly fit the module rects packed into it — pure content
// fit, no header-title floor (see fitCardSize for that). Used for a
// brand-new card (stops every card from starting at the same fixed
// width/height regardless of how many/how large its modules are — the
// scrollbar-on-creation problem) and, live, as the card's size any time its
// modules are edited (see CardLayoutEditor). Rects from packModuleRects
// already carry a one-grid-cell margin on their top/left; the extra
// +GRID_SIZE here accounts for the matching margin on the bottom/right, so
// the card is sized for exactly one grid cell of breathing room on every
// edge — no more, no less (CARD_BORDER_WIDTH is only there because the
// card's own border eats into that space; see its comment).
export function fitCardToModules(card, moduleRects) {
	const rects = Object.values(moduleRects);
	const contentWidth = boundingWidth(rects, 0) + GRID_SIZE + CARD_BORDER_WIDTH;
	const contentHeight = boundingHeight(rects, 0) + GRID_SIZE + CARD_HEADER_HEIGHT + CARD_BORDER_WIDTH;
	return {
		width: snap(Math.max(CARD_MIN_WIDTH, contentWidth)),
		height: snap(Math.max(CARD_MIN_HEIGHT, contentHeight)),
	};
}

// fitCardToModules plus the header-safety floor (see getMinHeaderWidth) — the
// one size a card is ever allowed to be, whether it was just packed, just
// edited, or is mid-drag on its own resize handles. Centralising it here is
// what lets the card shrink as readily as it grows: every caller measures
// against this same fit instead of flooring against whatever size happened
// to be on screen before.
export function fitCardSize(card, moduleRects) {
	const fit = fitCardToModules(card, moduleRects);
	return { width: Math.max(fit.width, snap(getMinHeaderWidth(card.title))), height: fit.height };
}

// Proportionally rescales a group of module rects to exactly fill a
// `targetWidth` x `targetHeight` content area (the space inside the card's
// GRID_SIZE margin — see fitCardSize/fitCardToModules for how that margin is
// spent). This is what "resizing the card" means for its modules: their
// relative layout is preserved, everything grows or shrinks together, and
// the group is re-anchored to the margin on its way through (so a layout
// that had drifted off the top/left edge snaps back flush). Scale is floored
// per module at its own type's minimum (getModuleMinSize) — if the target is
// smaller than every module can bear, the affected axis simply stops
// shrinking there, so the resulting bounding box (and the card fitted to it)
// ends up larger than what was asked for rather than crushing content.
export function scaleModulesToContent(moduleRects, modulesById, targetWidth, targetHeight) {
	const ids = Object.keys(moduleRects);
	if (!ids.length) {
		return moduleRects;
	}
	const rects = ids.map((id) => moduleRects[id]);
	const minX = Math.min(...rects.map((rect) => rect.x));
	const minY = Math.min(...rects.map((rect) => rect.y));
	const maxX = Math.max(...rects.map((rect) => rect.x + rect.width));
	const maxY = Math.max(...rects.map((rect) => rect.y + rect.height));
	const sourceWidth = Math.max(1, maxX - minX);
	const sourceHeight = Math.max(1, maxY - minY);

	let scaleX = Math.max(0.01, targetWidth) / sourceWidth;
	let scaleY = Math.max(0.01, targetHeight) / sourceHeight;
	for (const id of ids) {
		const min = getModuleMinSize(modulesById[id]?.type);
		scaleX = Math.max(scaleX, min.width / moduleRects[id].width);
		scaleY = Math.max(scaleY, min.height / moduleRects[id].height);
	}

	const scaled = {};
	for (const id of ids) {
		const rect = moduleRects[id];
		scaled[id] = {
			x: GRID_SIZE + (rect.x - minX) * scaleX,
			y: GRID_SIZE + (rect.y - minY) * scaleY,
			width: rect.width * scaleX,
			height: rect.height * scaleY,
		};
	}
	return scaled;
}

// Backfills rects on sheets saved before the free-grid layout — every
// cardLayout gets a rect, and every module it includes gets an entry in
// moduleRects, so old saved data can't crash the renderer (which expects
// both to already be there) after this feature shipped.
export function migrateSheet(sheet) {
	return {
		...sheet,
		pages: sheet.pages.map((page) => {
			const placedCardRects = [];
			const cardLayouts = page.cardLayouts.map((layout) => {
				const rect = layout.rect || findInitialRect(CARD_DEFAULT_WIDTH, CARD_DEFAULT_HEIGHT, placedCardRects, CARD_GAP);
				placedCardRects.push(rect);

				const card = sheet.cards[layout.cardId];
				const moduleRects = { ...(layout.moduleRects || {}) };
				const placedModuleRects = Object.values(moduleRects);
				for (const moduleId of layout.moduleOrder) {
					if (moduleRects[moduleId]) {
						continue;
					}
					const size = getModuleDefaultSize(card?.modules[moduleId]?.type);
					const moduleRect = findInitialRect(
						size.width,
						size.height,
						placedModuleRects,
						MODULE_GAP,
						rect.width - CARD_BODY_INSET
					);
					moduleRects[moduleId] = moduleRect;
					placedModuleRects.push(moduleRect);
				}

				return { ...layout, rect, moduleRects };
			});
			return { ...page, cardLayouts };
		}),
	};
}

function replaceCard(sheet, card) {
	return { ...sheet, cards: { ...sheet.cards, [card.id]: card } };
}

function replacePage(sheet, page) {
	return { ...sheet, pages: sheet.pages.map((existing) => (existing.id === page.id ? page : existing)) };
}

function findPieceLocation(sheet, pieceId) {
	for (const card of Object.values(sheet.cards)) {
		for (const module of Object.values(card.modules)) {
			if (module.pieces[pieceId]) {
				return { card, module };
			}
		}
	}
	return null;
}

function replacePiece(sheet, pieceId, updater) {
	const location = findPieceLocation(sheet, pieceId);
	if (!location) {
		return sheet;
	}
	const piece = updater(location.module.pieces[pieceId]);
	const module = { ...location.module, pieces: { ...location.module.pieces, [pieceId]: piece } };
	const card = { ...location.card, modules: { ...location.card.modules, [module.id]: module } };
	return replaceCard(sheet, card);
}

// ---------- Pages ----------

export function addPage(sheet, name = null) {
	const page = createPage(name || `Page ${sheet.pages.length + 1}`);
	return { ...sheet, pages: [...sheet.pages, page], activePageId: page.id };
}

export function setActivePage(sheet, pageId) {
	return { ...sheet, activePageId: pageId };
}

export function setPageName(sheet, pageId, name) {
	return { ...sheet, pages: sheet.pages.map((page) => (page.id === pageId ? { ...page, name } : page)) };
}

// null clears a custom tab color back to the default navy-bordered look.
export function setPageColor(sheet, pageId, color) {
	return { ...sheet, pages: sheet.pages.map((page) => (page.id === pageId ? { ...page, color } : page)) };
}

// ---------- Cards on pages ----------

// Finds where a card-sized rect should go on a page, clear of every existing
// card layout's rect by at least the default move gap.
function findCardRect(page, width, height) {
	return findInitialRect(width, height, page.cardLayouts.map((layout) => layout.rect), CARD_GAP);
}

// Packs a card's modules and sizes the card itself to fit them (see
// fitCardSize) — the shared step behind placing a brand-new card and
// inserting an existing one.
function packCard(card) {
	const moduleRects = packModuleRects(card.moduleOrder, card.modules, packWidthForCard(card));
	return { moduleRects, cardSize: fitCardSize(card, moduleRects) };
}

// Adds a brand-new card's data to the sheet and places it on a page.
export function addCardToPage(sheet, pageId, card) {
	const page = sheet.pages.find((existing) => existing.id === pageId);
	if (!page) {
		return sheet;
	}
	const withCard = replaceCard(sheet, card);
	const { moduleRects, cardSize } = packCard(card);
	const layout = createCardLayout(card, {
		rect: findCardRect(page, cardSize.width, cardSize.height),
		moduleRects,
	});
	return replacePage(withCard, { ...page, cardLayouts: [...page.cardLayouts, layout] });
}

// The "insert an existing card from another page" flow: creates a new layout entry
// pointing at the same underlying card — never a copy of the data.
export function insertExistingCardOnPage(sheet, pageId, cardId) {
	const page = sheet.pages.find((existing) => existing.id === pageId);
	const card = sheet.cards[cardId];
	if (!page || !card) {
		return sheet;
	}
	const { moduleRects, cardSize } = packCard(card);
	const layout = createCardLayout(card, {
		rect: findCardRect(page, cardSize.width, cardSize.height),
		moduleRects,
	});
	return replacePage(sheet, { ...page, cardLayouts: [...page.cardLayouts, layout] });
}

// How many page layouts currently point at this card's data — more than one
// means the card has other copies (see insertExistingCardOnPage), so deleting
// one placement should never touch the card's data or its other placements.
export function countCardPlacements(sheet, cardId) {
	return sheet.pages.reduce(
		(total, page) => total + page.cardLayouts.filter((layout) => layout.cardId === cardId).length,
		0
	);
}

// Removes a card from one page only; the card's data (and other placements) survive.
export function removeCardFromPage(sheet, pageId, layoutId) {
	const page = sheet.pages.find((existing) => existing.id === pageId);
	if (!page) {
		return sheet;
	}
	return replacePage(sheet, {
		...page,
		cardLayouts: page.cardLayouts.filter((layout) => layout.id !== layoutId),
	});
}

// Deletes a card's data everywhere — but only when no other card references it.
// On refusal, referencedBy lists the referencing cards for the warning modal.
export function deleteCard(sheet, cardId) {
	const { ok, referencedBy } = canDeleteCard(sheet, cardId);
	if (!ok) {
		return { ok: false, referencedBy, sheet };
	}
	const cards = { ...sheet.cards };
	delete cards[cardId];
	const pages = sheet.pages.map((page) => ({
		...page,
		cardLayouts: page.cardLayouts.filter((layout) => layout.cardId !== cardId),
	}));
	return { ok: true, referencedBy: [], sheet: { ...sheet, cards, pages } };
}

export function setCardTitle(sheet, cardId, title) {
	const card = sheet.cards[cardId];
	if (!card) {
		return sheet;
	}
	return replaceCard(sheet, { ...card, title });
}

// Both colors are card data (like title), not per-layout — a card looks the
// same everywhere it's placed. null clears back to the default navy header /
// per-module-type pastel background.
export function setCardHeaderColor(sheet, cardId, color) {
	const card = sheet.cards[cardId];
	if (!card) {
		return sheet;
	}
	return replaceCard(sheet, { ...card, headerColor: color });
}

export function setCardModuleColor(sheet, cardId, color) {
	const card = sheet.cards[cardId];
	if (!card) {
		return sheet;
	}
	return replaceCard(sheet, { ...card, moduleBgColor: color });
}

// ---------- Modules and layouts ----------

// Adds a module to a card's data and appends it to every layout showing that card,
// so it becomes visible wherever the card is placed. Each layout gets its own
// initial rect for the module, clear of that layout's other modules — pages
// showing the same card can arrange it differently.
export function addModuleToCard(sheet, cardId, module) {
	const card = sheet.cards[cardId];
	if (!card) {
		return sheet;
	}
	const withModule = replaceCard(sheet, {
		...card,
		modules: { ...card.modules, [module.id]: module },
		moduleOrder: [...card.moduleOrder, module.id],
	});
	const size = getModuleDefaultSize(module.type);
	return {
		...withModule,
		pages: withModule.pages.map((page) => ({
			...page,
			cardLayouts: page.cardLayouts.map((layout) => {
				if (layout.cardId !== cardId) {
					return layout;
				}
				const maxWidth = (layout.rect ? layout.rect.width : CARD_DEFAULT_WIDTH) - CARD_BODY_INSET;
				const rect = findInitialRect(
					size.width,
					size.height,
					Object.values(layout.moduleRects || {}),
					MODULE_GAP,
					maxWidth
				);
				return {
					...layout,
					moduleOrder: [...layout.moduleOrder, module.id],
					moduleRects: { ...layout.moduleRects, [module.id]: rect },
				};
			}),
		})),
	};
}

// Removes a module from one page's arrangement of a card. Data is untouched.
export function removeModuleFromLayout(sheet, pageId, layoutId, moduleId) {
	const page = sheet.pages.find((existing) => existing.id === pageId);
	if (!page) {
		return sheet;
	}
	return replacePage(sheet, {
		...page,
		cardLayouts: page.cardLayouts.map((layout) => {
			if (layout.id !== layoutId) {
				return layout;
			}
			const { [moduleId]: removed, ...moduleRects } = layout.moduleRects || {};
			return { ...layout, moduleOrder: layout.moduleOrder.filter((id) => id !== moduleId), moduleRects };
		}),
	});
}

// The card is always exactly as big as its modules need (see fitCardSize) —
// whichever way that pushes it. Growing covers modules dragged/resized past
// the card's current edges; shrinking covers modules pulled in tighter than
// the card currently is. rectOffset (default zero) is the page-position shift
// a manual resize on the card's own nw/n/w/… handles produced (see
// CardLayoutEditor) — those handles can move the card's origin as well as its
// size, which fitCardSize alone (width/height only) can't express.
function fitRectToModules(rect, card, moduleRects, rectOffset = { x: 0, y: 0 }) {
	if (!rect || !card) {
		return rect;
	}
	const size = fitCardSize(card, moduleRects);
	return { ...rect, x: rect.x + rectOffset.x, y: rect.y + rectOffset.y, ...size };
}

// Commits a card layout editor draft: which modules are included, and each
// one's rect ({ x, y, width, height } in px). Rects for modules no longer in
// the order are dropped, and the card itself is refit to whatever's left
// (see fitRectToModules) — growing or shrinking as needed, plus any page-
// position shift from a manual card resize (rectOffset).
export function setCardLayoutArrangement(
	sheet,
	pageId,
	layoutId,
	{ moduleOrder, moduleRects = {}, rectOffset = { x: 0, y: 0 } }
) {
	const page = sheet.pages.find((existing) => existing.id === pageId);
	if (!page) {
		return sheet;
	}
	const keptRects = {};
	for (const moduleId of moduleOrder) {
		if (moduleRects[moduleId]) {
			keptRects[moduleId] = moduleRects[moduleId];
		}
	}
	return replacePage(sheet, {
		...page,
		cardLayouts: page.cardLayouts.map((layout) =>
			layout.id === layoutId
				? {
						...layout,
						moduleOrder: [...moduleOrder],
						moduleRects: keptRects,
						rect: fitRectToModules(layout.rect, sheet.cards[layout.cardId], keptRects, rectOffset),
				  }
				: layout
		),
	});
}

// Commits a page arrangement draft: each card layout's rect ({ x, y, width,
// height } in px, all multiples of 5). Card layout order in the page's array
// is otherwise untouched — visual position comes entirely from rect.
export function setPageArrangement(sheet, pageId, { rects = {} }) {
	const page = sheet.pages.find((existing) => existing.id === pageId);
	if (!page) {
		return sheet;
	}
	return replacePage(sheet, {
		...page,
		cardLayouts: page.cardLayouts.map((layout) => (rects[layout.id] ? { ...layout, rect: rects[layout.id] } : layout)),
	});
}

// Replaces a layout's module order wholesale (drag-and-drop reorder / Confirm Layout).
export function setLayoutModuleOrder(sheet, pageId, layoutId, moduleOrder) {
	const page = sheet.pages.find((existing) => existing.id === pageId);
	if (!page) {
		return sheet;
	}
	return replacePage(sheet, {
		...page,
		cardLayouts: page.cardLayouts.map((layout) =>
			layout.id === layoutId ? { ...layout, moduleOrder: [...moduleOrder] } : layout
		),
	});
}

// ---------- Piece values ----------

export function setVariableValue(sheet, pieceId, value) {
	return replacePiece(sheet, pieceId, (piece) => ({ ...piece, value }));
}

export function setVariableFormula(sheet, pieceId, formula) {
	return replacePiece(sheet, pieceId, (piece) => ({ ...piece, formula }));
}

export function setCheckboxValue(sheet, pieceId, value) {
	return replacePiece(sheet, pieceId, (piece) => ({ ...piece, value: Boolean(value) }));
}

export function setTextSegments(sheet, pieceId, segments) {
	return replacePiece(sheet, pieceId, (piece) => ({ ...piece, segments }));
}

export function setTextPlain(sheet, pieceId, text) {
	return setTextSegments(sheet, pieceId, [{ type: "text", value: text }]);
}

export function setDropdownSelection(sheet, pieceId, selectedIndex) {
	return replacePiece(sheet, pieceId, (piece) => ({ ...piece, selectedIndex }));
}

export function setImageSrc(sheet, pieceId, src) {
	return replacePiece(sheet, pieceId, (piece) => ({ ...piece, src }));
}

// ---------- Variable-length modules ----------
//
// A few module types hold a list the user grows and shrinks in place: text lines
// (Proficiencies and Languages), name+quantity rows (Equipment, Treasure), and
// checkboxes (hit dice spent, death saves, charges). They differ only in how many
// pieces make up one row, so one pair of ops covers all of them.
const MODULE_ROW_SHAPES = {
	listText: [() => createTextPiece({ label: "Item" })],
	itemList: [
		() => createTextPiece({ label: "Item Name" }),
		() => createTextPiece({ label: "Qty", text: "1", numberLocked: true }),
	],
	checkboxRow: [() => createCheckboxPiece({ label: "Use" })],
	columnHeader: [() => createTextPiece({ label: "Column", text: "Column" })],
};

export function getModuleRowShape(type) {
	return MODULE_ROW_SHAPES[type] || null;
}

export function getModuleRowCount(module) {
	const shape = getModuleRowShape(module?.type);
	return shape ? Math.floor(module.pieceOrder.length / shape.length) : 0;
}

function replaceModule(sheet, cardId, module) {
	const card = sheet.cards[cardId];
	if (!card) {
		return sheet;
	}
	return replaceCard(sheet, { ...card, modules: { ...card.modules, [module.id]: module } });
}

// Appends one row's worth of pieces to a variable-length module.
export function addModuleRow(sheet, cardId, moduleId) {
	const module = sheet.cards[cardId]?.modules[moduleId];
	const shape = getModuleRowShape(module?.type);
	if (!shape) {
		return sheet;
	}
	const pieces = { ...module.pieces };
	const pieceOrder = [...module.pieceOrder];
	for (const makePiece of shape) {
		const piece = makePiece();
		pieces[piece.id] = piece;
		pieceOrder.push(piece.id);
	}
	return replaceModule(sheet, cardId, { ...module, pieces, pieceOrder });
}

// Drops row `rowIndex` (and every piece in it). Nothing guards against another
// card referencing one of those pieces — a dangling reference already renders as
// a marked em dash rather than crashing (see getPieceNumericValue), and the
// reference-picking UI that would make this reachable isn't built yet.
export function removeModuleRow(sheet, cardId, moduleId, rowIndex) {
	const module = sheet.cards[cardId]?.modules[moduleId];
	const shape = getModuleRowShape(module?.type);
	if (!shape) {
		return sheet;
	}
	const removedIds = module.pieceOrder.slice(rowIndex * shape.length, (rowIndex + 1) * shape.length);
	if (!removedIds.length) {
		return sheet;
	}
	const pieces = { ...module.pieces };
	for (const pieceId of removedIds) {
		delete pieces[pieceId];
	}
	return replaceModule(sheet, cardId, {
		...module,
		pieces,
		pieceOrder: module.pieceOrder.filter((pieceId) => !removedIds.includes(pieceId)),
	});
}

export function setDropdownOptions(sheet, pieceId, options) {
	return replacePiece(sheet, pieceId, (piece) => ({
		...piece,
		options: [...options],
		selectedIndex: options.length ? Math.min(piece.selectedIndex ?? 0, options.length - 1) : null,
	}));
}

// Fires every action on a button piece. Targets must be writable variables
// (no formula). Unresolvable operands (e.g. an empty damage input) count as 0.
export function pressButton(sheet, buttonPieceId) {
	const index = buildPieceIndex(sheet);
	const entry = index[buttonPieceId];
	if (!entry || entry.piece.kind !== "button") {
		return sheet;
	}
	let nextSheet = sheet;
	for (const action of entry.piece.actions) {
		const currentIndex = buildPieceIndex(nextSheet);
		const targetEntry = currentIndex[action.targetPieceId];
		if (!targetEntry || targetEntry.piece.kind !== "variable" || targetEntry.piece.formula) {
			continue;
		}

		let amount = 0;
		if (action.operandPieceId) {
			const resolved = getPieceNumericValue(action.operandPieceId, currentIndex);
			amount = resolved.error ? 0 : resolved.value;
		} else if (typeof action.amount === "number") {
			amount = action.amount;
		}

		const current = Number(targetEntry.piece.value) || 0;
		let value = current;
		if (action.op === "add") {
			value = current + amount;
		} else if (action.op === "subtract") {
			value = current - amount;
		} else if (action.op === "set") {
			value = amount;
		}

		if (typeof action.min === "number") {
			value = Math.max(action.min, value);
		}
		if (typeof action.max === "number") {
			value = Math.min(action.max, value);
		}
		if (action.minPieceId) {
			const resolved = getPieceNumericValue(action.minPieceId, currentIndex);
			if (!resolved.error) {
				value = Math.max(resolved.value, value);
			}
		}
		if (action.maxPieceId) {
			const resolved = getPieceNumericValue(action.maxPieceId, currentIndex);
			if (!resolved.error) {
				value = Math.min(resolved.value, value);
			}
		}

		nextSheet = replacePiece(nextSheet, action.targetPieceId, (piece) => ({ ...piece, value }));
	}
	return nextSheet;
}
