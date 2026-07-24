// Sanity tests for the character sheet engine.
// Run from the project root with:  node scripts/character-sheet-engine-test.mjs
const BASE = new URL("../src/utils", import.meta.url).href;

// Minimal localStorage mock so the storage module works under node.
const store = new Map();
globalThis.localStorage = {
	getItem: (k) => (store.has(k) ? store.get(k) : null),
	setItem: (k, v) => store.set(k, String(v)),
	removeItem: (k) => store.delete(k),
};

const schema = await import(`${BASE}/character_sheet/schema.js`);
const refs = await import(`${BASE}/character_sheet/references.js`);
const ops = await import(`${BASE}/character_sheet/sheetOps.js`);
const formula = await import(`${BASE}/character_sheet/formula.js`);
const storage = await import(`${BASE}/characterSheetStorage.js`);

let failures = 0;
function check(name, actual, expected) {
	const ok = JSON.stringify(actual) === JSON.stringify(expected);
	if (!ok) {
		failures += 1;
		console.log(`FAIL ${name}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
	} else {
		console.log(`ok   ${name}`);
	}
}

// --- formula basics ---
check("literal math", formula.evaluateFormula("2 + 3 * 4", () => 0).value, 14);
check("floor/negatives", formula.evaluateFormula("floor((7 - 10) / 2)", () => 0).value, -2);
check("min args", formula.evaluateFormula("min(3, 8, -1)", () => 0).value, -1);
check("bad formula is error not throw", typeof formula.evaluateFormula("2 +", () => 0).error, "string");
check("unknown fn", typeof formula.evaluateFormula("sqrt(4)", () => 0).error, "string");

// --- ability scores: bonus auto-calculates and stays live ---
let sheet = schema.createSheet("Test");
const page1 = sheet.pages[0];
const abilities = schema.createAbilityScoresCard();
sheet = ops.addCardToPage(sheet, page1.id, abilities);

const bonusIds = schema.getAbilityBonusPieceIds(sheet.cards[abilities.id]);
const strModule = sheet.cards[abilities.id].modules[sheet.cards[abilities.id].moduleOrder[0]];
const strScoreId = strModule.pieceOrder[0];

let index = refs.buildPieceIndex(sheet);
check("default bonus (10 -> 0)", refs.getPieceNumericValue(bonusIds.strength, index).value, 0);

sheet = ops.setVariableValue(sheet, strScoreId, 15);
index = refs.buildPieceIndex(sheet);
check("bonus live update (15 -> +2)", refs.getPieceNumericValue(bonusIds.strength, index).value, 2);
sheet = ops.setVariableValue(sheet, strScoreId, 7);
index = refs.buildPieceIndex(sheet);
check("bonus live update (7 -> -2)", refs.getPieceNumericValue(bonusIds.strength, index).value, -2);

// --- saving throws: cross-card reference + proficiency checkbox as 0/1 ---
const saves = schema.createSavingThrowsCard({ abilityBonusPieceIds: bonusIds, proficiencyBonus: 3 });
sheet = ops.addCardToPage(sheet, page1.id, saves);
const strSaveModule = sheet.cards[saves.id].modules[sheet.cards[saves.id].moduleOrder[0]];
const [strProfId, strSaveBonusId] = strSaveModule.pieceOrder;

index = refs.buildPieceIndex(sheet);
check("save = ability bonus when not proficient", refs.getPieceNumericValue(strSaveBonusId, index).value, -2);
sheet = ops.setCheckboxValue(sheet, strProfId, true);
index = refs.buildPieceIndex(sheet);
check("save = bonus + prof when checked", refs.getPieceNumericValue(strSaveBonusId, index).value, 1);
sheet = ops.setVariableValue(sheet, strScoreId, 18);
index = refs.buildPieceIndex(sheet);
check("save follows ability change live", refs.getPieceNumericValue(strSaveBonusId, index).value, 7);

// --- health: damage/heal buttons with clamps ---
const health = schema.createHealthCard();
sheet = ops.addCardToPage(sheet, page1.id, health);
const healthCard = sheet.cards[health.id];
const [curModId, maxModId, , dhModId] = healthCard.moduleOrder;
const curHpId = healthCard.modules[curModId].pieceOrder[0];
const maxHpId = healthCard.modules[maxModId].pieceOrder[0];
const [amountId, damageBtnId, healBtnId] = healthCard.modules[dhModId].pieceOrder;

sheet = ops.setTextPlain(sheet, amountId, "4");
sheet = ops.pressButton(sheet, damageBtnId);
index = refs.buildPieceIndex(sheet);
check("damage 4 (10 -> 6)", refs.getPieceNumericValue(curHpId, index).value, 6);

sheet = ops.setTextPlain(sheet, amountId, "99");
sheet = ops.pressButton(sheet, damageBtnId);
index = refs.buildPieceIndex(sheet);
check("damage clamps at 0", refs.getPieceNumericValue(curHpId, index).value, 0);

sheet = ops.setTextPlain(sheet, amountId, "50");
sheet = ops.pressButton(sheet, healBtnId);
index = refs.buildPieceIndex(sheet);
check("heal clamps at max HP", refs.getPieceNumericValue(curHpId, index).value, 10);

// --- text piece with a live ref segment ---
const feat = schema.createCustomCard("Healer's Kit (Feat)");
sheet = ops.addCardToPage(sheet, page1.id, feat);
const descModule = schema.createModuleForType("text", {
	label: "Description",
	segments: [
		{ type: "text", value: "regain HP equal to the roll plus " },
		{ type: "ref", pieceId: bonusIds.wisdom },
	],
});
sheet = ops.addModuleToCard(sheet, feat.id, descModule);
const descPieceId = descModule.pieceOrder[0];

index = refs.buildPieceIndex(sheet);
check("text ref resolves", refs.getPieceTextValue(descPieceId, index).text, "regain HP equal to the roll plus 0");
const wisScoreId = sheet.cards[abilities.id].modules[sheet.cards[abilities.id].moduleOrder[4]].pieceOrder[0];
sheet = ops.setVariableValue(sheet, wisScoreId, 16);
index = refs.buildPieceIndex(sheet);
check("text ref is live", refs.getPieceTextValue(descPieceId, index).text, "regain HP equal to the roll plus 3");

// --- circular reference degrades to error, no hang ---
let cyclic = schema.createSheet("Cycle");
const cCard = schema.createCustomCard("Loop");
const a = schema.createModuleForType("number", { label: "A" });
const b = schema.createModuleForType("number", { label: "B" });
cyclic = ops.addCardToPage(cyclic, cyclic.pages[0].id, cCard);
cyclic = ops.addModuleToCard(cyclic, cCard.id, a);
cyclic = ops.addModuleToCard(cyclic, cCard.id, b);
cyclic = ops.setVariableFormula(cyclic, a.pieceOrder[0], `#{${b.pieceOrder[0]}} + 1`);
cyclic = ops.setVariableFormula(cyclic, b.pieceOrder[0], `#{${a.pieceOrder[0]}} + 1`);
const cycleResult = refs.getPieceNumericValue(a.pieceOrder[0], refs.buildPieceIndex(cyclic));
check("cycle -> error", typeof cycleResult.error, "string");

// --- missing reference degrades to error ---
const dangling = formula.evaluateFormula("#{nonexistent} + 1", (id) => {
	const r = refs.getPieceNumericValue(id, index);
	if (r.error) throw new formula.FormulaError(r.error);
	return r.value;
});
check("missing ref -> error", dangling.error, "Missing reference");

// --- delete guard ---
let del = ops.deleteCard(sheet, abilities.id);
check("delete blocked while referenced", del.ok, false);
check("blockers listed", del.referencedBy.map((r) => r.cardTitle).sort(), ["Healer's Kit (Feat)", "Saving Throws"]);

del = ops.deleteCard(sheet, saves.id);
check("unreferenced card deletes fine", del.ok, true);
sheet = del.sheet;
del = ops.deleteCard(sheet, abilities.id);
check("still blocked by feat text ref", del.referencedBy.map((r) => r.cardTitle), ["Healer's Kit (Feat)"]);
sheet = ops.setTextPlain(sheet, descPieceId, "no more refs");
del = ops.deleteCard(sheet, abilities.id);
check("deletable once refs removed", del.ok, true);

// --- shared card across pages: shared data, independent layout ---
let multi = schema.createSheet("Multi");
const mAbilities = schema.createAbilityScoresCard();
multi = ops.addCardToPage(multi, multi.pages[0].id, mAbilities);
multi = ops.addPage(multi);
const mPage2 = multi.pages[1];
multi = ops.insertExistingCardOnPage(multi, mPage2.id, mAbilities.id);
const layout1 = multi.pages[0].cardLayouts[0];
const layout2 = multi.pages[1].cardLayouts[0];
check("both layouts point at same card", layout1.cardId === layout2.cardId, true);
check("layout entries are distinct", layout1.id !== layout2.id, true);

const reversed = [...layout2.moduleOrder].reverse();
multi = ops.setLayoutModuleOrder(multi, mPage2.id, layout2.id, reversed);
check("page 2 reorder", multi.pages[1].cardLayouts[0].moduleOrder, reversed);
check("page 1 untouched", multi.pages[0].cardLayouts[0].moduleOrder, layout1.moduleOrder);

multi = ops.removeModuleFromLayout(multi, mPage2.id, layout2.id, reversed[0]);
check("remove from layout keeps data", Object.keys(multi.cards[mAbilities.id].modules).length, 6);
check("layout shrank", multi.pages[1].cardLayouts[0].moduleOrder.length, 5);

// --- module added to card appears in every layout ---
multi = ops.addModuleToCard(multi, mAbilities.id, schema.createAbilityScoreModule("Sanity", 6));
check("new module in page 1 layout", multi.pages[0].cardLayouts[0].moduleOrder.length, 7);
check("new module in page 2 layout", multi.pages[1].cardLayouts[0].moduleOrder.length, 6);

// --- arrangement ops: per-page sizes and card order ---
const arrLayout = multi.pages[0].cardLayouts[0];
const arrModuleIds = arrLayout.moduleOrder;
multi = ops.setCardLayoutArrangement(multi, multi.pages[0].id, arrLayout.id, {
	moduleOrder: arrModuleIds.slice(0, 3),
	moduleSizes: { [arrModuleIds[0]]: 200, [arrModuleIds[5]]: 150 },
});
let arrAfter = multi.pages[0].cardLayouts[0];
check("arrangement sets order", arrAfter.moduleOrder.length, 3);
check("arrangement keeps sizes for kept modules", arrAfter.moduleSizes[arrModuleIds[0]], 200);
check("arrangement prunes sizes for removed modules", arrModuleIds[5] in arrAfter.moduleSizes, false);

const secondCard = schema.createHealthCard();
multi = ops.addCardToPage(multi, multi.pages[0].id, secondCard);
const [layoutA, layoutB] = multi.pages[0].cardLayouts;
multi = ops.setPageArrangement(multi, multi.pages[0].id, {
	layoutOrder: [layoutB.id, layoutA.id],
	cardWidths: { [layoutB.id]: 500, [layoutA.id]: null },
});
check("page order swapped", multi.pages[0].cardLayouts.map((l) => l.id), [layoutB.id, layoutA.id]);
check("card width set", multi.pages[0].cardLayouts[0].cardWidth, 500);
check("null width clears", "cardWidth" in multi.pages[0].cardLayouts[1], false);
multi = ops.setPageArrangement(multi, multi.pages[0].id, { layoutOrder: [layoutA.id], cardWidths: {} });
check("layouts missing from order are kept", multi.pages[0].cardLayouts.length, 2);

// --- storage round trip ---
check("upsert new", storage.upsertCharacterSheet(sheet), true);
check("round trip", storage.getCharacterSheet(sheet.id)?.name, "Test");
sheet = { ...sheet, name: "Renamed" };
storage.upsertCharacterSheet(sheet);
check("upsert replaces, not duplicates", storage.getSavedCharacterSheets().length, 1);
check("updated name persisted", storage.getCharacterSheet(sheet.id)?.name, "Renamed");
check("delete", storage.deleteCharacterSheet(sheet.id), true);
check("gone", storage.getCharacterSheet(sheet.id), null);

console.log(failures ? `\n${failures} FAILURES` : "\nAll tests passed");
process.exit(failures ? 1 : 0);
