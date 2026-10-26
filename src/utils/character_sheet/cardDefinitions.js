// Every standard card type, as data: its title, its modules in reading order
// (each a module type plus that type's options), the roles other cards find
// its values by, its default references, its default layout and its name in
// the New Card picker. One generic builder (buildCard) turns a definition
// into a card, so adding a card type — or the future default character
// sheet — is a data change, never per-card code.
//
// A module definition is the config createModuleForType takes (label, value,
// signed, suffix, options, count…), plus:
//   key       a name other modules in this card can refer to
//   role      set on the module's value piece, for other cards' defaults
//   ref       a default reference for the module's value piece
//   capacity  a default reference for a checkbox group's box count
// In expressions, { src: { local: "<key>" } } is the value piece of another
// module in the same card (or, with field: "checked", that checkbox group's
// checked count); it becomes a real piece id when the card is built, so a
// duplicated card's links follow its own modules. Anything that needs
// another card's value names a role instead.
//
// `rows` is the default layout (see cardLayouts.js): each row lists its
// modules' widths in grid units, in module order.

import { createCard, createModuleForType, createReference, ABILITY_KEYS, SKILL_ABILITIES, SKILL_NAMES } from "./schema.js";
import { VALUE_KINDS } from "./engine/engine.js";
import { add, num, lookup, roleSrc, mapSources } from "./engine/expression.js";

const local = (key, field = null) => ({ src: field ? { local: key, field } : { local: key } });
const column = (count, width, h) => Array.from({ length: count }, () => ({ w: [width], ...(h ? { h } : {}) }));

const ABILITIES = Object.entries(ABILITY_KEYS); // [["strength", "str"], …]
const titleCase = (word) => word[0].toUpperCase() + word.slice(1);
const abilityBonus = (key) => roleSrc(`ability.${key}.bonus`);
const proficiencyBonus = roleSrc("proficiency.bonus");

// The passive scores the Passive Skills card ships with: 10 + that skill's
// modifier.
const PASSIVES = [
	["Perception", "WIS"],
	["Insight", "WIS"],
	["Investigation", "INT"],
];

export const CARD_DEFINITIONS = {
	abilityScores: {
		title: "Ability Scores",
		pickerLabel: "Ability Scores",
		// Each tile's Bonus is the ability modifier of its own Score (built into
		// the abilityScore module type).
		modules: ABILITIES.map(([name]) => ({ type: "abilityScore", label: titleCase(name) })),
		rows: [{ w: [5, 5, 5, 5, 5, 5] }],
	},
	allies: {
		title: "Allies and Organizations",
		pickerLabel: "Allies and Organizations",
		modules: [
			{ type: "textArea", label: "Allies" },
			{ type: "textArea", label: "Organizations" },
		],
		rows: column(2, 14),
	},
	appearance: {
		title: "Appearance",
		pickerLabel: "Character Appearance",
		modules: [
			{ type: "image", label: "Portrait" },
			{ type: "textArea", label: "Appearance Description" },
		],
		rows: [{ w: [12] }, { w: [12] }],
	},
	armorClass: {
		title: "Armor Class",
		pickerLabel: "Armor Class",
		// Unarmored: 10 + Dexterity Bonus. Someone in armor edits or unlinks it.
		modules: [{ type: "bigNumber", label: "Armor Class", value: 10, role: "character.armorClass", ref: add(num(10), abilityBonus("dex")) }],
		rows: [{ w: [7] }],
	},
	attack: {
		title: "Attack",
		pickerLabel: "Attack",
		modules: [
			{ type: "bigText", label: "Name" },
			{
				key: "ability",
				type: "dropdown",
				label: "Ability",
				options: ABILITIES.map(([, key]) => ({ label: key.toUpperCase(), ref: abilityBonus(key) })),
			},
			{ type: "number", label: "To Hit Bonus", signed: true, ref: add(local("ability"), proficiencyBonus) },
			{ type: "text", label: "Range" },
			{ type: "text", label: "Type" },
			{ type: "text", label: "Dice" },
			{ type: "number", label: "Dmg +", signed: true, ref: local("ability") },
			{ type: "checkboxRow", label: "Charges", count: 3 },
			{ type: "textArea", label: "Notes" },
		],
		rows: [{ w: [8, 8, 8] }, { w: [6, 6, 6, 6] }, { w: [24] }, { w: [24], h: 4 }],
	},
	backstory: {
		title: "Backstory",
		pickerLabel: "Backstory",
		modules: [{ type: "textArea", label: "Backstory Description" }],
		rows: [{ w: [14], h: 8 }],
	},
	basicDescriptions: {
		title: "Character Description",
		pickerLabel: "Basic Descriptions",
		modules: [
			{ type: "text", label: "Age", numberLocked: true },
			{ type: "text", label: "Height" },
			{ type: "text", label: "Weight", numberLocked: true },
			{ type: "text", label: "Eyes" },
			{ type: "text", label: "Skin" },
			{ type: "text", label: "Hair" },
		],
		rows: [{ w: [6, 6, 6] }, { w: [6, 6, 6] }],
	},
	basicInfo: {
		title: "Basic Information",
		pickerLabel: "Basic Info",
		modules: [
			{ type: "text", label: "Class" },
			{ type: "number", label: "Level", value: 1, role: "character.level" },
			{ type: "text", label: "Background" },
			{ type: "text", label: "Player Name" },
			{ type: "text", label: "Race" },
			{ type: "text", label: "Alignment" },
			{ type: "number", label: "Experience", value: 0 },
		],
		rows: [{ w: [6, 4, 6, 6] }, { w: [6, 7, 9] }],
	},
	characterName: {
		title: "Character Name",
		pickerLabel: "Character Name",
		modules: [{ type: "bigText", label: "Name" }],
		rows: [{ w: [12] }],
	},
	deathSaves: {
		title: "Death Saves",
		pickerLabel: "Death Saves",
		modules: [
			{ type: "checkboxRow", label: "Successes", count: 3, tone: "success" },
			{ type: "checkboxRow", label: "Failures", count: 3, tone: "danger" },
		],
		rows: column(2, 9),
	},
	equipment: {
		title: "Equipment",
		pickerLabel: "Equipment",
		modules: [{ type: "itemList", label: "Item List", items: [{ name: "", qty: "1" }, { name: "", qty: "1" }, { name: "", qty: "1" }] }],
		rows: [{ w: [14] }],
	},
	feature: {
		title: "Feature/Trait",
		pickerLabel: "Feature/Trait",
		modules: [
			{ type: "textArea", label: "Description" },
			{ type: "checkboxRow", label: "Uses", count: 10 },
		],
		rows: [{ w: [14] }, { w: [14] }],
	},
	health: {
		title: "Health",
		pickerLabel: "Health",
		modules: [
			{ key: "current", type: "number", label: "Current HP", value: 10 },
			{ key: "max", type: "number", label: "Max HP", value: 10 },
			{ type: "text", label: "Temp HP", text: "0", numberLocked: true },
			{ type: "damageHeal", label: "Damage/Heal", currentPieceId: local("current"), maxPieceId: local("max") },
		],
		rows: [{ w: [6, 6, 6] }, { w: [18] }],
	},
	hitDice: {
		title: "Hit Dice",
		pickerLabel: "Hit Dice",
		modules: [
			{ type: "text", label: "Dice Type", text: "D8" },
			{ key: "total", type: "number", label: "Total", value: 1, ref: roleSrc("character.level") },
			{ type: "checkboxRow", label: "Hit Dice Used", count: 1, capacity: local("total") },
		],
		rows: [{ w: [6, 5, 9] }],
	},
	initiative: {
		title: "Initiative",
		pickerLabel: "Initiative",
		modules: [{ type: "bigNumber", label: "Initiative", value: 0, signed: true, role: "character.initiative", ref: abilityBonus("dex") }],
		rows: [{ w: [6] }],
	},
	inspiration: {
		title: "Inspiration",
		pickerLabel: "Inspiration",
		modules: [{ type: "checkbox", label: "Inspiration" }],
		rows: [{ w: [7] }],
	},
	money: {
		title: "Currency",
		pickerLabel: "Money",
		modules: [{ type: "currency", label: "Currency" }],
		rows: [{ w: [12] }],
	},
	movementSpeed: {
		title: "Movement Speed",
		pickerLabel: "Movement Speed",
		modules: [
			{ type: "number", label: "Walking Speed", value: 30, suffix: "ft" },
			{ type: "number", label: "Swim", value: 0, suffix: "ft" },
			{ type: "number", label: "Climb", value: 0, suffix: "ft" },
			{ type: "number", label: "Fly", value: 0, suffix: "ft" },
		],
		rows: [{ w: [6, 4, 4, 4] }],
	},
	passiveSkills: {
		title: "Passive Scores",
		pickerLabel: "Passive Skills",
		modules: PASSIVES.map(([skill, ability]) => {
			const label = `${skill} (${ability})`;
			const slug = skill.toLowerCase();
			return {
				type: "passiveSkill",
				label,
				text: label,
				value: 10,
				role: `passive.${slug}`,
				ref: add(num(10), roleSrc(`skill.${slug}.modifier`)),
			};
		}),
		// One unit wider than a lone passive row: "Investigation (INT)" fits.
		rows: column(PASSIVES.length, 11),
	},
	personality: {
		title: "Personality",
		pickerLabel: "Personality",
		modules: [
			{ type: "textArea", label: "Personality Traits" },
			{ type: "textArea", label: "Ideals" },
			{ type: "textArea", label: "Bonds" },
			{ type: "textArea", label: "Flaws" },
		],
		rows: [{ w: [10, 10] }, { w: [10, 10] }],
	},
	proficiencies: {
		title: "Proficiencies and Languages",
		pickerLabel: "Proficiencies and Languages",
		modules: [{ type: "listText", label: "Proficiencies and Languages", items: ["", "", "", ""] }],
		rows: [{ w: [14] }],
	},
	proficiencyBonus: {
		title: "Proficiency",
		pickerLabel: "Proficiency Bonus",
		// From the rules file's ladder, by the character's Level.
		modules: [
			{
				type: "bigNumber",
				label: "Proficiency Bonus",
				value: 2,
				signed: true,
				role: "proficiency.bonus",
				ref: lookup("proficiencyBonusByLevel", roleSrc("character.level")),
			},
		],
		rows: [{ w: [7] }],
	},
	savingThrows: {
		title: "Saving Throws",
		pickerLabel: "Saving Throws",
		// Each: its ability's Bonus + (proficient × Proficiency Bonus), built into
		// the savingThrow module type.
		modules: ABILITIES.map(([name]) => ({ type: "savingThrow", label: titleCase(name) })),
		rows: column(6, 10),
	},
	skills: {
		title: "Skills",
		pickerLabel: "Skills",
		// Each: its governing ability's Bonus + (none 0 / proficient 1 /
		// expertise 2 × Proficiency Bonus), built into the skill module type.
		modules: [
			{ type: "columnHeader", labels: ["Proficient?", "Modifier", "Skill"] },
			...SKILL_NAMES.map((name) => ({ type: "skill", label: name, ability: SKILL_ABILITIES[name] })),
		],
		rows: column(SKILL_NAMES.length + 1, 13),
	},
	symbol: {
		title: "Symbol",
		pickerLabel: "Symbol",
		modules: [
			{ type: "image", label: "Symbol Image" },
			{ type: "textArea", label: "Symbol Description" },
		],
		rows: [{ w: [12] }, { w: [12] }],
	},
	treasure: {
		title: "Treasure",
		pickerLabel: "Treasure",
		modules: [{ type: "itemList", label: "Treasure List", items: [{ name: "", qty: "1" }, { name: "", qty: "1" }] }],
		rows: [{ w: [14] }],
	},
};

export const STANDARD_CARD_TYPES = Object.keys(CARD_DEFINITIONS);

// Card types in the New Card picker: the two special entries, then every
// definition by its picker name.
export const CARD_TYPE_OPTIONS = [
	{ id: "custom", label: "(Custom)", available: true },
	{ id: "insertExisting", label: "[Insert from another Page]", available: true },
	...STANDARD_CARD_TYPES.map((id) => ({ id, label: CARD_DEFINITIONS[id].pickerLabel, available: true })).sort((a, b) =>
		a.label.localeCompare(b.label)
	),
];

// ---------- Building ----------

function valuePieceOf(module) {
	const pieceId = module.pieceOrder.find((id) => VALUE_KINDS.has(module.pieces[id]?.kind));
	return pieceId ? module.pieces[pieceId] : null;
}

// `{ src: { local } }` → the real piece (or checked count) it names.
function resolveLocal(expr, byKey) {
	return mapSources(expr, (src) => {
		if (!src.local) {
			return src;
		}
		const module = byKey.get(src.local);
		if (!module) {
			return src;
		}
		return src.field === "checked" ? { module: module.id, field: "checked" } : { piece: valuePieceOf(module)?.id };
	});
}

const defaultReference = (expr, byKey) => createReference(resolveLocal(expr, byKey), { origin: "default" });

// A module definition as createModuleForType's config: local names become
// piece ids, and dropdown options' references become saved references.
function moduleConfig(definition, byKey) {
	const { key, role, ref, capacity, ...config } = definition;
	for (const [name, value] of Object.entries(config)) {
		if (value?.src?.local) {
			config[name] = valuePieceOf(byKey.get(value.src.local))?.id ?? null;
		}
	}
	if (Array.isArray(config.options)) {
		config.options = config.options.map((option) =>
			typeof option === "string" ? option : { label: option.label, ref: option.ref ? defaultReference(option.ref, byKey) : null }
		);
	}
	return config;
}

// The role, default reference and box count a definition adds to its module.
function withLinks(module, definition, byKey) {
	let next = module;
	if (definition.role || definition.ref) {
		const piece = valuePieceOf(module);
		if (piece) {
			const linked = {
				...piece,
				...(definition.role ? { role: definition.role } : {}),
				...(definition.ref ? { ref: defaultReference(definition.ref, byKey) } : {}),
			};
			next = { ...next, pieces: { ...next.pieces, [piece.id]: linked } };
		}
	}
	if (definition.capacity) {
		next = { ...next, capacity: defaultReference(definition.capacity, byKey) };
	}
	return next;
}

// Builds a fresh card from a definition (by type, or a definition object).
// Returns null for an unknown type.
export function buildCard(type, definition = CARD_DEFINITIONS[type]) {
	if (!definition) {
		return null;
	}
	const byKey = new Map();
	const built = [];
	for (const moduleDefinition of definition.modules) {
		const module = createModuleForType(moduleDefinition.type, moduleConfig(moduleDefinition, byKey));
		if (!module) {
			continue;
		}
		if (moduleDefinition.key) {
			byKey.set(moduleDefinition.key, module);
		}
		built.push([module, moduleDefinition]);
	}
	// Links resolve once every module exists, so a module may name one that
	// comes after it.
	const modules = built.map(([module, moduleDefinition]) => withLinks(module, moduleDefinition, byKey));
	return createCard({ type, title: definition.title, modules });
}

// A fresh standard card of `typeId`, or null for an unknown type. Cards whose
// values come from other cards link to them by role, so they connect on
// their own whenever those cards are on the sheet.
export function createStandardCard(typeId) {
	return buildCard(typeId);
}
