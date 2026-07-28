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
const refs = await import(`${BASE}/character_sheet/references.js`);
const ops = await import(`${BASE}/character_sheet/sheetOps.js`);

const heading = (text) => console.log(`\n=== ${text} ===`);
const signed = (n) => (n >= 0 ? `+${n}` : `${n}`);

// --- Build the sheet ---
let sheet = schema.createSheet("Playground");
const pageId = sheet.pages[0].id;

const abilities = schema.createAbilityScoresCard();
sheet = ops.addCardToPage(sheet, pageId, abilities);
const bonusIds = schema.getAbilityBonusPieceIds(sheet.cards[abilities.id]);
for (const [name, score] of Object.entries(ABILITY_SCORES)) {
	const module = Object.values(sheet.cards[abilities.id].modules).find((m) => m.label === name);
	sheet = ops.setVariableValue(sheet, module.pieceOrder[0], score);
}

const saves = schema.createSavingThrowsCard({
	abilityBonusPieceIds: bonusIds,
	proficiencyBonus: PROFICIENCY_BONUS,
});
sheet = ops.addCardToPage(sheet, pageId, saves);
for (const name of PROFICIENT_SAVES) {
	const module = Object.values(sheet.cards[saves.id].modules).find((m) => m.label === name);
	sheet = ops.setCheckboxValue(sheet, module.pieceOrder[0], true);
}

const health = schema.createHealthCard();
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
		{ type: "ref", pieceId: bonusIds.wisdom },
		{ type: "text", value: " (your Wisdom modifier)." },
	],
});
sheet = ops.addModuleToCard(sheet, feat.id, descModule);
const descPieceId = descModule.pieceOrder[0];

// --- Show what the engine computes ---
let index = refs.buildPieceIndex(sheet);

heading("Ability Scores (bonus is a live formula: floor((score - 10) / 2))");
for (const name of Object.keys(ABILITY_SCORES)) {
	const bonus = refs.getPieceNumericValue(bonusIds[name.toLowerCase()], index).value;
	console.log(`${name.padEnd(13)} score ${String(ABILITY_SCORES[name]).padEnd(3)} bonus ${signed(bonus)}`);
}

heading(`Saving Throws (= ability bonus + checkbox x ${PROFICIENCY_BONUS}; checkbox coerces to 0/1)`);
for (const moduleId of sheet.cards[saves.id].moduleOrder) {
	const module = sheet.cards[saves.id].modules[moduleId];
	const [profId, saveBonusId] = module.pieceOrder;
	const prof = index[profId].piece.value;
	const bonus = refs.getPieceNumericValue(saveBonusId, index).value;
	console.log(`${module.label.padEnd(13)} ${prof ? "[x]" : "[ ]"} ${signed(bonus)}`);
}

heading("Health buttons");
console.log(`Start:  ${refs.getPieceNumericValue(curHpId, index).value}/${MAX_HP} HP`);
sheet = ops.setTextPlain(sheet, amountId, String(DAMAGE_TAKEN));
sheet = ops.pressButton(sheet, damageBtnId);
index = refs.buildPieceIndex(sheet);
console.log(`After Damage(${DAMAGE_TAKEN}):  ${refs.getPieceNumericValue(curHpId, index).value}/${MAX_HP} HP  (clamps at 0)`);
sheet = ops.setTextPlain(sheet, amountId, String(HEALING_DONE));
sheet = ops.pressButton(sheet, healBtnId);
index = refs.buildPieceIndex(sheet);
console.log(`After Heal(${HEALING_DONE}):  ${refs.getPieceNumericValue(curHpId, index).value}/${MAX_HP} HP  (clamps at Max HP)`);

heading("Live cross-card reference inside custom card text");
console.log(`Feat text now:   "${refs.getPieceTextValue(descPieceId, index).text}"`);
const wisModule = Object.values(sheet.cards[abilities.id].modules).find((m) => m.label === "Wisdom");
sheet = ops.setVariableValue(sheet, wisModule.pieceOrder[0], NEW_WISDOM_SCORE);
index = refs.buildPieceIndex(sheet);
console.log(`Wisdom -> ${NEW_WISDOM_SCORE}:    "${refs.getPieceTextValue(descPieceId, index).text}"`);

heading("Delete guard");
let attempt = ops.deleteCard(sheet, abilities.id);
console.log(`Try to delete "Ability Scores": ${attempt.ok ? "deleted" : "BLOCKED"}`);
for (const blocker of attempt.referencedBy) {
	for (const reference of blocker.references) {
		console.log(`  referenced by "${blocker.cardTitle}" -> module "${reference.moduleLabel}"`);
	}
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
index = refs.buildPieceIndex(sheet);
console.log(`Wisdom bonus read via either page: ${signed(refs.getPieceNumericValue(bonusIds.wisdom, index).value)} (one shared value)`);
