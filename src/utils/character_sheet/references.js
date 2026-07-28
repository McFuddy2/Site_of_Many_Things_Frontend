// Cross-card reference resolution.
//
// Every piece id is globally unique, so a reference is just a pieceId. This module
// builds a lookup index over a sheet, resolves live values (with circular-reference
// protection), and answers "who references this card?" for the delete guard.

import { evaluateFormula, getFormulaRefs, FormulaError } from "./formula.js";

// pieceId -> { piece, moduleId, moduleLabel, cardId }
export function buildPieceIndex(sheet) {
	const index = {};
	for (const card of Object.values(sheet.cards)) {
		for (const module of Object.values(card.modules)) {
			for (const piece of Object.values(module.pieces)) {
				index[piece.id] = { piece, moduleId: module.id, moduleLabel: module.label, cardId: card.id };
			}
		}
	}
	return index;
}

// Every pieceId a single piece references (formula refs, text ref segments,
// and button action targets/operands/clamps).
export function getPieceRefs(piece) {
	switch (piece.kind) {
		case "variable":
			return getFormulaRefs(piece.formula);
		case "text":
			return piece.segments.filter((segment) => segment.type === "ref").map((segment) => segment.pieceId);
		case "button": {
			const refs = [];
			for (const action of piece.actions) {
				for (const key of ["targetPieceId", "operandPieceId", "minPieceId", "maxPieceId"]) {
					if (action[key]) {
						refs.push(action[key]);
					}
				}
			}
			return refs;
		}
		default:
			return [];
	}
}

// Live numeric value of a piece: variables evaluate their formula, checkboxes
// coerce to 0/1, number-locked text parses its resolved content. Returns
// { value, error } — never throws, and cycles resolve to an error instead of hanging.
export function getPieceNumericValue(pieceId, index, visiting = new Set()) {
	const entry = index[pieceId];
	if (!entry) {
		return { value: null, error: "Missing reference" };
	}
	const piece = entry.piece;
	switch (piece.kind) {
		case "variable": {
			// Formulas are the only place numeric resolution recurses, so this is
			// where the cycle guard tracks ids. Text pieces track their own below.
			if (visiting.has(pieceId)) {
				return { value: null, error: "Circular reference" };
			}
			if (!piece.formula) {
				const value = Number(piece.value);
				return Number.isFinite(value) ? { value, error: null } : { value: 0, error: null };
			}
			visiting.add(pieceId);
			try {
				return evaluateFormula(piece.formula, (refId) => {
					const resolved = getPieceNumericValue(refId, index, visiting);
					if (resolved.error) {
						throw new FormulaError(resolved.error);
					}
					return resolved.value;
				});
			} finally {
				visiting.delete(pieceId);
			}
		}
		case "checkbox":
			return { value: piece.value ? 1 : 0, error: null };
		case "text": {
			const resolved = getPieceTextValue(pieceId, index, visiting);
			if (resolved.error) {
				return { value: null, error: resolved.error };
			}
			const value = Number(resolved.text.trim());
			return Number.isFinite(value)
				? { value, error: null }
				: { value: null, error: "Text is not a number" };
		}
		case "dropdown": {
			const selected = piece.selectedIndex === null ? null : piece.options[piece.selectedIndex];
			const value = Number(selected);
			return Number.isFinite(value)
				? { value, error: null }
				: { value: null, error: "Dropdown selection is not a number" };
		}
		default:
			return { value: null, error: `A ${piece.kind} has no numeric value` };
	}
}

// Live text content of a text piece with all ref segments resolved.
export function getPieceTextValue(pieceId, index, visiting = new Set()) {
	const entry = index[pieceId];
	if (!entry) {
		return { text: "", error: "Missing reference" };
	}
	if (entry.piece.kind !== "text") {
		return getPieceDisplayValue(pieceId, index, visiting);
	}
	if (visiting.has(pieceId)) {
		return { text: "", error: "Circular reference" };
	}
	visiting.add(pieceId);
	try {
		let text = "";
		for (const segment of entry.piece.segments) {
			if (segment.type === "text") {
				text += segment.value;
			} else {
				const resolved = getPieceDisplayValue(segment.pieceId, index, visiting);
				if (resolved.error) {
					return { text: "", error: resolved.error };
				}
				text += resolved.text;
			}
		}
		return { text, error: null };
	} finally {
		visiting.delete(pieceId);
	}
}

// How a piece reads when pulled into another card's text.
export function getPieceDisplayValue(pieceId, index, visiting = new Set()) {
	const entry = index[pieceId];
	if (!entry) {
		return { text: "", error: "Missing reference" };
	}
	const piece = entry.piece;
	switch (piece.kind) {
		case "variable": {
			const resolved = getPieceNumericValue(pieceId, index, visiting);
			return resolved.error ? { text: "", error: resolved.error } : { text: String(resolved.value), error: null };
		}
		case "checkbox":
			return { text: piece.value ? "Yes" : "No", error: null };
		case "text":
			return getPieceTextValue(pieceId, index, visiting);
		case "dropdown": {
			const selected = piece.selectedIndex === null ? "" : piece.options[piece.selectedIndex] ?? "";
			return { text: String(selected), error: null };
		}
		default:
			return { text: "", error: `A ${piece.kind} cannot be displayed as text` };
	}
}

// Every card (other than cardId itself) that references any piece owned by cardId.
// Used by the delete guard: the returned entries drive the warning modal's clickable
// list, so each hit carries enough labels to describe where the reference lives.
// Returns [{ cardId, cardTitle, references: [{ moduleId, moduleLabel, pieceId, pieceLabel, targetPieceIds }] }]
export function getCardInboundRefs(sheet, cardId) {
	const target = sheet.cards[cardId];
	if (!target) {
		return [];
	}
	const ownPieceIds = new Set();
	for (const module of Object.values(target.modules)) {
		for (const pieceId of Object.keys(module.pieces)) {
			ownPieceIds.add(pieceId);
		}
	}

	const referencedBy = [];
	for (const card of Object.values(sheet.cards)) {
		if (card.id === cardId) {
			continue;
		}
		const references = [];
		for (const module of Object.values(card.modules)) {
			for (const piece of Object.values(module.pieces)) {
				const targetPieceIds = getPieceRefs(piece).filter((refId) => ownPieceIds.has(refId));
				if (targetPieceIds.length) {
					references.push({
						moduleId: module.id,
						moduleLabel: module.label,
						pieceId: piece.id,
						pieceLabel: piece.label,
						targetPieceIds,
					});
				}
			}
		}
		if (references.length) {
			referencedBy.push({ cardId: card.id, cardTitle: card.title, references });
		}
	}
	return referencedBy;
}

// A card may only be deleted once no other card references it.
export function canDeleteCard(sheet, cardId) {
	const referencedBy = getCardInboundRefs(sheet, cardId);
	return { ok: referencedBy.length === 0, referencedBy };
}
