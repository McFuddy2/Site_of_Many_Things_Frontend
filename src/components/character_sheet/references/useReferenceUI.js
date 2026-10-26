import { createContext, useContext } from "react";

// The reference UI's context (see ReferenceUIProvider), kept apart from the
// provider so chips, dialogs and the editor can all use it without importing
// each other.

export const ReferenceUIContext = createContext(null);

// Outside a provider (previews, the gallery) chips still render; they just
// can't open anything.
const INERT = {
	editable: false,
	picking: false,
	openInfo: () => {},
	openEditor: () => {},
	goToSource: () => {},
	startPick: () => {},
	stopPick: () => {},
	openOptionsEditor: () => {},
	openRulesEditor: () => {},
};

export function useReferenceUI() {
	return useContext(ReferenceUIContext) || INERT;
}

// Where the caret last was in each text piece (counting a chip as one
// character), so "Add reference…" can insert a chip there even though
// opening the menu moved focus away.
const caretPositions = new Map();

export function rememberCaret(pieceId, offset) {
	caretPositions.set(pieceId, offset);
}

export function caretFor(pieceId) {
	return caretPositions.has(pieceId) ? caretPositions.get(pieceId) : null;
}
