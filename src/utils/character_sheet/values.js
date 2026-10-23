// The one read path for a piece's value. Views never touch piece.value /
// piece.segments directly — they ask this layer (through usePieceValue), by
// piece id, and it answers from the reference engine (see engine/engine.js).
// A piece's value is either a literal or computed from other pieces by a
// reference; callers just see `computed` and render it as linked, so cards
// never need to know how a value came to be.
//
// `locked` / `hidden` come from the piece's module rules (see createRule):
// locked greys the piece out and makes it non-interactive with its contents
// kept; hidden isn't drawn.

import { nodeIds, moduleLockState } from "./engine/engine.js";

const NO_PIECE = { piece: null, kind: null, value: null, computed: false, error: "Missing piece", locked: false, hidden: false, state: null };

// Returns { piece, kind, value, computed, error, locked, hidden, state,
// partial, missingRoles }. `value` is what the view should show: the literal
// (for editing) or the computed result. `state` is the reference's state
// (linked | pending | missing | unlinked) or null when there's no reference.
export function readPieceValue(engine, pieceId) {
	const entry = engine.index.pieces[pieceId];
	if (!entry) {
		return NO_PIECE;
	}
	const { piece, moduleId } = entry;
	const lock = moduleLockState(engine, moduleId);
	const base = {
		piece,
		kind: piece.kind,
		computed: false,
		error: null,
		locked: lock === "locked",
		hidden: lock === "hidden",
		state: null,
	};
	const node = engine.values.get(nodeIds.piece(pieceId));
	switch (piece.kind) {
		case "variable":
		case "text":
			return node
				? {
						...base,
						value: node.value,
						computed: Boolean(node.computed),
						error: node.error,
						state: node.state ?? null,
						partial: Boolean(node.partial),
						missingRoles: node.missingRoles || [],
				  }
				: { ...base, value: piece.kind === "text" ? "" : piece.value };
		case "checkbox":
			return { ...base, value: Boolean(piece.value) };
		case "tristate":
			return { ...base, value: node?.value ?? 0 };
		case "dropdown":
			// The selection is the editable value; `result` is what it evaluates to.
			return { ...base, value: node?.optionId ?? piece.selectedOptionId, result: node?.value ?? null, error: node?.error ?? null };
		case "image":
			return { ...base, value: piece.src };
		default:
			return { ...base, value: null };
	}
}
