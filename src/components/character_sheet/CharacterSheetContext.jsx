import { createContext, useContext, useEffect, useMemo, useReducer, useRef } from "react";
import { createSheet } from "../../utils/character_sheet/schema";
import { buildPieceIndex } from "../../utils/character_sheet/references";
import {
	addPage,
	setActivePage,
	addCardToPage,
	insertExistingCardOnPage,
	setVariableValue,
	setCheckboxValue,
	setTextPlain,
	setDropdownSelection,
	pressButton,
	setLayoutModuleOrder,
} from "../../utils/character_sheet/sheetOps";
import { getSavedCharacterSheets, upsertCharacterSheet } from "../../utils/characterSheetStorage";

// The whole sheet lives in one reducer-managed tree. Because cross-card references
// resolve at render time through pieceIndex, any change to a source piece
// automatically updates everything that displays it — no subscriptions needed.

const CharacterSheetContext = createContext(null);

function loadInitialSheet() {
	const saved = getSavedCharacterSheets();
	return saved.length ? saved[0] : createSheet();
}

function sheetReducer(sheet, action) {
	switch (action.type) {
		case "addPage":
			return addPage(sheet);
		case "setActivePage":
			return setActivePage(sheet, action.pageId);
		case "addCardToPage":
			return addCardToPage(sheet, action.pageId, action.card);
		case "insertExistingCard":
			return insertExistingCardOnPage(sheet, action.pageId, action.cardId);
		case "setVariableValue":
			return setVariableValue(sheet, action.pieceId, action.value);
		case "setCheckboxValue":
			return setCheckboxValue(sheet, action.pieceId, action.value);
		case "setTextPlain":
			return setTextPlain(sheet, action.pieceId, action.text);
		case "setDropdownSelection":
			return setDropdownSelection(sheet, action.pieceId, action.selectedIndex);
		case "pressButton":
			return pressButton(sheet, action.pieceId);
		case "setLayoutModuleOrder":
			return setLayoutModuleOrder(sheet, action.pageId, action.layoutId, action.moduleOrder);
		default:
			return sheet;
	}
}

export function CharacterSheetProvider({ children }) {
	const [sheet, dispatch] = useReducer(sheetReducer, null, loadInitialSheet);
	const pieceIndex = useMemo(() => buildPieceIndex(sheet), [sheet]);

	// Debounced autosave: every change persists to localStorage shortly after it settles.
	const saveTimer = useRef(null);
	useEffect(() => {
		clearTimeout(saveTimer.current);
		saveTimer.current = setTimeout(() => upsertCharacterSheet(sheet), 400);
		return () => clearTimeout(saveTimer.current);
	}, [sheet]);

	const value = useMemo(() => ({ sheet, dispatch, pieceIndex }), [sheet, pieceIndex]);
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
	const value = useMemo(() => ({ sheet, dispatch: () => {}, pieceIndex }), [sheet, pieceIndex]);
	return <CharacterSheetContext.Provider value={value}>{children}</CharacterSheetContext.Provider>;
}
