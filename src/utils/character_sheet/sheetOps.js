// Pure state transitions for a character sheet. Every op takes a sheet and returns
// a new sheet (no mutation), so they can back a useReducer and the layout editor's
// undo/redo can snapshot layouts safely.

import { createCardLayout, createPage } from "./schema.js";
import { buildPieceIndex, getPieceNumericValue, canDeleteCard } from "./references.js";

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

// ---------- Cards on pages ----------

// Adds a brand-new card's data to the sheet and places it on a page.
export function addCardToPage(sheet, pageId, card) {
	const page = sheet.pages.find((existing) => existing.id === pageId);
	if (!page) {
		return sheet;
	}
	const withCard = replaceCard(sheet, card);
	return replacePage(withCard, { ...page, cardLayouts: [...page.cardLayouts, createCardLayout(card)] });
}

// The "insert an existing card from another page" flow: creates a new layout entry
// pointing at the same underlying card — never a copy of the data.
export function insertExistingCardOnPage(sheet, pageId, cardId) {
	const page = sheet.pages.find((existing) => existing.id === pageId);
	const card = sheet.cards[cardId];
	if (!page || !card) {
		return sheet;
	}
	return replacePage(sheet, { ...page, cardLayouts: [...page.cardLayouts, createCardLayout(card)] });
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

// ---------- Modules and layouts ----------

// Adds a module to a card's data and appends it to every layout showing that card,
// so it becomes visible wherever the card is placed.
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
	return {
		...withModule,
		pages: withModule.pages.map((page) => ({
			...page,
			cardLayouts: page.cardLayouts.map((layout) =>
				layout.cardId === cardId ? { ...layout, moduleOrder: [...layout.moduleOrder, module.id] } : layout
			),
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
		cardLayouts: page.cardLayouts.map((layout) =>
			layout.id === layoutId
				? { ...layout, moduleOrder: layout.moduleOrder.filter((id) => id !== moduleId) }
				: layout
		),
	});
}

// Commits a card layout editor draft: module order plus per-module widths (px).
// Sizes are per-page arrangement data, like the order itself. Entries for
// modules no longer in the order are pruned.
export function setCardLayoutArrangement(sheet, pageId, layoutId, { moduleOrder, moduleSizes = {} }) {
	const page = sheet.pages.find((existing) => existing.id === pageId);
	if (!page) {
		return sheet;
	}
	const keptSizes = {};
	for (const moduleId of moduleOrder) {
		if (typeof moduleSizes[moduleId] === "number") {
			keptSizes[moduleId] = moduleSizes[moduleId];
		}
	}
	return replacePage(sheet, {
		...page,
		cardLayouts: page.cardLayouts.map((layout) =>
			layout.id === layoutId
				? { ...layout, moduleOrder: [...moduleOrder], moduleSizes: keptSizes }
				: layout
		),
	});
}

// Commits a page arrangement draft: card order (by layout id) and per-card
// widths (px; null/undefined width clears back to auto). Layout entries missing
// from the given order are kept at the end rather than dropped.
export function setPageArrangement(sheet, pageId, { layoutOrder, cardWidths = {} }) {
	const page = sheet.pages.find((existing) => existing.id === pageId);
	if (!page) {
		return sheet;
	}
	const byId = new Map(page.cardLayouts.map((layout) => [layout.id, layout]));
	const ordered = layoutOrder.map((id) => byId.get(id)).filter(Boolean);
	for (const layout of page.cardLayouts) {
		if (!layoutOrder.includes(layout.id)) {
			ordered.push(layout);
		}
	}
	return replacePage(sheet, {
		...page,
		cardLayouts: ordered.map((layout) => {
			if (!(layout.id in cardWidths)) {
				return layout;
			}
			const width = cardWidths[layout.id];
			if (typeof width === "number") {
				return { ...layout, cardWidth: width };
			}
			const { cardWidth, ...rest } = layout;
			return rest;
		}),
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
