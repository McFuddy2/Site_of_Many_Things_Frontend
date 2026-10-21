import { createContext, useContext, useEffect, useMemo, useReducer, useRef } from "react";
import { createSheet, SHEET_VERSION } from "../../utils/character_sheet/schema";
import { buildPieceIndex } from "../../utils/character_sheet/references";
import {
	addPage,
	setActivePage,
	setPageName,
	setPageColor,
	addCardToPage,
	insertExistingCardOnPage,
	removeCardFromPage,
	deleteCard,
	setCardTitle,
	setCardHeaderColor,
	setModuleColor,
	setCardModulesColor,
	setPieceValue,
	addModuleRow,
	removeModuleRow,
	pressButton,
	setLayoutModuleOrder,
	setCardLayoutArrangement,
	setPageArrangement,
} from "../../utils/character_sheet/sheetOps";
import {
	getSavedCharacterSheets,
	upsertCharacterSheet,
	discardLegacyCharacterSheets,
} from "../../utils/characterSheetStorage";

// The whole sheet lives in one reducer-managed tree. Because cross-card references
// resolve at render time through pieceIndex, any change to a source piece
// automatically updates everything that displays it — no subscriptions needed.

const CharacterSheetContext = createContext(null);

// A saved sheet from any other version is dropped and a fresh one started —
// the format change to grid units was never shipped, so there's nothing to
// migrate (see CHARACTER_SHEETS_STORAGE_KEY).
function loadInitialSheet() {
	discardLegacyCharacterSheets();
	const saved = getSavedCharacterSheets().find((sheet) => sheet?.version === SHEET_VERSION);
	return saved || createSheet();
}

function sheetReducer(sheet, action) {
	switch (action.type) {
		case "addPage":
			return addPage(sheet);
		case "setActivePage":
			return setActivePage(sheet, action.pageId);
		case "setPageName":
			return setPageName(sheet, action.pageId, action.name);
		case "setPageColor":
			return setPageColor(sheet, action.pageId, action.color);
		case "setCardTitle":
			return setCardTitle(sheet, action.cardId, action.title);
		case "setCardHeaderColor":
			return setCardHeaderColor(sheet, action.cardId, action.color);
		case "setModuleColor":
			return setModuleColor(sheet, action.cardId, action.moduleId, action.color);
		case "setCardModulesColor":
			return setCardModulesColor(sheet, action.cardId, action.color);
		case "addCardToPage":
			return addCardToPage(sheet, action.pageId, action.card, { maxCols: action.maxCols });
		case "insertExistingCard":
			return insertExistingCardOnPage(sheet, action.pageId, action.cardId, { maxCols: action.maxCols });
		case "removeCardFromPage":
			return removeCardFromPage(sheet, action.pageId, action.layoutId);
		case "deleteCard": {
			// The UI checks canDeleteCard before dispatching this, so ok should
			// always be true here — this is just a safety net against stale state.
			const result = deleteCard(sheet, action.cardId);
			return result.ok ? result.sheet : sheet;
		}
		case "setPieceValue":
			return setPieceValue(sheet, action.pieceId, action.value);
		case "addModuleRow":
			return addModuleRow(sheet, action.cardId, action.moduleId);
		case "removeModuleRow":
			return removeModuleRow(sheet, action.cardId, action.moduleId, action.rowIndex);
		case "pressButton":
			return pressButton(sheet, action.pieceId);
		case "setLayoutModuleOrder":
			return setLayoutModuleOrder(sheet, action.pageId, action.layoutId, action.moduleOrder);
		case "setCardArrangement":
			return setCardLayoutArrangement(sheet, action.pageId, action.layoutId, {
				moduleOrder: action.moduleOrder,
				moduleRects: action.moduleRects,
				cardRect: action.cardRect,
			});
		case "setPageArrangement":
			return setPageArrangement(sheet, action.pageId, { rects: action.rects });
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

	const value = useMemo(() => ({ sheet, dispatch, pieceIndex, readOnly: false }), [sheet, pieceIndex]);
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
	const value = useMemo(() => ({ sheet, dispatch: () => {}, pieceIndex, readOnly: true }), [sheet, pieceIndex]);
	return <CharacterSheetContext.Provider value={value}>{children}</CharacterSheetContext.Provider>;
}
