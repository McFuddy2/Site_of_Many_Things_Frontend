// The sheet's reducer: one action in, one new sheet out (see sheetOps.js).
// Kept free of React so the same transitions — undo included — can be
// driven from tests and dev tools.

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
	setItemsColor,
	addModuleToCard,
	duplicateCards,
	duplicateModules,
	setPieceValue,
	addModuleRow,
	removeModuleRow,
	pressButton,
	setPageArrangement,
	applyPageLayout,
	deleteLayouts,
	deleteModules,
	setReference,
	insertChip,
	unlinkReference,
	removeReference,
	setDropdownOptions,
	setModuleRules,
	setBoxChecked,
	syncLinkedBoxCounts,
} from "./sheetOps.js";
import { withHistory } from "./history.js";

export function sheetReducer(sheet, action) {
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
			return setModuleColor(sheet, action.cardId, action.moduleId, action.color, action.part);
		case "setItemsColor":
			return setItemsColor(sheet, action.items, action.color);
		case "addModuleToCard":
			return addModuleToCard(sheet, action.cardId, action.module);
		case "duplicateCards":
			return duplicateCards(sheet, action.pageId, action.entries, { maxCols: action.maxCols });
		case "duplicateModules":
			return duplicateModules(sheet, action.cardId, action.entries);
		case "addCardToPage":
			return addCardToPage(sheet, action.pageId, action.card, { maxCols: action.maxCols });
		case "insertExistingCard":
			return insertExistingCardOnPage(sheet, action.pageId, action.cardId, { maxCols: action.maxCols });
		case "removeCardFromPage":
			return removeCardFromPage(sheet, action.pageId, action.layoutId);
		case "deleteCard": {
			// The UI checks first, so a refusal here only guards against stale state.
			const result = deleteCard(sheet, action.cardId, { force: action.force });
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
		case "setPageArrangement":
			return setPageArrangement(sheet, action.pageId, { rects: action.rects });
		case "applyPageLayout":
			return applyPageLayout(sheet, action.pageId, {
				cardRects: action.cardRects,
				moduleLayoutId: action.moduleLayoutId,
				moduleRects: action.moduleRects,
			});
		case "deleteLayouts":
			return deleteLayouts(sheet, action.pageId, action.layoutIds, { force: action.force });
		case "deleteModules":
			return deleteModules(sheet, action.cardId, action.moduleIds, { force: action.force });
		case "setReference":
			return setReference(sheet, action.target, action.expr, { nickname: action.nickname });
		case "insertChip":
			return insertChip(sheet, action.pieceId, action.expr, { offset: action.offset, nickname: action.nickname }).sheet;
		case "unlinkReference":
			return unlinkReference(sheet, action.target);
		case "removeReference":
			return removeReference(sheet, action.target);
		case "setDropdownOptions":
			return setDropdownOptions(sheet, action.pieceId, action.options);
		case "setModuleRules":
			return setModuleRules(sheet, action.moduleId, action.rules);
		case "setBoxChecked":
			return setBoxChecked(sheet, action.moduleId, action.index, action.checked);
		default:
			return sheet;
	}
}

// Layout/structure/colour/reference actions are undoable (see history.js);
// dispatch { type: "undo" } / { type: "redo" } to step through them. After
// every change — undo and redo too — linked box counts are brought up to
// date (a typed Level can add Hit Dice boxes).
const tracked = withHistory(sheetReducer);

export function historyReducer(state, action) {
	const next = tracked(state, action);
	return next.sheet === state.sheet ? next : { ...next, sheet: syncLinkedBoxCounts(next.sheet) };
}
