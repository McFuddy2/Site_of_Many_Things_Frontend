// Pure state transitions for a character sheet. Every op takes a sheet and returns
// a new sheet (no mutation), so they can back a useReducer and an undo history
// can snapshot them safely.
//
// All geometry here is in whole grid units (see grid.js): a card layout's
// x/y/w/h are page cells, and moduleRects are cells on the card's module grid.

import { createCardLayout, createPage, createTextPiece, createCheckboxPiece, createReference, makeId } from "./schema.js";
import { removalOf, getDependents, captureLastKnown } from "./references.js";
import { createEngine, resolveRoles, nodeIds } from "./engine/engine.js";
import { mapSources, toNumber } from "./engine/expression.js";
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

// A deletion is refused while anything outside it still reads what it would
// remove (see getDependents) — unless `force` ("Delete anyway"), in which case
// every broken reference first keeps its last known value. Returns
// { ok, dependents, sheet } with the sheet ready for the deletion itself.
function prepareDeletion(sheet, spec, force) {
	const dependents = getDependents(sheet, removalOf(sheet, spec));
	if (dependents.length && !force) {
		return { ok: false, dependents, sheet };
	}
	return { ok: true, dependents, sheet: captureLastKnown(sheet, dependents) };
}

// Deletes a card's data everywhere — refused while something else on the
// sheet reads it, unless `force`.
export function deleteCard(sheet, cardId, { force = false } = {}) {
	const prepared = prepareDeletion(sheet, { cardIds: [cardId] }, force);
	if (!prepared.ok) {
		return prepared;
	}
	const cards = { ...prepared.sheet.cards };
	delete cards[cardId];
	const pages = prepared.sheet.pages.map((page) => ({
		...page,
		cardLayouts: page.cardLayouts.filter((layout) => layout.cardId !== cardId),
	}));
	return { ok: true, dependents: prepared.dependents, sheet: { ...prepared.sheet, cards, pages } };
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

// A module's label bar and its body are coloured separately: `part` is
// "label", "body", or "all" (both — what Reset Color uses).
export function setModuleColor(sheet, cardId, moduleId, color, part = "all") {
	const module = sheet.cards[cardId]?.modules[moduleId];
	if (!module) {
		return sheet;
	}
	// `color` is the old single-colour field; it's dropped on any colour edit.
	const { color: oldSingleColor, ...next } = module;
	if (part === "label" || part === "all") {
		next.labelColor = color;
	}
	if (part === "body" || part === "all") {
		next.bodyColor = color;
	}
	return replaceModule(sheet, cardId, next);
}

// A card's header and its background (the space around its modules) are
// coloured separately: `part` is "header", "background", or "all".
export function setCardColor(sheet, cardId, color, part = "all") {
	const card = sheet.cards[cardId];
	if (!card) {
		return sheet;
	}
	const next = { ...card };
	if (part === "header" || part === "all") {
		next.headerColor = color;
	}
	if (part === "background" || part === "all") {
		next.bodyColor = color;
	}
	return replaceCard(sheet, next);
}

// Colours several things in one step: `items` are { cardId, part } (the
// card's header, background, or both) or { cardId, moduleId, part } (that
// module's label, body, or both). null resets to the default.
export function setItemsColor(sheet, items, color) {
	let next = sheet;
	for (const { cardId, moduleId, part = "all" } of items) {
		next = moduleId ? setModuleColor(next, cardId, moduleId, color, part) : setCardColor(next, cardId, color, part);
	}
	return next;
}

// ---------- Duplicates ----------

// Places copies of cards (already cloned with fresh ids — see cloneCard) on a
// page, each with its original's arrangement and size, at the first free
// spot from the original's row onward, so a copy lands near its source
// without moving anything.
export function duplicateCards(sheet, pageId, entries, { maxCols = DEFAULT_PAGE_COLUMNS } = {}) {
	let page = sheet.pages.find((existing) => existing.id === pageId);
	if (!page) {
		return sheet;
	}
	let next = sheet;
	for (const { sourceLayoutId, card } of entries) {
		const source = page.cardLayouts.find((layout) => layout.id === sourceLayoutId);
		const original = source && next.cards[source.cardId];
		if (!original) {
			continue;
		}
		const moduleIdMap = new Map(original.moduleOrder.map((moduleId, index) => [moduleId, card.moduleOrder[index]]));
		const moduleRects = {};
		for (const [moduleId, rect] of Object.entries(source.moduleRects)) {
			if (moduleIdMap.get(moduleId)) {
				moduleRects[moduleIdMap.get(moduleId)] = rect;
			}
		}
		const spot = findFreeSpot(page.cardLayouts.map(layoutRect), source.w, source.h, Math.max(maxCols, source.w), source.y);
		const layout = createCardLayout(card, {
			rect: spot,
			moduleOrder: source.moduleOrder.map((moduleId) => moduleIdMap.get(moduleId)).filter(Boolean),
			moduleRects,
		});
		page = { ...page, cardLayouts: [...page.cardLayouts, layout] };
		next = replaceCard(next, card);
	}
	return replacePage(next, page);
}

// Adds copies of modules (already cloned — see cloneModule) to a card, each
// the size of its original and placed at the first free cells from the
// original's row onward, on every page the card appears. The card grows if
// there's no room, and pushes its neighbours if it does.
export function duplicateModules(sheet, cardId, entries) {
	const card = sheet.cards[cardId];
	if (!card) {
		return sheet;
	}
	const nextCard = {
		...card,
		modules: { ...card.modules, ...Object.fromEntries(entries.map(({ module }) => [module.id, module])) },
		moduleOrder: [...card.moduleOrder, ...entries.map(({ module }) => module.id)],
	};
	return mapLayoutsAndSettle(
		replaceCard(sheet, nextCard),
		(layout) => layout.cardId === cardId,
		(layout) => {
			const { cols } = moduleGridSize(layout.w, layout.h);
			const moduleRects = { ...layout.moduleRects };
			const moduleOrder = [...layout.moduleOrder];
			for (const { sourceModuleId, module } of entries) {
				const source = layout.moduleRects[sourceModuleId];
				if (!source) {
					continue;
				}
				const others = Object.values(moduleRects);
				moduleRects[module.id] = findFreeSpot(others, source.w, source.h, Math.max(cols, source.w), source.y);
				moduleOrder.push(module.id);
			}
			return growCardToFit(nextCard, { ...layout, moduleOrder, moduleRects });
		}
	);
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

// Deletes modules from a card's data, everywhere it's placed. Refused as a
// whole while anything outside them still reads them (the UI checks first
// and explains why), unless `force`.
export function deleteModules(sheet, cardId, moduleIds, { force = false } = {}) {
	if (!sheet.cards[cardId]) {
		return sheet;
	}
	const removable = moduleIds.filter((moduleId) => sheet.cards[cardId].modules[moduleId]);
	const prepared = prepareDeletion(sheet, { modules: removable.map((moduleId) => ({ cardId, moduleId })) }, force);
	if (!removable.length || !prepared.ok) {
		return sheet;
	}
	sheet = prepared.sheet;
	const card = sheet.cards[cardId];
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
// loses this placement; a card placed only here is deleted outright. Refused
// as a whole while anything outside the deleted cards still reads them (the
// UI checks first and explains why), unless `force`.
export function deleteLayouts(sheet, pageId, layoutIds, { force = false } = {}) {
	const page = sheet.pages.find((each) => each.id === pageId);
	const selected = (page?.cardLayouts || []).filter((layout) => layoutIds.includes(layout.id));
	// Cards losing every placement they have are the ones actually deleted.
	const doomed = [...new Set(selected.map((layout) => layout.cardId))].filter(
		(cardId) => countCardPlacements(sheet, cardId) === selected.filter((layout) => layout.cardId === cardId).length
	);
	const prepared = prepareDeletion(sheet, { cardIds: doomed }, force);
	if (!prepared.ok) {
		return sheet;
	}
	let next = prepared.sheet;
	for (const layoutId of layoutIds) {
		const layout = next.pages.find((page) => page.id === pageId)?.cardLayouts.find((each) => each.id === layoutId);
		if (!layout) {
			continue;
		}
		if (countCardPlacements(next, layout.cardId) > 1) {
			next = removeCardFromPage(next, pageId, layoutId);
		} else {
			// Already checked (and remembered) as a whole above.
			next = deleteCard(next, layout.cardId, { force: true }).sheet;
		}
	}
	return next;
}

// ---------- Piece values ----------

export function setVariableValue(sheet, pieceId, value) {
	return replacePiece(sheet, pieceId, (piece) => ({ ...piece, value }));
}

export function setCheckboxValue(sheet, pieceId, value) {
	return replacePiece(sheet, pieceId, (piece) => ({ ...piece, value: Boolean(value) }));
}

export function setTristateValue(sheet, pieceId, value) {
	return replacePiece(sheet, pieceId, (piece) => ({ ...piece, value: Math.max(0, Math.min(2, Math.trunc(Number(value) || 0))) }));
}

export function setTextSegments(sheet, pieceId, segments) {
	return replacePiece(sheet, pieceId, (piece) => ({ ...piece, segments }));
}

export function setTextPlain(sheet, pieceId, text) {
	return setTextSegments(sheet, pieceId, [{ type: "text", value: text }]);
}

export function setDropdownSelection(sheet, pieceId, optionId) {
	return replacePiece(sheet, pieceId, (piece) => ({ ...piece, selectedOptionId: optionId }));
}

export function setImageSrc(sheet, pieceId, src) {
	return replacePiece(sheet, pieceId, (piece) => ({ ...piece, src }));
}

// The one write path for a piece's literal value, whatever its kind — what
// the value accessor layer (values.js) dispatches, so views never need to
// know which op a kind uses.
//
// A number whose reference is still pending is an ordinary editable field;
// typing into it unlinks the reference ("typed"), so auto-connect never
// overwrites what the player entered. (A linked number never reaches here:
// it shows as a chip, not a field.)
export function setPieceValue(sheet, pieceId, value) {
	const location = findPieceLocation(sheet, pieceId);
	const piece = location?.module.pieces[pieceId];
	switch (piece?.kind) {
		case "variable":
			return replacePiece(sheet, pieceId, (current) => ({
				...current,
				value,
				ref: current.ref && !current.ref.unlinked ? { ...current.ref, unlinked: "typed" } : current.ref,
			}));
		case "checkbox":
			return setCheckboxValue(sheet, pieceId, value);
		case "tristate":
			return setTristateValue(sheet, pieceId, value);
		case "text":
			// Plain text, or — from a field holding chips — the segments themselves.
			return Array.isArray(value) ? setTextSegments(sheet, pieceId, value) : setTextPlain(sheet, pieceId, value);
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
// A pending linked box count the player changes with −/+ is theirs from then
// on, like typing over a pending number.
function claimBoxCount(module) {
	return module.capacity && !module.capacity.unlinked ? { ...module, capacity: { ...module.capacity, unlinked: "typed" } } : module;
}

export function addModuleRow(sheet, cardId, moduleId) {
	const found = sheet.cards[cardId]?.modules[moduleId];
	const shape = getModuleRowShape(found?.type);
	if (!shape) {
		return sheet;
	}
	const module = claimBoxCount(found);
	const pieces = { ...module.pieces };
	const pieceOrder = [...module.pieceOrder];
	for (const makePiece of shape) {
		const piece = makePiece();
		pieces[piece.id] = piece;
		pieceOrder.push(piece.id);
	}
	return ensureModuleFits(replaceModule(sheet, cardId, { ...module, pieces, pieceOrder }), cardId, moduleId);
}

// Drops row `rowIndex` (and every piece in it). A row is never blocked from
// removal: anything that referenced one of its pieces keeps its last known
// value and shows as missing. The module keeps its size; the user shrinks it
// if they want the space back.
export function removeModuleRow(sheet, cardId, moduleId, rowIndex) {
	const shape = getModuleRowShape(sheet.cards[cardId]?.modules[moduleId]?.type);
	if (!shape) {
		return sheet;
	}
	const rowIds = sheet.cards[cardId].modules[moduleId].pieceOrder.slice(rowIndex * shape.length, (rowIndex + 1) * shape.length);
	if (!rowIds.length) {
		return sheet;
	}
	sheet = prepareDeletion(sheet, { pieceIds: rowIds }, true).sheet;
	const module = sheet.cards[cardId].modules[moduleId];
	const removedIds = rowIds;
	const pieces = { ...module.pieces };
	for (const pieceId of removedIds) {
		delete pieces[pieceId];
	}
	return replaceModule(sheet, cardId, {
		...claimBoxCount(module),
		pieces,
		pieceOrder: module.pieceOrder.filter((pieceId) => !removedIds.includes(pieceId)),
	});
}

// Replaces a dropdown's options ({ id, label, ref } — see
// createDropdownOption). The selection stays on the same option while it
// exists, else moves to the first.
export function setDropdownOptions(sheet, pieceId, options) {
	return replacePiece(sheet, pieceId, (piece) => ({
		...piece,
		options: options.map((option) => ({ ...option })),
		selectedOptionId: options.some((option) => option.id === piece.selectedOptionId)
			? piece.selectedOptionId
			: options[0]?.id ?? null,
	}));
}

// ---------- References ----------
//
// A reference lives in one of four places, named by a target:
//   { kind: "value", pieceId }              a number piece's whole value
//   { kind: "chip", pieceId, refId }        one chip inside a text piece
//   { kind: "option", pieceId, optionId }   one dropdown option
//   { kind: "capacity", moduleId }          a checkbox group's box count
//   { kind: "rule", moduleId, ruleId }      the value a module rule tests
// Every op here is one undoable step (see HISTORY_ACTIONS).

// The graph node a target's value lives at.
export function targetNode(target) {
	switch (target.kind) {
		case "chip":
			return nodeIds.part(target.pieceId, target.refId);
		case "option":
			return nodeIds.part(target.pieceId, target.optionId);
		case "capacity":
			return nodeIds.capacity(target.moduleId);
		case "rule":
			return nodeIds.lock(target.moduleId);
		default:
			return nodeIds.piece(target.pieceId);
	}
}

function findModuleLocation(sheet, moduleId) {
	for (const card of Object.values(sheet.cards)) {
		if (card.modules[moduleId]) {
			return { card, module: card.modules[moduleId] };
		}
	}
	return null;
}

function replaceModuleById(sheet, moduleId, updater) {
	const location = findModuleLocation(sheet, moduleId);
	return location ? replaceModule(sheet, location.card.id, updater(location.module)) : sheet;
}

// The reference currently held at a target, or null.
export function getTargetReference(sheet, target) {
	if (target.kind === "capacity") {
		return findModuleLocation(sheet, target.moduleId)?.module.capacity || null;
	}
	if (target.kind === "rule") {
		// A rule's condition isn't a saved reference, but reads like one.
		const rule = findModuleLocation(sheet, target.moduleId)?.module.rules?.find((each) => each.id === target.ruleId);
		return rule ? { id: rule.id, expr: rule.left, origin: "user", unlinked: false, nickname: null, lastKnown: null } : null;
	}
	const piece = findPieceLocation(sheet, target.pieceId)?.module.pieces[target.pieceId];
	if (!piece) {
		return null;
	}
	if (target.kind === "chip") {
		return piece.segments.find((segment) => segment.type === "chip" && segment.ref?.id === target.refId)?.ref || null;
	}
	if (target.kind === "option") {
		return piece.options.find((option) => option.id === target.optionId)?.ref || null;
	}
	return piece.ref || null;
}

// Swaps the reference at a target for `update(currentRef)` (null removes it).
function updateTargetReference(sheet, target, update) {
	if (target.kind === "capacity") {
		return replaceModuleById(sheet, target.moduleId, (module) => ({ ...module, capacity: update(module.capacity || null) }));
	}
	return replacePiece(sheet, target.pieceId, (piece) => {
		if (target.kind === "chip") {
			return {
				...piece,
				segments: piece.segments.map((segment) =>
					segment.type === "chip" && segment.ref?.id === target.refId ? { ...segment, ref: update(segment.ref) } : segment
				),
			};
		}
		if (target.kind === "option") {
			return {
				...piece,
				options: piece.options.map((option) => (option.id === target.optionId ? { ...option, ref: update(option.ref || null) } : option)),
			};
		}
		return { ...piece, ref: update(piece.ref || null) };
	});
}

// Adjacent text segments merged, empty ones dropped (but always at least one
// segment, so a text piece is never empty-shaped).
function normalizeSegments(segments) {
	const merged = [];
	for (const segment of segments) {
		const last = merged[merged.length - 1];
		if (segment.type === "text" && last?.type === "text") {
			merged[merged.length - 1] = { ...last, value: last.value + segment.value };
		} else if (segment.type !== "text" || segment.value) {
			merged.push(segment);
		}
	}
	return merged.length ? merged : [{ type: "text", value: "" }];
}

// A hand-made reference is always by piece id: any role in it is replaced by
// the piece that holds the role right now (a role nobody holds stays a role).
function byId(sheet, expr) {
	const roles = resolveRoles(sheet);
	return mapSources(expr, (src) => (src.role && roles.has(src.role) ? { piece: roles.get(src.role) } : src));
}

// Saves `expr` as the reference at a target — new, or replacing what's there
// (a chip keeps its id). Editing a card's default reference by hand turns it
// into an ordinary by-id reference.
export function setReference(sheet, target, expr, { nickname } = {}) {
	if (target.kind === "rule") {
		return updateRule(sheet, target.moduleId, target.ruleId, { left: byId(sheet, expr) });
	}
	return updateTargetReference(sheet, target, (current) => ({
		...(current || createReference(null)),
		expr: byId(sheet, expr),
		origin: "user",
		unlinked: false,
		lastKnown: null,
		nickname: nickname === undefined ? current?.nickname ?? null : nickname,
	}));
}

// Inserts a new chip into a text piece at `offset` (counting characters of
// text, and each chip as one; null = the end). Returns { sheet, refId }.
export function insertChip(sheet, pieceId, expr, { offset = null, nickname = null } = {}) {
	const ref = { ...createReference(byId(sheet, expr)), nickname };
	const chip = { type: "chip", ref };
	const next = replacePiece(sheet, pieceId, (piece) => {
		const segments = [];
		let remaining = offset ?? Infinity;
		let inserted = false;
		for (const segment of piece.segments) {
			if (!inserted && remaining === 0) {
				segments.push(chip);
				inserted = true;
			}
			const length = segment.type === "text" ? segment.value.length : 1;
			if (!inserted && segment.type === "text" && remaining < length) {
				segments.push({ type: "text", value: segment.value.slice(0, remaining) }, chip, {
					type: "text",
					value: segment.value.slice(remaining),
				});
				inserted = true;
			} else {
				segments.push(segment);
			}
			remaining -= length;
		}
		if (!inserted) {
			segments.push(chip);
		}
		return { ...piece, segments: normalizeSegments(segments) };
	});
	return { sheet: next, refId: ref.id };
}

// The current value at a target, from the engine.
function currentValue(sheet, target) {
	return createEngine(sheet).values.get(targetNode(target)) || null;
}

// Gives a checkbox group exactly `count` boxes (what it shows once its box
// count is no longer linked).
function setBoxCount(sheet, moduleId, count) {
	return replaceModuleById(sheet, moduleId, (module) => {
		const boxes = module.pieceOrder.filter((pieceId) => module.pieces[pieceId]?.kind === "checkbox");
		if (!Number.isInteger(count) || count === boxes.length) {
			return module;
		}
		const pieces = { ...module.pieces };
		let pieceOrder = [...module.pieceOrder];
		if (count > boxes.length) {
			for (let index = boxes.length; index < count; index += 1) {
				const piece = createCheckboxPiece({ label: `${module.label} ${index + 1}` });
				pieces[piece.id] = piece;
				pieceOrder.push(piece.id);
			}
		} else {
			const dropped = new Set(boxes.slice(count));
			dropped.forEach((pieceId) => delete pieces[pieceId]);
			pieceOrder = pieceOrder.filter((pieceId) => !dropped.has(pieceId));
		}
		return { ...module, pieces, pieceOrder };
	});
}

// Unlink: the reference is replaced by the value it shows right now, as a
// plain value the player can then change. A card's default reference is
// kept (marked unlinked) so it never auto-connects again; a hand-made one is
// dropped. A chip becomes its value as plain text.
export function unlinkReference(sheet, target) {
	if (target.kind === "rule") {
		return removeReference(sheet, target);
	}
	const current = currentValue(sheet, target);
	const shown = current && !current.error ? current.value : null;
	if (target.kind === "chip") {
		return replacePiece(sheet, target.pieceId, (piece) => ({
			...piece,
			segments: normalizeSegments(
				piece.segments.map((segment) =>
					segment.type === "chip" && segment.ref?.id === target.refId
						? { type: "text", value: shown === null || shown === undefined ? "" : String(shown) }
						: segment
				)
			),
		}));
	}
	if (target.kind === "capacity") {
		const count = typeof shown === "number" ? shown : null;
		const cleared = replaceModuleById(sheet, target.moduleId, (module) => ({ ...module, capacity: null }));
		return count === null ? cleared : setBoxCount(cleared, target.moduleId, count);
	}
	if (target.kind === "option") {
		return updateTargetReference(sheet, target, () => null);
	}
	const unlinked = updateTargetReference(sheet, target, (ref) => (ref?.origin === "default" ? { ...ref, unlinked: "user" } : null));
	return typeof shown === "number" ? replacePiece(unlinked, target.pieceId, (piece) => ({ ...piece, value: shown })) : unlinked;
}

// Remove: the reference and its value are both cleared (a chip disappears; a
// box count goes back to its −/+ buttons at the count it showed).
export function removeReference(sheet, target) {
	if (target.kind === "rule") {
		return updateRule(sheet, target.moduleId, target.ruleId, { left: null });
	}
	if (target.kind === "chip") {
		return replacePiece(sheet, target.pieceId, (piece) => ({
			...piece,
			segments: normalizeSegments(piece.segments.filter((segment) => !(segment.type === "chip" && segment.ref?.id === target.refId))),
		}));
	}
	if (target.kind === "capacity") {
		return unlinkReference(sheet, target);
	}
	if (target.kind === "option") {
		return updateTargetReference(sheet, target, () => null);
	}
	return replacePiece(updateTargetReference(sheet, target, () => null), target.pieceId, (piece) => ({ ...piece, value: 0 }));
}

// Replaces a module's lock/hide rules (see createRule).
export function setModuleRules(sheet, moduleId, rules) {
	return replaceModuleById(sheet, moduleId, (module) => ({
		...module,
		rules: rules.map((rule) => ({ ...rule, id: rule.id || makeId("rule") })),
	}));
}

export function updateRule(sheet, moduleId, ruleId, patch) {
	return replaceModuleById(sheet, moduleId, (module) => ({
		...module,
		rules: (module.rules || []).map((rule) => (rule.id === ruleId ? { ...rule, ...patch } : rule)),
	}));
}

// ---------- Linked box counts ----------
//
// A checkbox group whose box count is linked shows exactly that many boxes.
// Boxes past the count keep their checked state (their pieces stay), so
// raising the count brings them back; boxes past the pieces it has are drawn
// empty and get a piece the first time they're ticked.

// Ticks (or unticks) box `index` of a checkbox group, adding pieces up to it
// if the group doesn't have that many yet. A value change, not an undo step.
export function setBoxChecked(sheet, moduleId, index, checked) {
	return replaceModuleById(sheet, moduleId, (module) => {
		const boxes = module.pieceOrder.filter((pieceId) => module.pieces[pieceId]?.kind === "checkbox");
		const pieces = { ...module.pieces };
		const pieceOrder = [...module.pieceOrder];
		for (let at = boxes.length; at <= index; at += 1) {
			const piece = createCheckboxPiece({ label: `${module.label} ${at + 1}` });
			pieces[piece.id] = piece;
			pieceOrder.push(piece.id);
			boxes.push(piece.id);
		}
		pieces[boxes[index]] = { ...pieces[boxes[index]], value: Boolean(checked) };
		return { ...module, pieces, pieceOrder };
	});
}

// After any change: every checkbox group with a linked count records how
// many boxes it shows (`shownBoxes`, which its sizing reads — see
// moduleTypes.js), and grows wherever it's placed if they no longer fit.
// Cheap when nothing has a linked count.
export function syncLinkedBoxCounts(sheet) {
	const linked = [];
	for (const card of Object.values(sheet.cards)) {
		for (const module of Object.values(card.modules)) {
			if (module.capacity || module.shownBoxes !== undefined) {
				linked.push({ cardId: card.id, moduleId: module.id });
			}
		}
	}
	if (!linked.length) {
		return sheet;
	}
	const engine = createEngine(sheet);
	let next = sheet;
	for (const { cardId, moduleId } of linked) {
		const module = next.cards[cardId].modules[moduleId];
		const entry = module.capacity ? engine.values.get(nodeIds.capacity(moduleId)) : null;
		const shown = entry?.computed && !entry.error && typeof entry.value === "number" ? entry.value : undefined;
		if (shown === module.shownBoxes) {
			continue;
		}
		const { shownBoxes, ...rest } = module;
		next = replaceModule(next, cardId, shown === undefined ? rest : { ...rest, shownBoxes: shown });
		if (shown !== undefined && shown > (shownBoxes ?? 0)) {
			next = ensureModuleFits(next, cardId, moduleId);
		}
	}
	return next;
}

// ---------- Buttons ----------

// A piece's current number, or null when it has none (missing, error, text).
function numberAt(engine, pieceId) {
	const entry = pieceId ? engine.values.get(nodeIds.piece(pieceId)) : null;
	if (!entry || entry.error) {
		return null;
	}
	return toNumber(entry.value).value;
}

// Fires every action on a button piece. Targets must be number pieces whose
// value isn't computed by a reference. Unresolvable operands (e.g. an empty
// damage input) count as 0.
export function pressButton(sheet, buttonPieceId) {
	const button = findPieceLocation(sheet, buttonPieceId)?.module.pieces[buttonPieceId];
	if (!button || button.kind !== "button") {
		return sheet;
	}
	let nextSheet = sheet;
	for (const action of button.actions) {
		const engine = createEngine(nextSheet);
		const target = engine.index.pieces[action.targetPieceId];
		const targetEntry = engine.values.get(nodeIds.piece(action.targetPieceId));
		if (!target || target.piece.kind !== "variable" || targetEntry?.computed) {
			continue;
		}

		let amount = 0;
		if (action.operandPieceId) {
			amount = numberAt(engine, action.operandPieceId) ?? 0;
		} else if (typeof action.amount === "number") {
			amount = action.amount;
		}

		const current = numberAt(engine, action.targetPieceId) ?? 0;
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
		const min = numberAt(engine, action.minPieceId);
		if (min !== null) {
			value = Math.max(min, value);
		}
		const max = numberAt(engine, action.maxPieceId);
		if (max !== null) {
			value = Math.min(max, value);
		}

		nextSheet = replacePiece(nextSheet, action.targetPieceId, (piece) => ({ ...piece, value }));
	}
	return nextSheet;
}
