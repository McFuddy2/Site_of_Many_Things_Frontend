// Pure state transitions for a character sheet. Every op takes a sheet and returns
// a new sheet (no mutation), so they can back a useReducer and an undo history
// can snapshot them safely.
//
// All geometry here is in whole grid units (see grid.js): a card layout's
// x/y/w/h are page cells, and moduleRects are cells on the card's module grid.

import { createCardLayout, createPage, createTextPiece, createCheckboxPiece } from "./schema.js";
import { buildPieceIndex, getPieceNumericValue, canDeleteCard, canDeleteModule } from "./references.js";
import { findFreeSpot, fitCardSize, moduleGridSize, getCardMinSize } from "./grid.js";
import { planCardChange, planModuleChange, pageColumnLimit } from "./placement.js";
import { buildDefaultModuleRects } from "./cardLayouts.js";
import { getModuleSizing } from "./moduleTypes.js";

// Columns a brand-new card may be placed within when the caller doesn't say
// how wide the page is (see findFreeSpot).
export const DEFAULT_PAGE_COLUMNS = 60;

function layoutRect(layout) {
	return { x: layout.x, y: layout.y, w: layout.w, h: layout.h };
}

function replaceCard(sheet, card) {
	return { ...sheet, cards: { ...sheet.cards, [card.id]: card } };
}

function replacePage(sheet, page) {
	return { ...sheet, pages: sheet.pages.map((existing) => (existing.id === page.id ? page : existing)) };
}

function replaceModule(sheet, cardId, module) {
	const card = sheet.cards[cardId];
	if (!card) {
		return sheet;
	}
	return replaceCard(sheet, { ...card, modules: { ...card.modules, [module.id]: module } });
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

function mapLayouts(sheet, predicate, update) {
	return {
		...sheet,
		pages: sheet.pages.map((page) => ({
			...page,
			cardLayouts: page.cardLayouts.map((layout) => (predicate(layout, page) ? update(layout, page) : layout)),
		})),
	};
}

// Grows a layout's card to at least its modules' bounding box (and title).
function growCardToFit(card, layout) {
	const min = getCardMinSize(card, layout);
	return { ...layout, w: Math.max(layout.w, min.w), h: Math.max(layout.h, min.h) };
}

// After cards on a page changed size/position (`changedIds`), pushes every
// other card on that page clear of them (see placement.js).
function settlePage(page, changedIds) {
	if (!changedIds.length) {
		return page;
	}
	const changed = Object.fromEntries(
		page.cardLayouts
			.filter((layout) => changedIds.includes(layout.id))
			.map((layout) => [layout.id, { x: layout.x, y: layout.y, w: layout.w, h: layout.h }])
	);
	const rects = planCardChange(page.cardLayouts, changed, { maxCols: pageColumnLimit(page.cardLayouts) });
	return { ...page, cardLayouts: page.cardLayouts.map((layout) => ({ ...layout, ...rects[layout.id] })) };
}

// mapLayouts, then pushes neighbours away from any card whose rect changed.
function mapLayoutsAndSettle(sheet, predicate, update) {
	return {
		...sheet,
		pages: sheet.pages.map((page) => {
			const changedIds = [];
			const cardLayouts = page.cardLayouts.map((layout) => {
				if (!predicate(layout, page)) {
					return layout;
				}
				const next = update(layout, page);
				if (next.x !== layout.x || next.y !== layout.y || next.w !== layout.w || next.h !== layout.h) {
					changedIds.push(layout.id);
				}
				return next;
			});
			return settlePage({ ...page, cardLayouts }, changedIds);
		}),
	};
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

// A fresh placement of a card: its default module arrangement (see
// cardLayouts.js), the card sized to exactly fit it, at the first free spot
// on the page in reading order.
function placeCard(page, card, maxCols = DEFAULT_PAGE_COLUMNS) {
	const moduleRects = buildDefaultModuleRects(card);
	const size = fitCardSize(card.title, moduleRects);
	const spot = findFreeSpot(page.cardLayouts.map(layoutRect), size.w, size.h, maxCols);
	return createCardLayout(card, { rect: spot, moduleRects });
}

// Adds a brand-new card's data to the sheet and places it on a page.
export function addCardToPage(sheet, pageId, card, { maxCols } = {}) {
	const page = sheet.pages.find((existing) => existing.id === pageId);
	if (!page) {
		return sheet;
	}
	const withCard = replaceCard(sheet, card);
	const layout = placeCard(page, card, maxCols);
	return replacePage(withCard, { ...page, cardLayouts: [...page.cardLayouts, layout] });
}

// The "insert an existing card from another page" flow: creates a new layout entry
// pointing at the same underlying card — never a copy of the data.
export function insertExistingCardOnPage(sheet, pageId, cardId, { maxCols } = {}) {
	const page = sheet.pages.find((existing) => existing.id === pageId);
	const card = sheet.cards[cardId];
	if (!page || !card) {
		return sheet;
	}
	const layout = placeCard(page, card, maxCols);
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
	const renamed = replaceCard(sheet, { ...card, title });
	return mapLayoutsAndSettle(
		renamed,
		(layout) => layout.cardId === cardId,
		(layout) => growCardToFit(renamed.cards[cardId], layout)
	);
}

// Colours are card/module data (like title), not per-layout — a card looks the
// same everywhere it's placed. null restores the default palette.
export function setCardHeaderColor(sheet, cardId, color) {
	const card = sheet.cards[cardId];
	if (!card) {
		return sheet;
	}
	return replaceCard(sheet, { ...card, headerColor: color });
}

export function setModuleColor(sheet, cardId, moduleId, color) {
	const module = sheet.cards[cardId]?.modules[moduleId];
	if (!module) {
		return sheet;
	}
	return replaceModule(sheet, cardId, { ...module, color });
}

// Colours every module on a card at once (the interim "Card Colors" panel).
export function setCardModulesColor(sheet, cardId, color) {
	const card = sheet.cards[cardId];
	if (!card) {
		return sheet;
	}
	const modules = {};
	for (const [moduleId, module] of Object.entries(card.modules)) {
		modules[moduleId] = { ...module, color };
	}
	return replaceCard(sheet, { ...card, modules });
}

// ---------- Modules and layouts ----------

// Adds a module to a card's data and appends it to every layout showing that card,
// so it becomes visible wherever the card is placed. Each layout gets its own
// spot for it (first free cells in the card's module grid, else below
// everything), and the card grows if it needs to.
export function addModuleToCard(sheet, cardId, module) {
	const card = sheet.cards[cardId];
	if (!card) {
		return sheet;
	}
	const nextCard = {
		...card,
		modules: { ...card.modules, [module.id]: module },
		moduleOrder: [...card.moduleOrder, module.id],
	};
	const withModule = replaceCard(sheet, nextCard);
	const sizing = getModuleSizing(module);
	return mapLayoutsAndSettle(
		withModule,
		(layout) => layout.cardId === cardId,
		(layout) => {
			const { cols } = moduleGridSize(layout.w, layout.h);
			const width = Math.max(sizing.minW, Math.min(sizing.defaultW, cols));
			const others = layout.moduleOrder.map((id) => layout.moduleRects[id]).filter(Boolean);
			const rect = findFreeSpot(others, width, getModuleSizing(module, width).defaultH, Math.max(cols, width));
			return growCardToFit(nextCard, {
				...layout,
				moduleOrder: [...layout.moduleOrder, module.id],
				moduleRects: { ...layout.moduleRects, [module.id]: rect },
			});
		}
	);
}

// Removes a module from one page's arrangement of a card. Data is untouched.
export function removeModuleFromLayout(sheet, pageId, layoutId, moduleId) {
	return mapLayouts(
		sheet,
		(layout, page) => page.id === pageId && layout.id === layoutId,
		(layout) => {
			const { [moduleId]: removed, ...moduleRects } = layout.moduleRects || {};
			return { ...layout, moduleOrder: layout.moduleOrder.filter((id) => id !== moduleId), moduleRects };
		}
	);
}

// Commits a card's module arrangement: which modules are included and each
// one's unit rect, plus (optionally) the card's own rect. The card is never
// left smaller than its modules' bounding box.
export function setCardLayoutArrangement(sheet, pageId, layoutId, { moduleOrder, moduleRects = {}, cardRect = null }) {
	const keptRects = {};
	for (const moduleId of moduleOrder) {
		if (moduleRects[moduleId]) {
			keptRects[moduleId] = moduleRects[moduleId];
		}
	}
	return mapLayoutsAndSettle(
		sheet,
		(layout, page) => page.id === pageId && layout.id === layoutId,
		(layout) =>
			growCardToFit(sheet.cards[layout.cardId], {
				...layout,
				...(cardRect || {}),
				moduleOrder: [...moduleOrder],
				moduleRects: keptRects,
			})
	);
}

// Moves/resizes cards on a page: `rects` maps layout id -> { x, y, w, h } in
// units (any subset of those keys). A card never shrinks below its modules
// and never goes to negative coordinates; other cards are pushed clear.
export function setPageArrangement(sheet, pageId, { rects = {} }) {
	return mapLayoutsAndSettle(
		sheet,
		(layout, page) => page.id === pageId && Boolean(rects[layout.id]),
		(layout) => {
			const next = { ...layout, ...rects[layout.id] };
			return growCardToFit(sheet.cards[layout.cardId], { ...next, x: Math.max(0, next.x), y: Math.max(0, next.y) });
		}
	);
}

// Replaces a layout's module order wholesale.
export function setLayoutModuleOrder(sheet, pageId, layoutId, moduleOrder) {
	return mapLayouts(
		sheet,
		(layout, page) => page.id === pageId && layout.id === layoutId,
		(layout) => ({ ...layout, moduleOrder: [...moduleOrder] })
	);
}

// A module whose content grew (another list row, more checkboxes) gets
// taller wherever it's placed if it no longer fits; whatever it now lands on
// in that card is pushed clear, and the card (and the cards around it on the
// page) make room in turn — see planModuleChange.
function ensureModuleFits(sheet, cardId, moduleId) {
	const card = sheet.cards[cardId];
	const module = card?.modules[moduleId];
	if (!module) {
		return sheet;
	}
	let next = sheet;
	for (const page of sheet.pages) {
		for (const { id: layoutId } of page.cardLayouts) {
			const livePage = next.pages.find((existing) => existing.id === page.id);
			const layout = livePage.cardLayouts.find((existing) => existing.id === layoutId);
			const rect = layout.cardId === cardId ? layout.moduleRects[moduleId] : null;
			if (!rect) {
				continue;
			}
			const { minH } = getModuleSizing(module, rect.w);
			if (minH <= rect.h) {
				continue;
			}
			const plan = planModuleChange(card, layout, { [moduleId]: { ...rect, h: minH } }, livePage.cardLayouts, {
				maxCols: pageColumnLimit(livePage.cardLayouts),
			});
			next = applyPageLayout(next, page.id, {
				cardRects: plan.pageRects,
				moduleLayoutId: layout.id,
				moduleRects: plan.moduleRects,
			});
		}
	}
	return next;
}

// Commits one finished layout change on a page in a single step (so it's a
// single undo step): new rects for any cards (`cardRects`, layout id ->
// rect), and optionally a new module arrangement for one card layout. The
// caller has already resolved pushes (see placement.js); this just stores
// the result.
export function applyPageLayout(sheet, pageId, { cardRects = {}, moduleLayoutId = null, moduleRects = null }) {
	return mapLayouts(
		sheet,
		(layout, page) => page.id === pageId && (Boolean(cardRects[layout.id]) || layout.id === moduleLayoutId),
		(layout) => {
			const next = { ...layout, ...(cardRects[layout.id] || {}) };
			if (layout.id === moduleLayoutId && moduleRects) {
				next.moduleRects = { ...layout.moduleRects, ...moduleRects };
			}
			return next;
		}
	);
}

// Deletes modules from a card's data, everywhere it's placed. Modules another
// module still references are skipped (the UI checks canDeleteModule first
// and explains why).
export function deleteModules(sheet, cardId, moduleIds) {
	const card = sheet.cards[cardId];
	if (!card) {
		return sheet;
	}
	const removable = moduleIds.filter((moduleId) => card.modules[moduleId] && canDeleteModule(sheet, cardId, moduleId).ok);
	if (!removable.length) {
		return sheet;
	}
	const modules = { ...card.modules };
	for (const moduleId of removable) {
		delete modules[moduleId];
	}
	const withoutModules = replaceCard(sheet, {
		...card,
		modules,
		moduleOrder: card.moduleOrder.filter((moduleId) => !removable.includes(moduleId)),
	});
	return mapLayouts(
		withoutModules,
		(layout) => layout.cardId === cardId,
		(layout) => {
			const moduleRects = { ...layout.moduleRects };
			for (const moduleId of removable) {
				delete moduleRects[moduleId];
			}
			return { ...layout, moduleOrder: layout.moduleOrder.filter((id) => !removable.includes(id)), moduleRects };
		}
	);
}

// Deletes cards from a page. A card that's also placed on other pages only
// loses this placement; a card placed only here is deleted outright, unless
// another card references it, in which case it's left alone (the UI checks
// canDeleteCard first and explains why).
export function deleteLayouts(sheet, pageId, layoutIds) {
	let next = sheet;
	for (const layoutId of layoutIds) {
		const layout = next.pages.find((page) => page.id === pageId)?.cardLayouts.find((each) => each.id === layoutId);
		if (!layout) {
			continue;
		}
		if (countCardPlacements(next, layout.cardId) > 1) {
			next = removeCardFromPage(next, pageId, layoutId);
		} else {
			const result = deleteCard(next, layout.cardId);
			next = result.ok ? result.sheet : next;
		}
	}
	return next;
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

// The one write path for a piece's literal value, whatever its kind — what
// the value accessor layer (values.js) dispatches, so views never need to
// know which op a kind uses.
export function setPieceValue(sheet, pieceId, value) {
	const location = findPieceLocation(sheet, pieceId);
	switch (location?.module.pieces[pieceId].kind) {
		case "variable":
			return setVariableValue(sheet, pieceId, value);
		case "checkbox":
			return setCheckboxValue(sheet, pieceId, value);
		case "text":
			return setTextPlain(sheet, pieceId, value);
		case "dropdown":
			return setDropdownSelection(sheet, pieceId, value);
		case "image":
			return setImageSrc(sheet, pieceId, value);
		default:
			return sheet;
	}
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

// Appends one row's worth of pieces to a variable-length module, growing the
// module (and its card) wherever it no longer fits.
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
	return ensureModuleFits(replaceModule(sheet, cardId, { ...module, pieces, pieceOrder }), cardId, moduleId);
}

// Drops row `rowIndex` (and every piece in it). Nothing guards against another
// card referencing one of those pieces — a dangling reference already renders as
// a marked em dash rather than crashing (see getPieceNumericValue), and the
// reference-picking UI that would make this reachable isn't built yet. The
// module keeps its size; the user shrinks it if they want the space back.
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
