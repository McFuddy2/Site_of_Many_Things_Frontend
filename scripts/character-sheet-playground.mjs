// Character sheet engine playground — edit the knobs below, then run from the
// project root with:  node scripts/character-sheet-playground.mjs
//
// It builds the three Standard Cards plus a custom feat card with a live
// cross-card reference, then prints what the engine computes at each step.

// ======================= KNOBS — EDIT ME =======================
const ABILITY_SCORES = {
	Strength: 8,
	Dexterity: 14,
	Constitution: 13,
	Intelligence: 16,
	Wisdom: 12,
	Charisma: 10,
};
const PROFICIENT_SAVES = ["Intelligence", "Wisdom"]; // which saves are proficient
const PROFICIENCY_BONUS = 2;
const MAX_HP = 24;
const DAMAGE_TAKEN = 9; // applied via the Damage button
const HEALING_DONE = 100; // applied via the Heal button (watch it clamp at Max HP)
const NEW_WISDOM_SCORE = 20; // changed at the end — watch the feat text update
// ===============================================================

const BASE = new URL("../src/utils", import.meta.url).href;
const schema = await import(`${BASE}/character_sheet/schema.js`);
const cards = await import(`${BASE}/character_sheet/cardDefinitions.js`);
const ops = await import(`${BASE}/character_sheet/sheetOps.js`);
const refs = await import(`${BASE}/character_sheet/references.js`);
const { readSheetValue } = await import(`${BASE}/character_sheet/engine/engine.js`);
const { pieceSrc } = await import(`${BASE}/character_sheet/engine/expression.js`);

const valueOf = (pieceId) => readSheetValue(sheet, { piece: pieceId }).value;

const heading = (text) => console.log(`\n=== ${text} ===`);
const signed = (n) => (n >= 0 ? `+${n}` : `${n}`);

// --- Build the sheet ---
let sheet = schema.createSheet("Playground");
const pageId = sheet.pages[0].id;

const abilities = cards.createStandardCard("abilityScores");
sheet = ops.addCardToPage(sheet, pageId, abilities);
const bonusIds = Object.fromEntries(
	Object.values(sheet.cards[abilities.id].modules).map((module) => [module.label.toLowerCase(), module.pieceOrder[1]])
);
for (const [name, score] of Object.entries(ABILITY_SCORES)) {
	const module = Object.values(sheet.cards[abilities.id].modules).find((m) => m.label === name);
	sheet = ops.setVariableValue(sheet, module.pieceOrder[0], score);
}

// Saves find each ability's Bonus and the Proficiency Bonus by role — no
// wiring needed, just the cards on the sheet.
const proficiency = cards.createStandardCard("proficiencyBonus");
sheet = ops.addCardToPage(sheet, pageId, proficiency);
sheet = ops.setPieceValue(sheet, proficiency.modules[proficiency.moduleOrder[0]].pieceOrder[0], PROFICIENCY_BONUS);
const saves = cards.createStandardCard("savingThrows");
sheet = ops.addCardToPage(sheet, pageId, saves);
for (const name of PROFICIENT_SAVES) {
	const module = Object.values(sheet.cards[saves.id].modules).find((m) => m.label === name);
	sheet = ops.setCheckboxValue(sheet, module.pieceOrder[0], true);
}

const health = cards.createStandardCard("health");
sheet = ops.addCardToPage(sheet, pageId, health);
const healthModules = sheet.cards[health.id];
const curHpId = healthModules.modules[healthModules.moduleOrder[0]].pieceOrder[0];
const maxHpId = healthModules.modules[healthModules.moduleOrder[1]].pieceOrder[0];
const [amountId, damageBtnId, healBtnId] = healthModules.modules[healthModules.moduleOrder[3]].pieceOrder;
sheet = ops.setVariableValue(sheet, maxHpId, MAX_HP);
sheet = ops.setVariableValue(sheet, curHpId, MAX_HP);

// Custom card whose description *references* the Wisdom bonus (live, by piece id)
const feat = schema.createCustomCard("Healer's Kit (Feat)");
sheet = ops.addCardToPage(sheet, pageId, feat);
const descModule = schema.createModuleForType("text", {
	label: "Description",
	segments: [
		{ type: "text", value: "The creature regains HP equal to the roll plus " },
		schema.createChipSegment(pieceSrc(bonusIds.wisdom)),
		{ type: "text", value: " (your Wisdom modifier)." },
	],
});
sheet = ops.addModuleToCard(sheet, feat.id, descModule);
const descPieceId = descModule.pieceOrder[0];

// --- Show what the engine computes ---
heading("Ability Scores (bonus is a live reference: abilityModifier(score))");
for (const name of Object.keys(ABILITY_SCORES)) {
	const bonus = valueOf(bonusIds[name.toLowerCase()]);
	console.log(`${name.padEnd(13)} score ${String(ABILITY_SCORES[name]).padEnd(3)} bonus ${signed(bonus)}`);
}

heading(`Saving Throws (= ability bonus + checkbox x ${PROFICIENCY_BONUS}; checkbox coerces to 0/1)`);
for (const moduleId of sheet.cards[saves.id].moduleOrder) {
	const module = sheet.cards[saves.id].modules[moduleId];
	const [profId, saveBonusId] = module.pieceOrder;
	const prof = valueOf(profId);
	const bonus = valueOf(saveBonusId);
	console.log(`${module.label.padEnd(13)} ${prof ? "[x]" : "[ ]"} ${signed(bonus)}`);
}

heading("Health buttons");
console.log(`Start:  ${valueOf(curHpId)}/${MAX_HP} HP`);
sheet = ops.setTextPlain(sheet, amountId, String(DAMAGE_TAKEN));
sheet = ops.pressButton(sheet, damageBtnId);
console.log(`After Damage(${DAMAGE_TAKEN}):  ${valueOf(curHpId)}/${MAX_HP} HP  (clamps at 0)`);
sheet = ops.setTextPlain(sheet, amountId, String(HEALING_DONE));
sheet = ops.pressButton(sheet, healBtnId);
console.log(`After Heal(${HEALING_DONE}):  ${valueOf(curHpId)}/${MAX_HP} HP  (clamps at Max HP)`);

heading("Live cross-card reference inside custom card text");
console.log(`Feat text now:   "${valueOf(descPieceId)}"`);
const wisModule = Object.values(sheet.cards[abilities.id].modules).find((m) => m.label === "Wisdom");
sheet = ops.setVariableValue(sheet, wisModule.pieceOrder[0], NEW_WISDOM_SCORE);
console.log(`Wisdom -> ${NEW_WISDOM_SCORE}:    "${valueOf(descPieceId)}"`);

heading("Delete guard");
let attempt = ops.deleteCard(sheet, abilities.id);
console.log(`Try to delete "Ability Scores": ${attempt.ok ? "deleted" : "BLOCKED"}`);
for (const dependent of refs.describeDependents(sheet, attempt.dependents)) {
	console.log(`  used by ${dependent.label}`);
}
attempt = ops.deleteCard(sheet, health.id);
console.log(`Try to delete "Health" (nothing references it): ${attempt.ok ? "deleted" : "BLOCKED"}`);

heading("Same card on two pages: shared data, independent layout");
sheet = ops.addPage(sheet);
const page2 = sheet.pages[1];
sheet = ops.insertExistingCardOnPage(sheet, page2.id, abilities.id);
const layout2 = sheet.pages[1].cardLayouts[0];
sheet = ops.setLayoutModuleOrder(sheet, page2.id, layout2.id, [...layout2.moduleOrder].reverse());
const labelsOf = (page) =>
	page.cardLayouts
		.filter((layout) => layout.cardId === abilities.id)[0]
		.moduleOrder.map((id) => sheet.cards[abilities.id].modules[id].label)
		.join(", ");
console.log(`Page 1 order: ${labelsOf(sheet.pages[0])}`);
console.log(`Page 2 order: ${labelsOf(sheet.pages[1])}  <- reversed, Page 1 untouched`);
console.log(`Wisdom bonus read via either page: ${signed(valueOf(bonusIds.wisdom))} (one shared value)`);
