// Data model for the Character Sheet tool.
//
// Concept hierarchy:
//   Sheet -> Pages (layout only) + Cards (data)
//   Card  -> Modules -> Module Pieces (variable | checkbox | text | button | dropdown)
//
// Card data (module pieces + their values) is a single source of truth stored once
// in sheet.cards. Pages only store cardLayouts — which cards appear on that page and
// in what per-page module order — so the same card can live on multiple pages with
// different arrangements but shared values.

import { ref } from "./formula.js";

// Matches the id style used elsewhere on the site (see spellbook ids in SpellSearchPage).
export function makeId(prefix) {
	return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ---------- Module Pieces ----------

export function createVariablePiece({ label = "", value = 0, formula = null } = {}) {
	// A variable holds either a literal number (value) or a formula string
	// referencing other pieces as #{pieceId}. When formula is set, value is ignored.
	return { id: makeId("piece"), kind: "variable", label, value, formula };
}

export function createCheckboxPiece({ label = "", value = false } = {}) {
	return { id: makeId("piece"), kind: "checkbox", label, value };
}

export function createTextPiece({ label = "", text = "", segments = null, numberLocked = false } = {}) {
	// Text is stored as an array of segments so live references can sit inside it:
	//   { type: "text", value: "plus your " } | { type: "ref", pieceId: "piece-..." }
	return {
		id: makeId("piece"),
		kind: "text",
		label,
		segments: segments || [{ type: "text", value: text }],
		numberLocked,
	};
}

export function createButtonPiece({ label = "", actions = [] } = {}) {
	// Each action adjusts one writable (formula-less) variable:
	//   { targetPieceId, op: "add" | "subtract" | "set",
	//     operandPieceId? | amount?, min? | minPieceId?, max? | maxPieceId? }
	return { id: makeId("piece"), kind: "button", label, actions };
}

export function createDropdownPiece({ label = "", options = [], selectedIndex = null } = {}) {
	return {
		id: makeId("piece"),
		kind: "dropdown",
		label,
		options,
		selectedIndex: selectedIndex ?? (options.length ? 0 : null),
	};
}

// ---------- Modules ----------

export function createModule({ type, label = "", pieces = [] }) {
	const module = { id: makeId("module"), type, label, pieces: {}, pieceOrder: [] };
	for (const piece of pieces) {
		module.pieces[piece.id] = piece;
		module.pieceOrder.push(piece.id);
	}
	return module;
}

// Standard 5e ability modifier: floor((score - 10) / 2), kept live via formula.
export function createAbilityScoreModule(label, score = 10) {
	const scorePiece = createVariablePiece({ label: "Score", value: score });
	const bonusPiece = createVariablePiece({
		label: "Bonus",
		formula: `floor((${ref(scorePiece.id)} - 10) / 2)`,
	});
	return createModule({ type: "abilityScore", label, pieces: [scorePiece, bonusPiece] });
}

export function createNumberModule(label, value = 0) {
	return createModule({ type: "number", label, pieces: [createVariablePiece({ label, value })] });
}

export function createTextModule(label, { text = "", segments = null, numberLocked = false } = {}) {
	return createModule({
		type: "text",
		label,
		pieces: [createTextPiece({ label, text, segments, numberLocked })],
	});
}

export function createDropdownModule(label, options = []) {
	return createModule({ type: "dropdown", label, pieces: [createDropdownPiece({ label, options })] });
}

export function createCheckboxModule(label, value = false) {
	return createModule({ type: "checkbox", label, pieces: [createCheckboxPiece({ label, value })] });
}

// One saving throw: proficiency checkbox + calculated bonus + label text.
// When the matching ability's Bonus piece id is provided, the save bonus stays live:
// checkbox references coerce to 0/1 in formulas, so proficiency is simply
// "+ (checkbox * proficiencyBonus)" — no conditional syntax needed.
export function createSavingThrowModule(label, { abilityBonusPieceId = null, proficiencyBonus = 2 } = {}) {
	const proficiencyPiece = createCheckboxPiece({ label: "Proficient" });
	const bonusPiece = createVariablePiece({
		label: "Save Bonus",
		value: 0,
		formula: abilityBonusPieceId
			? `${ref(abilityBonusPieceId)} + (${ref(proficiencyPiece.id)} * ${proficiencyBonus})`
			: null,
	});
	const labelPiece = createTextPiece({ label: "Label", text: label });
	return createModule({
		type: "savingThrow",
		label,
		pieces: [proficiencyPiece, bonusPiece, labelPiece],
	});
}

// Builds a module for the Custom Card flow. Returns null for types that are
// visible in the picker but not buildable yet ("coming soon").
export function createModuleForType(typeId, config = {}) {
	switch (typeId) {
		case "abilityScore":
			return createAbilityScoreModule(config.label || "New Stat", config.score ?? 10);
		case "number":
			return createNumberModule(config.label || "Number", config.value ?? 0);
		case "text":
			return createTextModule(config.label || "Description", config);
		case "dropdown":
			return createDropdownModule(config.label || "Drop Down", config.options || []);
		case "checkbox":
			return createCheckboxModule(config.label || "Checkbox", config.value ?? false);
		default:
			return null;
	}
}

// ---------- Cards ----------

export function createCard({ type, title, modules = [] }) {
	const card = { id: makeId("card"), type, title, modules: {}, moduleOrder: [] };
	for (const module of modules) {
		card.modules[module.id] = module;
		card.moduleOrder.push(module.id);
	}
	return card;
}

export const ABILITY_NAMES = ["Strength", "Dexterity", "Constitution", "Intelligence", "Wisdom", "Charisma"];

export function createAbilityScoresCard() {
	return createCard({
		type: "abilityScores",
		title: "Ability Scores",
		modules: ABILITY_NAMES.map((name) => createAbilityScoreModule(name)),
	});
}

// Maps ability name (lowercased) -> the Bonus piece id of that ability's module,
// used to wire Saving Throws (and later Skills, etc.) to an Ability Scores card.
export function getAbilityBonusPieceIds(abilityScoresCard) {
	const bonusIds = {};
	for (const moduleId of abilityScoresCard.moduleOrder) {
		const module = abilityScoresCard.modules[moduleId];
		if (module && module.type === "abilityScore") {
			bonusIds[module.label.toLowerCase()] = module.pieceOrder[1];
		}
	}
	return bonusIds;
}

// abilityBonusPieceIds: { strength: pieceId, ... } (see getAbilityBonusPieceIds).
// Missing abilities fall back to an unwired save bonus of 0.
export function createSavingThrowsCard({ abilityBonusPieceIds = {}, proficiencyBonus = 2 } = {}) {
	return createCard({
		type: "savingThrows",
		title: "Saving Throws",
		modules: ABILITY_NAMES.map((name) =>
			createSavingThrowModule(name, {
				abilityBonusPieceId: abilityBonusPieceIds[name.toLowerCase()] || null,
				proficiencyBonus,
			})
		),
	});
}

export function createHealthCard() {
	const currentHpModule = createNumberModule("Current HP", 10);
	const maxHpModule = createNumberModule("Max HP", 10);
	const tempHpModule = createTextModule("Temp HP", { text: "0", numberLocked: true });
	const currentHpPieceId = currentHpModule.pieceOrder[0];
	const maxHpPieceId = maxHpModule.pieceOrder[0];

	const amountPiece = createTextPiece({ label: "Amount", text: "", numberLocked: true });
	const damageButton = createButtonPiece({
		label: "Damage",
		actions: [{ targetPieceId: currentHpPieceId, op: "subtract", operandPieceId: amountPiece.id, min: 0 }],
	});
	const healButton = createButtonPiece({
		label: "Heal",
		actions: [{ targetPieceId: currentHpPieceId, op: "add", operandPieceId: amountPiece.id, maxPieceId: maxHpPieceId }],
	});
	const damageHealModule = createModule({
		type: "damageHeal",
		label: "Damage/Heal",
		pieces: [amountPiece, damageButton, healButton],
	});

	return createCard({
		type: "health",
		title: "Health",
		modules: [currentHpModule, maxHpModule, tempHpModule, damageHealModule],
	});
}

export function createCustomCard(title) {
	return createCard({ type: "custom", title: title || "Unnamed", modules: [] });
}

// ---------- Pages and Sheets ----------

// A layout entry places an existing card on a page. moduleOrder is this page's own
// arrangement of the card's modules; removing a module here never deletes its data.
export function createCardLayout(card, moduleOrder = null) {
	return { id: makeId("layout"), cardId: card.id, moduleOrder: [...(moduleOrder || card.moduleOrder)] };
}

export function createPage(name) {
	return { id: makeId("page"), name, cardLayouts: [] };
}

export function createSheet(name = "New Character") {
	const firstPage = createPage("Page 1");
	return {
		version: 1,
		id: makeId("sheet"),
		name,
		activePageId: firstPage.id,
		pages: [firstPage],
		cards: {},
	};
}

// ---------- Picker options ----------

// Card types shown in the New Card modal. Unavailable types render disabled
// ("coming soon") so the full intended list stays visible.
export const CARD_TYPE_OPTIONS = [
	{ id: "custom", label: "(Custom)", available: true },
	{ id: "insertExisting", label: "[Insert from another Page]", available: true },
	{ id: "abilityScores", label: "Ability Scores", available: true },
	{ id: "experienceLevel", label: "Experience/Level Tracking", available: false },
	{ id: "health", label: "Health", available: true },
	{ id: "image", label: "Image", available: false },
	{ id: "skills", label: "Skills", available: false },
	{ id: "savingThrows", label: "Saving Throws", available: true },
	{ id: "spellSlots", label: "Spell Slots", available: false },
];

// Module types shown in the Custom Card "Add Module" picker.
export const MODULE_TYPE_OPTIONS = [
	{ id: "abilityScore", label: "Ability Score", available: true },
	{ id: "usesCounter", label: "Amount of Uses", available: false },
	{ id: "checkbox", label: "Checkbox", available: true },
	{ id: "text", label: "Description", available: true },
	{ id: "dieRoll", label: "Die Roll", available: false },
	{ id: "dropdown", label: "Drop Down List", available: true },
	{ id: "h1Subtitle", label: "H1 Subtitle", available: false },
	{ id: "h2Subtitle", label: "H2 Subtitle", available: false },
	{ id: "image", label: "Image", available: false },
	{ id: "number", label: "Number", available: true },
	{ id: "rechargeOccurrence", label: "Recharge Occurrence", available: false },
	{ id: "summary", label: "Summary", available: false },
];
