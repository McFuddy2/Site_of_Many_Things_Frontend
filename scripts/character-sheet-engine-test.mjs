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
const engine = await import(`${BASE}/character_sheet/engine/engine.js`);
const expression = await import(`${BASE}/character_sheet/engine/expression.js`);
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

const valueOf = (s, pieceId) => engine.readSheetValue(s, { piece: pieceId }).value;
const errorOf = (s, pieceId) => engine.readSheetValue(s, { piece: pieceId }).error;

// --- ability scores: bonus auto-calculates and stays live ---
let sheet = schema.createSheet("Test");
const page1 = sheet.pages[0];
const abilities = schema.createAbilityScoresCard();
sheet = ops.addCardToPage(sheet, page1.id, abilities);

const abilityModule = (index) => sheet.cards[abilities.id].modules[sheet.cards[abilities.id].moduleOrder[index]];
const [strScoreId, strBonusId] = abilityModule(0).pieceOrder;
const wisBonusId = abilityModule(4).pieceOrder[1];

check("default bonus (10 -> 0)", valueOf(sheet, strBonusId), 0);
sheet = ops.setVariableValue(sheet, strScoreId, 15);
check("bonus live update (15 -> +2)", valueOf(sheet, strBonusId), 2);
sheet = ops.setVariableValue(sheet, strScoreId, 7);
check("bonus live update (7 -> -2)", valueOf(sheet, strBonusId), -2);

// --- saving throws: role link to the ability + proficiency checkbox as 0/1 ---
const saves = schema.createSavingThrowsCard({ proficiencyBonus: 3 });
sheet = ops.addCardToPage(sheet, page1.id, saves);
const strSaveModule = sheet.cards[saves.id].modules[sheet.cards[saves.id].moduleOrder[0]];
const [strProfId, strSaveBonusId] = strSaveModule.pieceOrder;

check("save = ability bonus when not proficient", valueOf(sheet, strSaveBonusId), -2);
sheet = ops.setCheckboxValue(sheet, strProfId, true);
check("save = bonus + prof when checked", valueOf(sheet, strSaveBonusId), 1);
sheet = ops.setVariableValue(sheet, strScoreId, 18);
check("save follows ability change live", valueOf(sheet, strSaveBonusId), 7);

// --- health: damage/heal buttons with clamps ---
const health = schema.createHealthCard();
sheet = ops.addCardToPage(sheet, page1.id, health);
const healthCard = sheet.cards[health.id];
const [curModId, maxModId, , dhModId] = healthCard.moduleOrder;
const curHpId = healthCard.modules[curModId].pieceOrder[0];
const [amountId, damageBtnId, healBtnId] = healthCard.modules[dhModId].pieceOrder;

sheet = ops.setTextPlain(sheet, amountId, "4");
sheet = ops.pressButton(sheet, damageBtnId);
check("damage 4 (10 -> 6)", valueOf(sheet, curHpId), 6);

sheet = ops.setTextPlain(sheet, amountId, "99");
sheet = ops.pressButton(sheet, damageBtnId);
check("damage clamps at 0", valueOf(sheet, curHpId), 0);

sheet = ops.setTextPlain(sheet, amountId, "50");
sheet = ops.pressButton(sheet, healBtnId);
check("heal clamps at max HP", valueOf(sheet, curHpId), 10);

// --- text piece with a live chip ---
const feat = schema.createCustomCard("Healer's Kit (Feat)");
sheet = ops.addCardToPage(sheet, page1.id, feat);
const descModule = schema.createModuleForType("text", {
	label: "Description",
	segments: [{ type: "text", value: "regain HP equal to the roll plus " }, schema.createChipSegment(expression.pieceSrc(wisBonusId))],
});
sheet = ops.addModuleToCard(sheet, feat.id, descModule);
const descPieceId = descModule.pieceOrder[0];

check("text chip resolves", valueOf(sheet, descPieceId), "regain HP equal to the roll plus 0");
const wisScoreId = abilityModule(4).pieceOrder[0];
sheet = ops.setVariableValue(sheet, wisScoreId, 16);
check("text chip is live", valueOf(sheet, descPieceId), "regain HP equal to the roll plus 3");

// --- circular reference degrades to error, no hang ---
let cyclic = schema.createSheet("Cycle");
const cCard = schema.createCustomCard("Loop");
const a = schema.createModuleForType("number", { label: "A" });
const b = schema.createModuleForType("number", { label: "B" });
cyclic = ops.addCardToPage(cyclic, cyclic.pages[0].id, cCard);
cyclic = ops.addModuleToCard(cyclic, cCard.id, a);
cyclic = ops.addModuleToCard(cyclic, cCard.id, b);
cyclic = ops.setReference(cyclic, { kind: "value", pieceId: a.pieceOrder[0] }, expression.add(expression.pieceSrc(b.pieceOrder[0]), expression.num(1)));
cyclic = ops.setReference(cyclic, { kind: "value", pieceId: b.pieceOrder[0] }, expression.add(expression.pieceSrc(a.pieceOrder[0]), expression.num(1)));
check("cycle -> error", errorOf(cyclic, a.pieceOrder[0]), "Circular reference");

// --- delete guard ---
let del = ops.deleteCard(sheet, abilities.id);
check("delete blocked while referenced", del.ok, false);
check(
	"blockers listed",
	[...new Set(del.dependents.map((d) => sheet.cards[d.cardId].title))].sort(),
	["Healer's Kit (Feat)", "Saving Throws"]
);

del = ops.deleteCard(sheet, saves.id);
check("unreferenced card deletes fine", del.ok, true);
sheet = del.sheet;
del = ops.deleteCard(sheet, abilities.id);
check("still blocked by feat chip", [...new Set(del.dependents.map((d) => sheet.cards[d.cardId].title))], ["Healer's Kit (Feat)"]);
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

// --- arrangement ops: unit rects, never smaller than the modules ---
const arrLayout = multi.pages[0].cardLayouts[0];
const arrModuleIds = arrLayout.moduleOrder;
multi = ops.setCardLayoutArrangement(multi, multi.pages[0].id, arrLayout.id, {
	moduleOrder: arrModuleIds.slice(0, 3),
	moduleRects: Object.fromEntries(arrModuleIds.map((id, i) => [id, { x: i * 5, y: 0, w: 5, h: 5 }])),
	cardRect: { w: 2, h: 2 },
});
let arrAfter = multi.pages[0].cardLayouts[0];
check("arrangement sets order", arrAfter.moduleOrder.length, 3);
check("arrangement keeps rects for kept modules", arrAfter.moduleRects[arrModuleIds[0]], { x: 0, y: 0, w: 5, h: 5 });
check("arrangement prunes rects for removed modules", arrModuleIds[5] in arrAfter.moduleRects, false);
check("card never smaller than its modules", [arrAfter.w >= 16, arrAfter.h >= 8], [true, true]);

const secondCard = schema.createHealthCard();
multi = ops.addCardToPage(multi, multi.pages[0].id, secondCard, { maxCols: 60 });
const [layoutA, layoutB] = multi.pages[0].cardLayouts;
check("new card doesn't overlap", layoutB.x >= layoutA.x + layoutA.w || layoutB.y >= layoutA.y + layoutA.h, true);
multi = ops.setPageArrangement(multi, multi.pages[0].id, { rects: { [layoutB.id]: { x: -4, y: 3, w: 1, h: 1 } } });
const movedB = multi.pages[0].cardLayouts[1];
check("cards can't go negative", movedB.x, 0);
check("card resize floors at its content", [movedB.w, movedB.h], [layoutB.w, layoutB.h]);

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
