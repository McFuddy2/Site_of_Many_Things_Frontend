// Undo/redo for the sheet's layout, structure, colours and references.
//
// Each tracked action (see HISTORY_ACTIONS) records the sheet as it was just
// before, so one drag, one resize, one paint click is one step. Values the
// player types (HP, checkboxes, notes…) are deliberately *not* tracked —
// inside a field the browser's own text undo handles them — and undoing a
// layout step never rolls them back: the snapshot being restored takes on
// the live value of every piece that still exists (see mergeLiveValues).

export const HISTORY_LIMIT = 100;

export const HISTORY_ACTIONS = new Set([
	"addPage",
	"setPageName",
	"setPageColor",
	"setCardTitle",
	"setCardHeaderColor",
	"setModuleColor",
	"setItemsColor",
	"addModuleToCard",
	"duplicateCards",
	"duplicateModules",
	"addCardToPage",
	"insertExistingCard",
	"removeCardFromPage",
	"deleteCard",
	"deleteLayouts",
	"deleteModules",
	"addModuleRow",
	"removeModuleRow",
	"setPageArrangement",
	"applyPageLayout",
	"setReference",
	"insertChip",
	"unlinkReference",
	"removeReference",
	"setDropdownOptions",
	"setModuleRules",
]);

// The fields that hold what the player entered, per piece kind. (Text is
// special-cased below: its segments hold typed text *and* chips.)
const VALUE_FIELDS = {
	variable: ["value"],
	checkbox: ["value"],
	tristate: ["value"],
	dropdown: ["selectedOptionId"],
	image: ["src"],
};

const chipIds = (segments) => segments.filter((segment) => segment.type === "chip").map((segment) => segment.ref?.id);

// A restored piece with the player's live value. Two references-related
// twists:
//   - text: the live segments are kept (typing isn't undone) unless the step
//     being undone added or removed a chip — then the snapshot's segments
//     win, so the chip really comes back or goes away. Either way each chip
//     keeps the snapshot's reference (an edit to it is what's undone).
//   - a pending number the player typed over (unlinked "typed") stays
//     unlinked, like the value they typed; only an explicit Unlink is undone.
function withLiveValue(piece, livePiece) {
	if (piece.kind === "text") {
		const target = chipIds(piece.segments);
		const live = chipIds(livePiece.segments);
		if (target.length !== live.length || target.some((id, index) => id !== live[index])) {
			return piece;
		}
		const refs = new Map(piece.segments.filter((segment) => segment.type === "chip").map((segment) => [segment.ref?.id, segment.ref]));
		return {
			...piece,
			segments: livePiece.segments.map((segment) => (segment.type === "chip" ? { ...segment, ref: refs.get(segment.ref?.id) } : segment)),
		};
	}
	const values = {};
	for (const field of VALUE_FIELDS[piece.kind] || []) {
		values[field] = livePiece[field];
	}
	const next = { ...piece, ...values };
	if (piece.kind === "variable" && livePiece.ref?.unlinked === "typed" && piece.ref && piece.ref.id === livePiece.ref.id) {
		next.ref = { ...piece.ref, unlinked: "typed" };
	}
	return next;
}

// `target` (a snapshot being restored) with the current value of every piece
// that exists in both. Stays on the page the player is looking at, unless the
// restored step changed a different page (then shows that one) or the page
// no longer exists.
export function mergeLiveValues(target, current) {
	const live = new Map();
	const liveModules = new Map();
	for (const card of Object.values(current.cards)) {
		for (const module of Object.values(card.modules)) {
			liveModules.set(module.id, module);
			for (const piece of Object.values(module.pieces)) {
				live.set(piece.id, piece);
			}
		}
	}

	const cards = {};
	for (const [cardId, card] of Object.entries(target.cards)) {
		let cardChanged = false;
		const modules = {};
		for (const [moduleId, module] of Object.entries(card.modules)) {
			let moduleChanged = false;
			const pieces = {};
			for (const [pieceId, piece] of Object.entries(module.pieces)) {
				const livePiece = live.get(pieceId);
				if (livePiece && livePiece !== piece && livePiece.kind === piece.kind) {
					pieces[pieceId] = withLiveValue(piece, livePiece);
					moduleChanged = true;
				} else {
					pieces[pieceId] = piece;
				}
			}
			// A checkbox group with a linked count grows by ticking boxes past
			// its end — a value change, so those boxes stay through any undo.
			let pieceOrder = module.pieceOrder;
			const liveModule = module.capacity ? liveModules.get(moduleId) : null;
			for (const pieceId of liveModule?.pieceOrder || []) {
				if (!pieces[pieceId] && liveModule.pieces[pieceId]?.kind === "checkbox") {
					pieces[pieceId] = liveModule.pieces[pieceId];
					pieceOrder = [...pieceOrder, pieceId];
					moduleChanged = true;
				}
			}
			modules[moduleId] = moduleChanged ? { ...module, pieces, pieceOrder } : module;
			cardChanged = cardChanged || moduleChanged;
		}
		cards[cardId] = cardChanged ? { ...card, modules } : card;
	}

	const currentPages = new Map(current.pages.map((page) => [page.id, page]));
	const changedPage = target.pages.find((page) => currentPages.get(page.id) !== page);
	const keepCurrent = target.pages.some((page) => page.id === current.activePageId);
	const activePageId = changedPage ? changedPage.id : keepCurrent ? current.activePageId : target.activePageId;
	return { ...target, cards, activePageId };
}

export function createHistoryState(sheet) {
	return { sheet, past: [], future: [] };
}

// Wraps a sheet reducer with undo/redo: state is { sheet, past, future }.
export function withHistory(reducer) {
	return (state, action) => {
		if (action.type === "undo") {
			if (!state.past.length) {
				return state;
			}
			const target = state.past[state.past.length - 1];
			return {
				sheet: mergeLiveValues(target, state.sheet),
				past: state.past.slice(0, -1),
				future: [state.sheet, ...state.future],
			};
		}
		if (action.type === "redo") {
			if (!state.future.length) {
				return state;
			}
			const [target, ...rest] = state.future;
			return {
				sheet: mergeLiveValues(target, state.sheet),
				past: [...state.past, state.sheet],
				future: rest,
			};
		}
		const next = reducer(state.sheet, action);
		if (next === state.sheet) {
			return state;
		}
		if (HISTORY_ACTIONS.has(action.type)) {
			return { sheet: next, past: [...state.past, state.sheet].slice(-HISTORY_LIMIT), future: [] };
		}
		return { ...state, sheet: next };
	};
}
