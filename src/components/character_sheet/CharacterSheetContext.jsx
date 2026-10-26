import { createContext, useContext, useEffect, useMemo, useReducer, useRef } from "react";
import { createSheet, SHEET_VERSION } from "../../utils/character_sheet/schema";
import { buildPieceIndex } from "../../utils/character_sheet/references";
import { createEngine } from "../../utils/character_sheet/engine/engine";
import { historyReducer } from "../../utils/character_sheet/sheetReducer";
import { createHistoryState } from "../../utils/character_sheet/history";
import {
	getSavedCharacterSheets,
	upsertCharacterSheet,
	discardLegacyCharacterSheets,
} from "../../utils/characterSheetStorage";

// The whole sheet lives in one reducer-managed tree (see sheetReducer.js).
// Linked values come from the reference engine, which is rebuilt alongside
// the sheet: after a typed value changes, only the values downstream of it
// are recomputed (see createEngine).

const CharacterSheetContext = createContext(null);

// A saved sheet from any other version is dropped and a fresh one started —
// none of the format changes were ever shipped, so there's nothing to
// migrate (see CHARACTER_SHEETS_STORAGE_KEY).
function loadInitialSheet() {
	discardLegacyCharacterSheets();
	const saved = getSavedCharacterSheets().find((sheet) => sheet?.version === SHEET_VERSION);
	return saved || createSheet();
}

// The engine for `sheet`, built incrementally from the previous one.
function useSheetEngine(sheet) {
	const previous = useRef(null);
	return useMemo(() => {
		previous.current = createEngine(sheet, previous.current);
		return previous.current;
	}, [sheet]);
}

export function CharacterSheetProvider({ children }) {
	const [state, dispatch] = useReducer(historyReducer, null, () => createHistoryState(loadInitialSheet()));
	const { sheet } = state;
	const canUndo = state.past.length > 0;
	const canRedo = state.future.length > 0;
	const pieceIndex = useMemo(() => buildPieceIndex(sheet), [sheet]);
	const engine = useSheetEngine(sheet);

	// Debounced autosave: every change persists to localStorage shortly after it settles.
	const saveTimer = useRef(null);
	useEffect(() => {
		clearTimeout(saveTimer.current);
		saveTimer.current = setTimeout(() => upsertCharacterSheet(sheet), 400);
		return () => clearTimeout(saveTimer.current);
	}, [sheet]);

	const value = useMemo(
		() => ({ sheet, dispatch, pieceIndex, engine, readOnly: false, canUndo, canRedo }),
		[sheet, pieceIndex, engine, canUndo, canRedo]
	);
	return <CharacterSheetContext.Provider value={value}>{children}</CharacterSheetContext.Provider>;
}

export function useCharacterSheet() {
	const context = useContext(CharacterSheetContext);
	if (!context) {
		throw new Error("useCharacterSheet must be used inside CharacterSheetProvider");
	}
	return context;
}

// Read-only context override for previews (e.g. the Custom Card builder): the
// given sheet — typically the real sheet merged with a draft card — resolves
// references normally, but dispatches are no-ops so nothing can be edited.
export function SheetPreviewProvider({ sheet, children }) {
	const pieceIndex = useMemo(() => buildPieceIndex(sheet), [sheet]);
	const engine = useSheetEngine(sheet);
	const value = useMemo(
		() => ({ sheet, dispatch: () => {}, pieceIndex, engine, readOnly: true, canUndo: false, canRedo: false }),
		[sheet, pieceIndex, engine]
	);
	return <CharacterSheetContext.Provider value={value}>{children}</CharacterSheetContext.Provider>;
}
