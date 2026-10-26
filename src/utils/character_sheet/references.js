// Sheet-level questions about references: a lookup index over every piece,
// and — for the delete guard — what would break if something were deleted,
// plus remembering the last value of everything that did.
//
// Values themselves come from the engine (see engine/engine.js).

import { createEngine, resolveRoles, moduleReferences } from "./engine/engine.js";
import { collectSources } from "./engine/expression.js";
import { describeLocation } from "./engine/describe.js";

const BUTTON_REF_KEYS = ["targetPieceId", "operandPieceId", "minPieceId", "maxPieceId"];

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

// ---------- What a deletion removes ----------

// The pieces and modules a deletion would take with it. `cardIds` go whole;
// `modules` are { cardId, moduleId }; `pieceIds` are single pieces (a list
// row); `pageId` is every card shown only on that page.
export function removalOf(sheet, { cardIds = [], modules = [], pieceIds = [], pageId = null }) {
	const removal = { cardIds: new Set(cardIds), pieces: new Set(pieceIds), modules: new Set() };
	if (pageId) {
		const page = sheet.pages.find((each) => each.id === pageId);
		for (const layout of page?.cardLayouts || []) {
			const elsewhere = sheet.pages.some((other) => other.id !== pageId && other.cardLayouts.some((each) => each.cardId === layout.cardId));
			if (!elsewhere) {
				removal.cardIds.add(layout.cardId);
			}
		}
	}
	const addModule = (module) => {
		removal.modules.add(module.id);
		Object.keys(module.pieces).forEach((pieceId) => removal.pieces.add(pieceId));
	};
	for (const cardId of removal.cardIds) {
		Object.values(sheet.cards[cardId]?.modules || {}).forEach(addModule);
	}
	for (const { cardId, moduleId } of modules) {
		const module = sheet.cards[cardId]?.modules[moduleId];
		if (module) {
			addModule(module);
		}
	}
	return removal;
}

// Every reference, rule and button outside a removal that reads something
// inside it and would be left without a source. A role-based reference only
// counts when no other piece would take over the role.
// Returns [{ kind: "value" | "chip" | "option" | "capacity" | "rule" | "button",
//            node?, cardId, moduleId, pieceId, refId?, ruleId? }].
export function getDependents(sheet, removal) {
	const rolesNow = resolveRoles(sheet);
	const rolesAfter = resolveRoles(sheet, { exclude: removal.pieces });
	const breaks = (src) => {
		if (src.piece) {
			return removal.pieces.has(src.piece);
		}
		if (src.role) {
			const holder = rolesNow.get(src.role);
			return Boolean(holder) && removal.pieces.has(holder) && !rolesAfter.has(src.role);
		}
		if (src.module) {
			return removal.modules.has(src.module);
		}
		return false;
	};

	const dependents = [];
	for (const card of Object.values(sheet.cards)) {
		for (const moduleId of card.moduleOrder) {
			const module = card.modules[moduleId];
			if (!module || removal.modules.has(module.id)) {
				continue;
			}
			const base = { cardId: card.id, moduleId: module.id };
			for (const holder of moduleReferences(module)) {
				if (holder.ref.unlinked || removal.pieces.has(holder.pieceId)) {
					continue;
				}
				if (collectSources(holder.ref.expr).some(breaks)) {
					dependents.push({ ...base, kind: holder.kind, node: holder.node, pieceId: holder.pieceId ?? null, refId: holder.ref.id });
				}
			}
			for (const rule of module.rules || []) {
				if ([...collectSources(rule.left), ...collectSources(rule.right)].some(breaks)) {
					dependents.push({ ...base, kind: "rule", pieceId: null, ruleId: rule.id });
				}
			}
			for (const pieceId of module.pieceOrder) {
				const piece = module.pieces[pieceId];
				if (piece?.kind !== "button" || removal.pieces.has(pieceId)) {
					continue;
				}
				if (piece.actions.some((action) => BUTTON_REF_KEYS.some((key) => action[key] && removal.pieces.has(action[key])))) {
					dependents.push({ ...base, kind: "button", pieceId });
				}
			}
		}
	}
	return dependents;
}

const KIND_WORDS = { value: "", chip: "chip", option: "dropdown option", capacity: "box count", rule: "rule", button: "button" };

// Dependents with where they live in words — what the delete dialog lists:
// adds { name, cardTitle, pageId, pageName, path, label }.
export function describeDependents(sheet, dependents, engine = createEngine(sheet)) {
	return dependents.map((dependent) => {
		const location = describeLocation(engine, { pieceId: dependent.pieceId, moduleId: dependent.moduleId });
		const what = KIND_WORDS[dependent.kind];
		return { ...dependent, ...location, label: what ? `${location.path} (${what})` : location.path };
	});
}

// { ok, dependents } for deleting `spec` (see removalOf). `dependents` are
// described, ready for the dialog.
export function checkDeletion(sheet, spec) {
	const dependents = getDependents(sheet, removalOf(sheet, spec));
	return { ok: dependents.length === 0, dependents: describeDependents(sheet, dependents) };
}

export function canDeleteCard(sheet, cardId) {
	return checkDeletion(sheet, { cardIds: [cardId] });
}

export function canDeleteModule(sheet, cardId, moduleId) {
	return checkDeletion(sheet, { modules: [{ cardId, moduleId }] });
}

export function canDeletePage(sheet, pageId) {
	return checkDeletion(sheet, { pageId });
}

// ---------- Delete anyway ----------

function replaceRef(holderRef, dependent, update) {
	return holderRef && holderRef.id === dependent.refId ? update(holderRef) : holderRef;
}

// Before a deletion goes through anyway, every reference it breaks keeps the
// value it shows right now (`lastKnown`), so the field reads its last known
// value — flagged as missing — instead of going blank.
export function captureLastKnown(sheet, dependents) {
	const withRef = dependents.filter((dependent) => dependent.refId);
	if (!withRef.length) {
		return sheet;
	}
	const engine = createEngine(sheet);
	let next = sheet;
	for (const dependent of withRef) {
		const lastKnown = { value: engine.values.get(dependent.node)?.value ?? null };
		const remember = (ref) => ({ ...ref, lastKnown });
		const card = next.cards[dependent.cardId];
		const module = card?.modules[dependent.moduleId];
		if (!module) {
			continue;
		}
		let nextModule = module;
		if (dependent.kind === "capacity") {
			nextModule = { ...module, capacity: replaceRef(module.capacity, dependent, remember) };
		} else {
			const piece = module.pieces[dependent.pieceId];
			let nextPiece = piece;
			if (dependent.kind === "value") {
				nextPiece = { ...piece, ref: replaceRef(piece.ref, dependent, remember) };
			} else if (dependent.kind === "chip") {
				nextPiece = {
					...piece,
					segments: piece.segments.map((segment) =>
						segment.type === "chip" ? { ...segment, ref: replaceRef(segment.ref, dependent, remember) } : segment
					),
				};
			} else if (dependent.kind === "option") {
				nextPiece = { ...piece, options: piece.options.map((option) => ({ ...option, ref: replaceRef(option.ref, dependent, remember) })) };
			}
			nextModule = { ...module, pieces: { ...module.pieces, [piece.id]: nextPiece } };
		}
		next = {
			...next,
			cards: { ...next.cards, [card.id]: { ...card, modules: { ...card.modules, [module.id]: nextModule } } },
		};
	}
	return next;
}
