import { useCallback } from "react";
import { readPieceValue } from "../../utils/character_sheet/values";
import { useCharacterSheet } from "./CharacterSheetContext";

// A piece's value plus a setter, by id — the only way module views read or
// write values (see values.js for why).
export default function usePieceValue(pieceId) {
	const { pieceIndex, dispatch } = useCharacterSheet();
	const read = readPieceValue(pieceIndex, pieceId);
	const set = useCallback((value) => dispatch({ type: "setPieceValue", pieceId, value }), [dispatch, pieceId]);
	return { ...read, set };
}
