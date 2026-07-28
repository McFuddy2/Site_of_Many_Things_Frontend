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

// An image is held as a src string — either a pasted URL or a data: URI from a
// local file pick. It has no numeric or text value, so it can never be
// referenced by another card (see getPieceDisplayValue in references.js).
export function createImagePiece({ label = "", src = "", alt = "" } = {}) {
	return { id: makeId("piece"), kind: "image", label, src, alt };
}

// ---------- Modules ----------

// Options beyond type/label/pieces (ability, tone, suffix, signed, columns…) are
// carried through onto the module itself — they're presentation hints the module's
// view reads (see CharacterSheetCard.jsx), not data the reference engine touches.
export function createModule({ type, label = "", pieces = [], ...options }) {
	const module = { id: makeId("module"), type, label, ...options, pieces: {}, pieceOrder: [] };
	for (const piece of pieces) {
		module.pieces[piece.id] = piece;
		module.pieceOrder.push(piece.id);
	}
	return module;
}

// Standard 5e ability modifier: floor((score - 10) / 2), kept live via formula.
// `ability` tints the tile with that ability's own colour (see the --cs-ability-*
// palette in CharacterSheetStyles.css); the six standard abilities each have one,
// and a made-up ability (the mockup's "Sanity") just falls back to the neutral tint.
export function createAbilityScoreModule(label, score = 10) {
	const scorePiece = createVariablePiece({ label: "Score", value: score });
	const bonusPiece = createVariablePiece({
		label: "Bonus",
		formula: `floor((${ref(scorePiece.id)} - 10) / 2)`,
	});
	return createModule({
		type: "abilityScore",
		label,
		ability: label.toLowerCase(),
		pieces: [scorePiece, bonusPiece],
	});
}

// `suffix` renders after the value ("30" + "ft"); `signed` forces a leading +
// on non-negative values (bonuses read "+3", not "3").
export function createNumberModule(label, value = 0, { suffix = "", signed = false } = {}) {
	return createModule({
		type: "number",
		label,
		suffix,
		signed,
		pieces: [createVariablePiece({ label, value })],
	});
}

// A number with no inner label — the card's own title is the label (Armor Class,
// Initiative, Proficiency Bonus), so the module is nothing but the value.
export function createBigNumberModule(label, value = 0, { signed = false } = {}) {
	return createModule({ type: "bigNumber", label, signed, pieces: [createVariablePiece({ label, value })] });
}

// The Character Name card's one module: a single oversized text field.
export function createBigTextModule(label, text = "") {
	return createModule({ type: "bigText", label, pieces: [createTextPiece({ label, text })] });
}

// A multi-line text field under its own header bar — Personality Traits, Backstory,
// Notes, and every other "write a paragraph here" module.
export function createTextAreaModule(label, text = "") {
	return createModule({ type: "textArea", label, pieces: [createTextPiece({ label, text })] });
}

// The grey column-header strip above a stack of skill/save rows ("Proficient? |
// Modifier | Stat"). Labels are text pieces so they stay editable/renameable.
export function createColumnHeaderModule(labels = []) {
	return createModule({
		type: "columnHeader",
		label: labels.join(" / "),
		pieces: labels.map((text) => createTextPiece({ label: text, text })),
	});
}

// Passive score row: the value, then what it's the passive score of.
export function createPassiveSkillModule(label, { value = 10, text = "" } = {}) {
	return createModule({
		type: "passiveSkill",
		label,
		pieces: [createVariablePiece({ label, value }), createTextPiece({ label: "Name", text: text || label })],
	});
}

// A stack of free text lines that the user can grow or shrink (Proficiencies and
// Languages). Rows are plain text pieces, so addModuleRow/removeModuleRow in
// sheetOps handles both this and itemList without either needing its own op.
export function createListTextModule(label, items = []) {
	return createModule({
		type: "listText",
		label,
		pieces: items.map((text) => createTextPiece({ label: "Item", text })),
	});
}

// Equipment/Treasure: name + quantity per row, so rows come in pairs and
// addModuleRow appends two pieces at a time (see rowSize in sheetOps).
export function createItemListModule(label, items = []) {
	const pieces = [];
	for (const item of items) {
		pieces.push(createTextPiece({ label: "Item Name", text: item.name ?? "" }));
		pieces.push(createTextPiece({ label: "Qty", text: String(item.qty ?? ""), numberLocked: true }));
	}
	return createModule({ type: "itemList", label, pieces });
}

// A labelled row of checkboxes — hit dice spent, death save successes/failures,
// an item's charges, a feature's uses. `tone` picks the row's tint
// (success | danger | neutral).
export function createCheckboxRowModule(label, count = 3, { tone = "neutral" } = {}) {
	return createModule({
		type: "checkboxRow",
		label,
		tone,
		pieces: Array.from({ length: count }, (unused, index) =>
			createCheckboxPiece({ label: `${label} ${index + 1}` })
		),
	});
}

export function createImageModule(label, src = "") {
	return createModule({ type: "image", label, pieces: [createImagePiece({ label, src, alt: label })] });
}

// Currency: the four coin quantities plus a live total converted to gold
// (100cp = 10sp = 1gp, 1pp = 10gp — electrum is deliberately left out, matching
// the module list in the spec).
export function createCurrencyModule(label = "Currency") {
	const platinum = createTextPiece({ label: "Platinum Pieces (PP)", text: "0", numberLocked: true });
	const gold = createTextPiece({ label: "Gold Pieces (GP)", text: "0", numberLocked: true });
	const silver = createTextPiece({ label: "Silver Pieces (SP)", text: "0", numberLocked: true });
	const copper = createTextPiece({ label: "Copper Pieces (CP)", text: "0", numberLocked: true });
	const total = createVariablePiece({
		label: "Total Converted to GP",
		formula: `${ref(platinum.id)} * 10 + ${ref(gold.id)} + ${ref(silver.id)} / 10 + ${ref(copper.id)} / 100`,
	});
	return createModule({ type: "currency", label, pieces: [total, platinum, gold, silver, copper] });
}

// One spell's block: name, the five stat columns, then the description.
export function createSpellEntryModule(name = "", details = {}) {
	return createModule({
		type: "spellEntry",
		label: name || "Spell",
		pieces: [
			createTextPiece({ label: "Name", text: name }),
			createTextPiece({ label: "Level", text: details.level ?? "" }),
			createTextPiece({ label: "Casting Time", text: details.castingTime ?? "" }),
			createTextPiece({ label: "School", text: details.school ?? "" }),
			createTextPiece({ label: "Source", text: details.source ?? "" }),
			createTextPiece({ label: "Classes", text: details.classes ?? "" }),
			createTextPiece({ label: "Description", text: details.description ?? "" }),
		],
	});
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
		ability: label.toLowerCase(),
		pieces: [proficiencyPiece, bonusPiece, labelPiece],
	});
}

// Which ability governs each of the 18 standard skills — drives both the skill's
// live modifier (it references that ability's Bonus) and the row's colour tint.
export const SKILL_ABILITIES = {
	Acrobatics: "dexterity",
	"Animal Handling": "wisdom",
	Arcana: "intelligence",
	Athletics: "strength",
	Deception: "charisma",
	History: "intelligence",
	Insight: "wisdom",
	Intimidation: "charisma",
	Investigation: "intelligence",
	Medicine: "wisdom",
	Nature: "intelligence",
	Perception: "wisdom",
	Performance: "charisma",
	Persuasion: "charisma",
	Religion: "intelligence",
	"Sleight of Hand": "dexterity",
	Stealth: "dexterity",
	Survival: "wisdom",
};

export const SKILL_NAMES = Object.keys(SKILL_ABILITIES);

// Structurally a saving throw (proficiency checkbox + live modifier + name), but
// its own type so the two read as different things in the module picker and can
// diverge later (expertise, half-proficiency…).
export function createSkillModule(label, { ability = null, abilityBonusPieceId = null, proficiencyBonus = 2 } = {}) {
	const proficiencyPiece = createCheckboxPiece({ label: "Proficient" });
	const bonusPiece = createVariablePiece({
		label: "Modifier",
		value: 0,
		formula: abilityBonusPieceId
			? `${ref(abilityBonusPieceId)} + (${ref(proficiencyPiece.id)} * ${proficiencyBonus})`
			: null,
	});
	const labelPiece = createTextPiece({ label: "Label", text: label });
	return createModule({
		type: "skill",
		label,
		ability: ability || SKILL_ABILITIES[label] || null,
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
			return createNumberModule(config.label || "Number", config.value ?? 0, config);
		case "bigNumber":
			return createBigNumberModule(config.label || "Value", config.value ?? 0, config);
		case "text":
			return createTextModule(config.label || "Description", config);
		case "bigText":
			return createBigTextModule(config.label || "Name", config.text ?? "");
		case "textArea":
			return createTextAreaModule(config.label || "Notes", config.text ?? "");
		case "dropdown":
			return createDropdownModule(config.label || "Drop Down", config.options || []);
		case "checkbox":
			return createCheckboxModule(config.label || "Checkbox", config.value ?? false);
		case "checkboxRow":
			return createCheckboxRowModule(config.label || "Uses", config.count ?? 3, config);
		case "skill":
			return createSkillModule(config.label || "Skill", config);
		case "passiveSkill":
			return createPassiveSkillModule(config.label || "Passive Skill", config);
		case "columnHeader":
			return createColumnHeaderModule(config.labels || ["Proficient?", "Modifier", "Stat"]);
		case "listText":
			return createListTextModule(config.label || "List", config.items || ["", "", ""]);
		case "itemList":
			return createItemListModule(config.label || "Items", config.items || [{ name: "", qty: "1" }]);
		case "image":
			return createImageModule(config.label || "Image", config.src ?? "");
		case "currency":
			return createCurrencyModule(config.label || "Currency");
		case "spellEntry":
			return createSpellEntryModule(config.label || "", config);
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

// ---------- Standard cards ----------
//
// Each builder below mirrors one card in the "Character Sheet Cards" spec: the
// same modules, in the same reading order, built out of the shared module types
// above rather than one bespoke type per card. The order they're listed in is
// the order they pack into a fresh card (see packModuleRects in sheetOps.js), so
// it doubles as the default layout.

export function createCharacterNameCard() {
	return createCard({
		type: "characterName",
		title: "Character Name",
		modules: [createBigTextModule("Name", "")],
	});
}

export function createBasicInfoCard() {
	return createCard({
		type: "basicInfo",
		title: "Basic Information",
		modules: [
			createTextModule("Class"),
			createNumberModule("Lvl", 1),
			createTextModule("Background"),
			createTextModule("Player Name"),
			createTextModule("Race"),
			createTextModule("Alignment"),
			createNumberModule("Experience", 0),
		],
	});
}

export function createInspirationCard() {
	return createCard({
		type: "inspiration",
		title: "Inspiration",
		modules: [createCheckboxModule("")],
	});
}

export function createProficiencyBonusCard(value = 2) {
	return createCard({
		type: "proficiencyBonus",
		title: "Proficiency",
		modules: [createBigNumberModule("Proficiency Bonus", value, { signed: true })],
	});
}

// abilityBonusPieceIds: { strength: pieceId, ... } (see getAbilityBonusPieceIds) —
// each skill's modifier live-references the Bonus of the ability that governs it.
export function createSkillsCard({ abilityBonusPieceIds = {}, proficiencyBonus = 2 } = {}) {
	return createCard({
		type: "skills",
		title: "Skills",
		modules: [
			createColumnHeaderModule(["Proficient?", "Modifier", "Stat"]),
			...SKILL_NAMES.map((name) =>
				createSkillModule(name, {
					abilityBonusPieceId: abilityBonusPieceIds[SKILL_ABILITIES[name]] || null,
					proficiencyBonus,
				})
			),
		],
	});
}

export function createPassiveSkillsCard() {
	return createCard({
		type: "passiveSkills",
		title: "Passive Scores",
		modules: [createPassiveSkillModule("Perception (WIS)", { value: 10, text: "Perception (WIS)" })],
	});
}

export function createProficienciesCard() {
	return createCard({
		type: "proficiencies",
		title: "Proficiencies and Languages",
		modules: [createListTextModule("Proficiencies and Languages", ["", "", "", ""])],
	});
}

export function createArmorClassCard(value = 10) {
	return createCard({
		type: "armorClass",
		title: "Armor Class",
		modules: [createBigNumberModule("Armor Class", value)],
	});
}

export function createInitiativeCard() {
	return createCard({
		type: "initiative",
		title: "Initiative",
		modules: [createBigNumberModule("Initiative", 0, { signed: true })],
	});
}

export function createMovementSpeedCard() {
	return createCard({
		type: "movementSpeed",
		title: "Movement Speed",
		modules: [
			createNumberModule("Walking Speed", 30, { suffix: "ft" }),
			createNumberModule("Swim", 0, { suffix: "ft" }),
			createNumberModule("Climb", 0, { suffix: "ft" }),
			createNumberModule("Fly", 0, { suffix: "ft" }),
		],
	});
}

export function createHitDiceCard() {
	return createCard({
		type: "hitDice",
		title: "Hit Dice",
		modules: [
			createTextModule("Dice Type", { text: "D8" }),
			createNumberModule("Total", 5),
			createCheckboxRowModule("Hit Dice Used", 5),
		],
	});
}

export function createDeathSavesCard() {
	return createCard({
		type: "deathSaves",
		title: "Death Saves",
		modules: [
			createCheckboxRowModule("Successes", 3, { tone: "success" }),
			createCheckboxRowModule("Failures", 3, { tone: "danger" }),
		],
	});
}

export function createAttackCard(title = "Attack") {
	return createCard({
		type: "attack",
		title,
		modules: [
			createBigTextModule("Name", ""),
			createTextModule("Range"),
			createNumberModule("To Hit Bonus", 0, { signed: true }),
			createTextModule("Type"),
			createTextModule("Dice"),
			createNumberModule("Dmg +", 0, { signed: true }),
			createCheckboxRowModule("Charges", 3),
			createTextAreaModule("Notes"),
		],
	});
}

export function createEquipmentCard() {
	return createCard({
		type: "equipment",
		title: "Equipment",
		modules: [createItemListModule("Item List", [{ name: "", qty: "1" }, { name: "", qty: "1" }, { name: "", qty: "1" }])],
	});
}

export function createMoneyCard() {
	return createCard({
		type: "money",
		title: "Currency",
		modules: [createCurrencyModule("Currency")],
	});
}

export function createPersonalityCard() {
	return createCard({
		type: "personality",
		title: "Personality",
		modules: [
			createTextAreaModule("Personality Traits"),
			createTextAreaModule("Ideals"),
			createTextAreaModule("Bonds"),
			createTextAreaModule("Flaws"),
		],
	});
}

// Each feature/trait is its own card (per the spec) — a description plus an
// optional row of use checkboxes, which is what the mockup's Healer's Kit shows.
export function createFeatureCard(title = "Feature/Trait") {
	return createCard({
		type: "feature",
		title,
		modules: [createTextAreaModule("Description"), createCheckboxRowModule("Uses", 10)],
	});
}

export function createBasicDescriptionsCard() {
	return createCard({
		type: "basicDescriptions",
		title: "Character Description",
		modules: [
			createTextModule("Age", { numberLocked: true }),
			createTextModule("Height"),
			createTextModule("Weight", { numberLocked: true }),
			createTextModule("Eyes"),
			createTextModule("Skin"),
			createTextModule("Hair"),
		],
	});
}

export function createAppearanceCard() {
	return createCard({
		type: "appearance",
		title: "Appearance",
		modules: [createImageModule("Portrait"), createTextAreaModule("Appearance Description")],
	});
}

export function createBackstoryCard() {
	return createCard({
		type: "backstory",
		title: "Backstory",
		modules: [createTextAreaModule("Backstory Description")],
	});
}

export function createAlliesCard() {
	return createCard({
		type: "allies",
		title: "Allies and Organizations",
		modules: [createTextAreaModule("Allies"), createTextAreaModule("Organizations")],
	});
}

export function createSymbolCard() {
	return createCard({
		type: "symbol",
		title: "Symbol",
		modules: [createImageModule("Symbol Image"), createTextAreaModule("Symbol Description")],
	});
}

export function createTreasureCard() {
	return createCard({
		type: "treasure",
		title: "Treasure",
		modules: [createItemListModule("Treasure List", [{ name: "", qty: "1" }, { name: "", qty: "1" }])],
	});
}

export function createSpellcastingStatsCard() {
	return createCard({
		type: "spellcastingStats",
		title: "Spellcasting Stats",
		modules: [
			createDropdownModule("Spell Casting Ability", ABILITY_NAMES),
			createNumberModule("Spell Attack Bonus", 0, { signed: true }),
			createNumberModule("Spell Save DC", 10),
		],
	});
}

export function createSpellListCard() {
	return createCard({
		type: "spellList",
		title: "Spell List",
		modules: [createSpellEntryModule("")],
	});
}

export function createCustomCard(title) {
	return createCard({ type: "custom", title: title || "Unnamed", modules: [] });
}

// ---------- Pages and Sheets ----------

// A layout entry places an existing card on a page. rect is this layout's own
// { x, y, width, height } (px, multiples of 5) on the page canvas. moduleOrder is
// this page's own arrangement of the card's modules (which ones are included;
// removing one here never deletes its data), each with its own rect in moduleRects.
export function createCardLayout(card, { moduleOrder = null, rect = null, moduleRects = {} } = {}) {
	return {
		id: makeId("layout"),
		cardId: card.id,
		rect,
		moduleOrder: [...(moduleOrder || card.moduleOrder)],
		moduleRects: { ...moduleRects },
	};
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
	{ id: "allies", label: "Allies and Organizations", available: true },
	{ id: "armorClass", label: "Armor Class", available: true },
	{ id: "attack", label: "Attack", available: true },
	{ id: "backstory", label: "Backstory", available: true },
	{ id: "basicDescriptions", label: "Basic Descriptions", available: true },
	{ id: "basicInfo", label: "Basic Info", available: true },
	{ id: "appearance", label: "Character Appearance", available: true },
	{ id: "characterName", label: "Character Name", available: true },
	{ id: "deathSaves", label: "Death Saves", available: true },
	{ id: "equipment", label: "Equipment", available: true },
	{ id: "feature", label: "Feature/Trait", available: true },
	{ id: "health", label: "Health", available: true },
	{ id: "hitDice", label: "Hit Dice", available: true },
	{ id: "initiative", label: "Initiative", available: true },
	{ id: "inspiration", label: "Inspiration", available: true },
	{ id: "money", label: "Money", available: true },
	{ id: "movementSpeed", label: "Movement Speed", available: true },
	{ id: "passiveSkills", label: "Passive Skills", available: true },
	{ id: "personality", label: "Personality", available: true },
	{ id: "proficiencies", label: "Proficiencies and Languages", available: true },
	{ id: "proficiencyBonus", label: "Proficiency Bonus", available: true },
	{ id: "savingThrows", label: "Saving Throws", available: true },
	{ id: "skills", label: "Skills", available: true },
	{ id: "spellcastingStats", label: "Spellcasting Stats", available: true },
	{ id: "spellList", label: "Spell List", available: true },
	{ id: "spellSlots", label: "Spell Slots", available: false },
	{ id: "symbol", label: "Symbol", available: true },
	{ id: "treasure", label: "Treasure", available: true },
];

// Module types shown in the Custom Card "Add Module" picker.
export const MODULE_TYPE_OPTIONS = [
	{ id: "abilityScore", label: "Ability Score", available: true },
	{ id: "checkboxRow", label: "Amount of Uses", available: true },
	{ id: "checkbox", label: "Checkbox", available: true },
	{ id: "columnHeader", label: "Column Headers", available: true },
	{ id: "currency", label: "Currency", available: true },
	{ id: "textArea", label: "Description", available: true },
	{ id: "dieRoll", label: "Die Roll", available: false },
	{ id: "dropdown", label: "Drop Down List", available: true },
	{ id: "bigText", label: "Heading Text", available: true },
	{ id: "image", label: "Image", available: true },
	{ id: "itemList", label: "Item List", available: true },
	{ id: "listText", label: "List of Text", available: true },
	{ id: "number", label: "Number", available: true },
	{ id: "passiveSkill", label: "Passive Skill", available: true },
	{ id: "rechargeOccurrence", label: "Recharge Occurrence", available: false },
	{ id: "skill", label: "Skill", available: true },
	{ id: "spellEntry", label: "Spell", available: true },
	{ id: "bigNumber", label: "Stat Value", available: true },
	{ id: "text", label: "Text Field", available: true },
];
