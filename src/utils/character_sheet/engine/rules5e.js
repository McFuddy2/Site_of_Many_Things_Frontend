// The game rules references can call by name, as data. A rule-edition
// difference (a different proficiency ladder, say) is a change to this file
// only — nothing else in the engine knows these numbers.
//
// functions: named expressions with inputs (`params`), called as
//   { fn: "<name>", args: [...] }. Their bodies use { param: "<input>" }.
// tables: threshold ladders, called as { lookup: "<name>", arg: ... }. Rows
//   are [threshold, result] in ascending order; inputs outside the ladder
//   clamp to its first or last row (see lookupLadder in expression.js).
//
// `label` is how the popover editor offers each one ("Ability modifier of …").

export const RULES_5E = {
	id: "5e-2014",
	functions: {
		// floor((score − 10) ÷ 2): 1 → −5, 9 → −1, 10 → 0, 15 → +2, 20 → +5.
		abilityModifier: {
			label: "Ability modifier of",
			params: ["score"],
			expr: {
				fn: "floor",
				args: [{ op: "/", args: [{ op: "-", args: [{ param: "score" }, { num: 10 }] }, { num: 2 }] }],
			},
		},
	},
	tables: {
		// Levels 1–4 → +2, 5–8 → +3, 9–12 → +4, 13–16 → +5, 17–20 → +6.
		proficiencyBonusByLevel: {
			label: "Proficiency bonus for level",
			rows: [
				[1, 2],
				[5, 3],
				[9, 4],
				[13, 5],
				[17, 6],
			],
		},
	},
};
