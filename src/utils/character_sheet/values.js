// The one read path for a piece's value. Views never touch piece.value /
// piece.segments directly — they ask this layer (through usePieceValue), by
// piece id. A piece's stored value is either a literal or something computed
// from other pieces (today: a variable's formula, or a text piece with
// reference segments); callers just see `computed` and render read-only, so
// new kinds of computed value can be introduced here later without touching
// any card UI.
//
// `locked` is the shared hook for conditions that grey a piece out (e.g.
// "unlocks at level 5"). Nothing sets it yet; every view already honours it.

import { getPieceNumericValue, getPieceTextValue } from "./references.js";

const isPlainText = (piece) => piece.segments.length === 1 && piece.segments[0].type === "text";

// Returns { piece, kind, value, computed, error, locked }. `value` is what the
// view should show: the literal (for editing) or the resolved result.
export function readPieceValue(pieceIndex, pieceId) {
	const entry = pieceIndex[pieceId];
	if (!entry) {
		return { piece: null, kind: null, value: null, computed: false, error: "Missing piece", locked: false };
	}
	const { piece } = entry;
	const base = { piece, kind: piece.kind, computed: false, error: null, locked: false };
	switch (piece.kind) {
		case "variable": {
			if (!piece.formula) {
				return { ...base, value: piece.value };
			}
			const resolved = getPieceNumericValue(pieceId, pieceIndex);
			return { ...base, computed: true, value: resolved.value, error: resolved.error };
		}
		case "checkbox":
			return { ...base, value: Boolean(piece.value) };
		case "text": {
			if (isPlainText(piece)) {
				return { ...base, value: piece.segments[0].value };
			}
			const resolved = getPieceTextValue(pieceId, pieceIndex);
			return { ...base, computed: true, value: resolved.text, error: resolved.error };
		}
		case "dropdown":
			return { ...base, value: piece.selectedIndex };
		case "image":
			return { ...base, value: piece.src };
		default:
			return { ...base, value: null };
	}
}
