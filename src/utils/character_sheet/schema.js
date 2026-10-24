// Data model for the Character Sheet tool.
//
// Concept hierarchy:
//   Sheet -> Pages (layout only) + Cards (data)
//   Card  -> Modules -> Module Pieces (variable | checkbox | tristate | text | button | dropdown | image)
//
// Card data (module pieces + their values) is a single source of truth stored once
// in sheet.cards. Pages only store cardLayouts — which cards appear on that page and
// in what per-page module order — so the same card can live on multiple pages with
// different arrangements but shared values.
//
// Values can be linked: a number piece's `ref`, a chip inside a text piece, a
// dropdown option's `ref`, a checkbox group's `capacity` and a module's
// `rules` all hold reference expressions — plain data evaluated by the engine
// (see engine/). A piece's `role` ("ability.dex.bonus") is how card types'
// default references find each other across cards.

import { mapSources, fn, add, mul, div, num, pieceSrc, roleSrc } from "./engine/expression.js";

// Every card, module, piece, layout and page gets a random id that is saved
// with the sheet and never reused — references (expressions, chips, button
// actions) point at these, so they have to stay stable for the life of the
// sheet. Falls back to time + random where crypto.randomUUID isn't available
// (non-secure origins, old node).
export function makeId(prefix) {
	const random =
		typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
			? crypto.randomUUID()
			: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;
	return `${prefix}-${random}`;
}

// ---------- References ----------

// One saved reference: an expression (see engine/expression.js) and how it
// came to be.
//   origin     "default" (a card type's built-in link — may name roles) or
//              "user" (made by hand, always by piece id)
//   unlinked   false, "user" (the player unlinked it) or "typed" (they typed
//              their own value while it was still pending) — either way it
//              never auto-connects again
//   nickname   the player's own name for it, or null
//   lastKnown  { value } once a source was deleted out from under it
export function createReference(expr, { origin = "user", nickname = null } = {}) {
	return { id: makeId("ref"), expr, origin, unlinked: false, nickname, lastKnown: null };
}

// A chip inside a text piece: the reference is the chip's whole content, and
// its id names the chip.
export function createChipSegment(expr, options = {}) {
	return { type: "chip", ref: createReference(expr, options) };
}

// ---------- Module Pieces ----------

// `role` is optional and only set on pieces other cards' defaults look for.
const withRole = (role) => (role ? { role } : {});

export function createVariablePiece({ label = "", value = 0, ref = null, role = null } = {}) {
	// A number: the literal `value`, unless `ref` links it to other values.
	return { id: makeId("piece"), kind: "variable", label, value, ref, ...withRole(role) };
}

export function createCheckboxPiece({ label = "", value = false, role = null } = {}) {
	return { id: makeId("piece"), kind: "checkbox", label, value, ...withRole(role) };
}

// A three-way toggle — none (0), proficient (1), expertise (2) — that counts
// as its number in math.
export function createTristatePiece({ label = "", value = 0, role = null } = {}) {
	return { id: makeId("piece"), kind: "tristate", label, value, ...withRole(role) };
}

export function createTextPiece({ label = "", text = "", segments = null, numberLocked = false, role = null } = {}) {
	// Text is stored as an array of segments so chips can sit inside it:
	//   { type: "text", value: "plus your " } | { type: "chip", ref: { …reference } }
	return {
		id: makeId("piece"),
		kind: "text",
		label,
		segments: segments || [{ type: "text", value: text }],
		numberLocked,
		...withRole(role),
	};
}

export function createButtonPiece({ label = "", actions = [] } = {}) {
	// Each action adjusts one writable (formula-less) variable:
	//   { targetPieceId, op: "add" | "subtract" | "set",
	//     operandPieceId? | amount?, min? | minPieceId?, max? | maxPieceId? }
	return { id: makeId("piece"), kind: "button", label, actions };
}

// One dropdown option: plain text (`ref` null — its value is its label), or
// a reference ("STR" → the Strength Bonus).
export function createDropdownOption(label = "", ref = null) {
	return { id: makeId("option"), label, ref };
}

// `options` may be labels or { label, ref } objects. The value is the
// selected option's: its reference's result, or its label.
export function createDropdownPiece({ label = "", options = [] } = {}) {
	const built = options.map((option) =>
		typeof option === "string" ? createDropdownOption(option) : createDropdownOption(option.label, option.ref ?? null)
	);
	return {
		id: makeId("piece"),
		kind: "dropdown",
		label,
		options: built,
		selectedOptionId: built[0]?.id ?? null,
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
// `labelColor` / `bodyColor` are the user's own colours for the module's
// label bar and its body, chosen separately; null means the default palette.
// `capacity` links a checkbox group's box count to a reference, and `rules`
// lock or hide the module when a condition holds:
//   { id, left: expression, cmp: "<" | "<=" | ">" | ">=" | "=" | "!=", right: expression, effect: "locked" | "hidden" }
export function createModule({ type, label = "", pieces = [], ...options }) {
	const module = {
		id: makeId("module"),
		type,
		label,
		labelColor: null,
		bodyColor: null,
		capacity: null,
		rules: [],
		...options,
		pieces: {},
		pieceOrder: [],
	};
	for (const piece of pieces) {
		module.pieces[piece.id] = piece;
		module.pieceOrder.push(piece.id);
	}
	return module;
}

// A module rule: "when <left> <cmp> <right>, the module is <effect>".
export function createRule({ left, cmp = "<", right = { num: 0 }, effect = "locked" }) {
	return { id: makeId("rule"), left, cmp, right, effect };
}

// Short keys the six abilities' roles use ("ability.dex.bonus").
export const ABILITY_KEYS = {
	strength: "str",
	dexterity: "dex",
	constitution: "con",
	intelligence: "int",
	wisdom: "wis",
	charisma: "cha",
};

const abilityKey = (name) => ABILITY_KEYS[String(name || "").toLowerCase()] || null;
const slug = (text) => String(text).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Standard 5e ability modifier: the Bonus is a default reference to the
// rules file's abilityModifier of its own Score. `ability` tints the tile
// with that ability's own colour (see the --cs-ability-* palette in
// CharacterSheetStyles.css); the six standard abilities each have one (and a
// role other cards find them by), and a made-up ability (the mockup's
// "Sanity") just falls back to the neutral tint.
export function createAbilityScoreModule(label, score = 10) {
	const key = abilityKey(label);
	const scorePiece = createVariablePiece({ label: "Score", value: score, role: key && `ability.${key}.score` });
	const bonusPiece = createVariablePiece({
		label: "Bonus",
		role: key && `ability.${key}.bonus`,
		ref: createReference(fn("abilityModifier", pieceSrc(scorePiece.id)), { origin: "default" }),
	});
	return createModule({
		type: "abilityScore",
		label,
		ability: label.toLowerCase(),
		pieces: [scorePiece, bonusPiece],
	});
}

// `suffix` renders after the value ("30" + "ft"); `signed` forces a leading +
// on non-negative values (bonuses read "+3", not "3"). `role` and `ref` go
// on the number piece.
export function createNumberModule(label, value = 0, { suffix = "", signed = false, role = null, ref = null } = {}) {
	return createModule({
		type: "number",
		label,
		suffix,
		signed,
		pieces: [createVariablePiece({ label, value, role, ref })],
	});
}

// A single headline number (Armor Class, Initiative, Proficiency Bonus) — the
// value at display size under its label bar.
export function createBigNumberModule(label, value = 0, { signed = false, role = null, ref = null } = {}) {
	return createModule({ type: "bigNumber", label, signed, pieces: [createVariablePiece({ label, value, role, ref })] });
}

// A single oversized text field under its label bar (a character's or an
// attack's name).
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
		ref: createReference(
			add(
				add(add(mul(pieceSrc(platinum.id), num(10)), pieceSrc(gold.id)), div(pieceSrc(silver.id), num(10))),
				div(pieceSrc(copper.id), num(100))
			),
			{ origin: "default" }
		),
	});
	return createModule({ type: "currency", label, pieces: [total, platinum, gold, silver, copper] });
}

// Health's Damage/Heal control: a number-locked amount and two buttons —
// Damage takes the amount off `currentPieceId` (not below 0), Heal adds it
// back (not above `maxPieceId`).
export function createDamageHealModule(label = "Damage/Heal", { currentPieceId = null, maxPieceId = null } = {}) {
	const amountPiece = createTextPiece({ label: "Amount", text: "", numberLocked: true });
	const damageButton = createButtonPiece({
		label: "Damage",
		actions: currentPieceId ? [{ targetPieceId: currentPieceId, op: "subtract", operandPieceId: amountPiece.id, min: 0 }] : [],
	});
	const healButton = createButtonPiece({
		label: "Heal",
		actions: currentPieceId ? [{ targetPieceId: currentPieceId, op: "add", operandPieceId: amountPiece.id, maxPieceId }] : [],
	});
	return createModule({ type: "damageHeal", label, pieces: [amountPiece, damageButton, healButton] });
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

// "<ability bonus> + (proficiency × proficiency bonus)" as a default
// reference. Both are found by role — the ability's Bonus on an Ability Scores
// card, the bonus on a Proficiency Bonus card — so the field connects
// whenever those cards are on the sheet, and is a plain editable number
// until then. A checkbox counts as 0/1 and a tri-state as 0/1/2 in math, so
// proficiency (and expertise) need no conditional.
function abilityPlusProficiency(key, proficiencyPieceId) {
	if (!key) {
		return null;
	}
	return createReference(add(roleSrc(`ability.${key}.bonus`), mul(pieceSrc(proficiencyPieceId), roleSrc("proficiency.bonus"))), {
		origin: "default",
	});
}

// One saving throw: proficiency checkbox + calculated bonus + label text.
export function createSavingThrowModule(label) {
	const key = abilityKey(label);
	const proficiencyPiece = createCheckboxPiece({ label: "Proficient" });
	const bonusPiece = createVariablePiece({
		label: "Save Bonus",
		value: 0,
		role: key && `save.${key}.bonus`,
		ref: abilityPlusProficiency(key, proficiencyPiece.id),
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

// Like a saving throw (proficiency + live modifier + name), but proficiency is
// a tri-state — none, proficient, expertise — so expertise doubles the
// proficiency bonus.
export function createSkillModule(label, { ability = null } = {}) {
	const governing = ability || SKILL_ABILITIES[label] || null;
	const proficiencyPiece = createTristatePiece({ label: "Proficiency" });
	const bonusPiece = createVariablePiece({
		label: "Modifier",
		value: 0,
		role: `skill.${slug(label)}.modifier`,
		ref: abilityPlusProficiency(abilityKey(governing), proficiencyPiece.id),
	});
	const labelPiece = createTextPiece({ label: "Label", text: label });
	return createModule({
		type: "skill",
		label,
		ability: governing,
		pieces: [proficiencyPiece, bonusPiece, labelPiece],
	});
}

// Builds a module of any type from a plain config — for the Custom Card flow
// and for card definitions (see cardDefinitions.js). Returns null for types
// that are visible in the picker but not buildable yet ("coming soon"), and
// for unknown types.
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
			return createColumnHeaderModule(config.labels || ["Proficient?", "Modifier", "Skill"]);
		case "listText":
			return createListTextModule(config.label || "List", config.items || ["", "", ""]);
		case "itemList":
			return createItemListModule(config.label || "Items", config.items || [{ name: "", qty: "1" }]);
		case "image":
			return createImageModule(config.label || "Image", config.src ?? "");
		case "currency":
			return createCurrencyModule(config.label || "Currency");
		case "savingThrow":
			return createSavingThrowModule(config.label || "Save");
		case "damageHeal":
			return createDamageHealModule(config.label || "Damage/Heal", config);
		default:
			return null;
	}
}

// ---------- Copies ----------
//
// A copy gets fresh ids for everything (ids are never reused). References
// between pieces inside the copy are re-pointed to the copy's own pieces — a
// copied Currency module totals its own coins, a copied Ability Scores card's
// Bonuses follow its own Scores — while references out to anything else (a
// skill's link to the Ability Scores card) are kept, and so are role-based
// references, which find their source by role wherever it is.

const BUTTON_REF_KEYS = ["targetPieceId", "operandPieceId", "minPieceId", "maxPieceId"];

function remapExpr(expr, ids) {
	return mapSources(expr, (src) => {
		if (src.piece && ids.pieces.has(src.piece)) {
			return { ...src, piece: ids.pieces.get(src.piece) };
		}
		if (src.module && ids.modules.has(src.module)) {
			return { ...src, module: ids.modules.get(src.module) };
		}
		return src;
	});
}

function remapReference(ref, ids) {
	return ref ? { ...ref, id: makeId("ref"), expr: remapExpr(ref.expr, ids) } : ref;
}

function remapPiece(piece, ids) {
	const swap = (pieceId) => ids.pieces.get(pieceId) || pieceId;
	const id = ids.pieces.get(piece.id);
	switch (piece.kind) {
		case "variable":
			return { ...piece, id, ref: remapReference(piece.ref, ids) };
		case "text":
			return {
				...piece,
				id,
				segments: piece.segments.map((segment) =>
					segment.type === "chip" ? { ...segment, ref: remapReference(segment.ref, ids) } : { ...segment }
				),
			};
		case "button":
			return {
				...piece,
				id,
				actions: piece.actions.map((action) => {
					const next = { ...action };
					for (const key of BUTTON_REF_KEYS) {
						if (next[key]) {
							next[key] = swap(next[key]);
						}
					}
					return next;
				}),
			};
		case "dropdown":
			return { ...piece, id, options: piece.options.map((option) => ({ ...option, ref: remapReference(option.ref, ids) })) };
		default:
			return { ...piece, id };
	}
}

function copyModule(module, ids) {
	const pieces = {};
	for (const pieceId of module.pieceOrder) {
		const piece = remapPiece(module.pieces[pieceId], ids);
		pieces[piece.id] = piece;
	}
	return {
		...module,
		id: ids.modules.get(module.id),
		capacity: remapReference(module.capacity ?? null, ids),
		rules: (module.rules || []).map((rule) => ({
			...rule,
			id: makeId("rule"),
			left: remapExpr(rule.left, ids),
			right: remapExpr(rule.right, ids),
		})),
		pieces,
		pieceOrder: module.pieceOrder.map((pieceId) => ids.pieces.get(pieceId)),
	};
}

function freshIds(modules) {
	const ids = { pieces: new Map(), modules: new Map() };
	for (const module of modules) {
		ids.modules.set(module.id, makeId("module"));
		for (const pieceId of module.pieceOrder) {
			ids.pieces.set(pieceId, makeId("piece"));
		}
	}
	return ids;
}

export function cloneModule(module) {
	return copyModule(module, freshIds([module]));
}

// The copy's moduleOrder lines up index-for-index with the original's, which
// is how a placement's module rects are carried over to the copy.
export function cloneCard(card) {
	const originals = card.moduleOrder.map((moduleId) => card.modules[moduleId]);
	const ids = freshIds(originals);
	const copies = originals.map((module) => copyModule(module, ids));
	return {
		...card,
		id: makeId("card"),
		modules: Object.fromEntries(copies.map((module) => [module.id, module])),
		moduleOrder: copies.map((module) => module.id),
	};
}

// ---------- Cards ----------

// `headerColor` / `bodyColor` are the user's own colours for the header bar
// and the card's background, or null for the defaults (navy / white).
export function createCard({ type, title, modules = [] }) {
	const card = { id: makeId("card"), type, title, headerColor: null, bodyColor: null, modules: {}, moduleOrder: [] };
	for (const module of modules) {
		card.modules[module.id] = module;
		card.moduleOrder.push(module.id);
	}
	return card;
}

export const ABILITY_NAMES = ["Strength", "Dexterity", "Constitution", "Intelligence", "Wisdom", "Charisma"];

export function createCustomCard(title) {
	return createCard({ type: "custom", title: title || "Unnamed", modules: [] });
}

// ---------- Pages and Sheets ----------

// A layout entry places an existing card on a page. x/y/w/h are the card's
// cells on the page grid, in whole grid units (see grid.js). moduleOrder is
// this page's own arrangement of the card's modules (which ones are included;
// removing one here never deletes its data), each with its own unit rect in
// moduleRects, relative to the card's module grid.
export function createCardLayout(card, { moduleOrder = null, rect = { x: 0, y: 0, w: 1, h: 1 }, moduleRects = {} } = {}) {
	return {
		id: makeId("layout"),
		cardId: card.id,
		x: rect.x,
		y: rect.y,
		w: rect.w,
		h: rect.h,
		moduleOrder: [...(moduleOrder || card.moduleOrder)],
		moduleRects: { ...moduleRects },
	};
}

export function createPage(name) {
	return { id: makeId("page"), name, color: null, cardLayouts: [] };
}

// Bump whenever the saved shape changes incompatibly — sheets saved with any
// other version are discarded on load (see loadInitialSheet). v3: references
// became expression data (piece.ref, chip segments, option refs, capacity,
// rules) instead of formula strings.
export const SHEET_VERSION = 3;

export function createSheet(name = "New Character") {
	const firstPage = createPage("Page 1");
	return {
		version: SHEET_VERSION,
		id: makeId("sheet"),
		name,
		activePageId: firstPage.id,
		pages: [firstPage],
		cards: {},
	};
}

// ---------- Picker options ----------

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
	{ id: "bigNumber", label: "Stat Value", available: true },
	{ id: "text", label: "Text Field", available: true },
];
