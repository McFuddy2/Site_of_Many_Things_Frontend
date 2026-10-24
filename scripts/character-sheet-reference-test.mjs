// Tests for the reference engine (linked values & math).
// Run from the project root with:  node scripts/character-sheet-reference-test.mjs
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const BASE = new URL("../src/utils", import.meta.url).href;

// Minimal localStorage mock so the storage module works under node.
const store = new Map();
globalThis.localStorage = {
	getItem: (k) => (store.has(k) ? store.get(k) : null),
	setItem: (k, v) => store.set(k, String(v)),
	removeItem: (k) => store.delete(k),
};

const schema = await import(`${BASE}/character_sheet/schema.js`);
const cards = await import(`${BASE}/character_sheet/cardDefinitions.js`);
const ops = await import(`${BASE}/character_sheet/sheetOps.js`);
const refs = await import(`${BASE}/character_sheet/references.js`);
const engineLib = await import(`${BASE}/character_sheet/engine/engine.js`);
const ex = await import(`${BASE}/character_sheet/engine/expression.js`);
const describe = await import(`${BASE}/character_sheet/engine/describe.js`);
const { historyReducer } = await import(`${BASE}/character_sheet/sheetReducer.js`);
const { createHistoryState } = await import(`${BASE}/character_sheet/history.js`);
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

const evaluate = (expr, sources = {}) => ex.evaluateExpression(expr, (src) => ({ value: sources[src.piece], error: null }));
const read = (sheet, pieceId) => engineLib.createEngine(sheet).values.get(pieceId);
const valueOf = (sheet, pieceId) => read(sheet, pieceId)?.value;
const stateOf = (sheet, pieceId) => read(sheet, pieceId)?.state;
const piecesOf = (card, moduleIndex) => card.modules[card.moduleOrder[moduleIndex]].pieceOrder;
const live = (sheet, card) => sheet.cards[card.id];

function newSheet(...cards) {
	let sheet = schema.createSheet("Test");
	for (const card of cards) {
		sheet = ops.addCardToPage(sheet, sheet.pages[0].id, card, { maxCols: 60 });
	}
	return sheet;
}

// A custom card of plain number modules, one per label.
function numberCard(title, labels) {
	const card = schema.createCustomCard(title);
	for (const label of labels) {
		const module = schema.createNumberModule(label, 0);
		card.modules[module.id] = module;
		card.moduleOrder.push(module.id);
	}
	return card;
}
const numberIds = (card) => card.moduleOrder.map((moduleId) => card.modules[moduleId].pieceOrder[0]);

// Puts a reference straight onto a piece, as a card definition would (ops
// always save hand-made references by id, so they can't make a default one).
function withRef(sheet, cardId, pieceId, ref) {
	const card = sheet.cards[cardId];
	const moduleId = card.moduleOrder.find((id) => card.modules[id].pieces[pieceId]);
	const module = card.modules[moduleId];
	const piece = { ...module.pieces[pieceId], ref };
	return {
		...sheet,
		cards: { ...sheet.cards, [cardId]: { ...card, modules: { ...card.modules, [moduleId]: { ...module, pieces: { ...module.pieces, [pieceId]: piece } } } } },
	};
}

// ---------- Built-in rules ----------

for (const [score, modifier] of [[1, -5], [9, -1], [10, 0], [15, 2], [20, 5]]) {
	check(`ability modifier of ${score} is ${modifier}`, evaluate(ex.fn("abilityModifier", ex.num(score))).value, modifier);
}
for (const [level, bonus] of [[1, 2], [4, 2], [5, 3], [8, 3], [9, 4], [12, 4], [13, 5], [16, 5], [17, 6], [20, 6], [0, 2], [-3, 2], [21, 6], [30, 6]]) {
	check(`proficiency bonus at level ${level} is ${bonus}`, evaluate(ex.lookup("proficiencyBonusByLevel", ex.num(level))).value, bonus);
}

// ---------- Math, coercion, errors ----------

check("checkbox counts as 1", evaluate(ex.mul(ex.pieceSrc("box"), ex.num(3)), { box: true }).value, 3);
check("unchecked counts as 0", evaluate(ex.mul(ex.pieceSrc("box"), ex.num(3)), { box: false }).value, 0);
for (const state of [0, 1, 2]) {
	check(`tri-state ${state} × 2`, evaluate(ex.mul(ex.pieceSrc("tri"), ex.num(2)), { tri: state }).value, state * 2);
}
check("blank text counts as 0", evaluate(ex.add(ex.pieceSrc("t"), ex.num(4)), { t: "" }).value, 4);
check("numeric text works in math", evaluate(ex.add(ex.pieceSrc("t"), ex.num(4)), { t: " 3 " }).value, 7);
check("non-numeric text in math is an error", evaluate(ex.add(ex.pieceSrc("t"), ex.num(4)), { t: "abc" }).error, "“abc” isn't a number");
check("divide by zero is an error", evaluate(ex.div(ex.num(1), ex.num(0))).error, "Can't divide by zero");
check("round down / round up", [evaluate(ex.fn("floor", ex.num(-2.5))).value, evaluate(ex.fn("ceil", ex.num(2.1))).value], [-3, 3]);
check("min / max", [evaluate(ex.fn("min", ex.num(3), ex.num(-1))).value, evaluate(ex.fn("max", ex.num(3), ex.num(8))).value], [-1, 8]);
check("if/else true branch", evaluate(ex.ifThen(ex.num(5), ">=", ex.num(5), ex.num(1), ex.num(2))).value, 1);
check("if/else false branch", evaluate(ex.ifThen(ex.num(4), ">=", ex.num(5), ex.num(1), ex.num(2))).value, 2);
check("≠ compares text", evaluate(ex.ifThen(ex.text("a"), "!=", ex.text("b"), ex.num(1), ex.num(0))).value, 1);
check("no float noise", evaluate(ex.add(ex.num(0.1), ex.num(0.2))).value, 0.3);
check("unknown function is an error, not a throw", typeof evaluate({ fn: "sqrt", args: [ex.num(4)] }).error, "string");
check("empty expression is an error", typeof evaluate(null).error, "string");
check("custom ladder clamps", ex.lookupLadder([[0, "low"], [10, "high"]], -5), "low");

// ---------- Sheet: live values ----------

{
	const abilities = cards.createStandardCard("abilityScores");
	let sheet = newSheet(abilities);
	const [scoreId, bonusId] = piecesOf(abilities, 0);
	for (const [score, modifier] of [[1, -5], [9, -1], [10, 0], [15, 2], [20, 5]]) {
		sheet = ops.setPieceValue(sheet, scoreId, score);
		check(`Strength ${score} → Bonus ${modifier}`, valueOf(sheet, bonusId), modifier);
	}
	check("a default reference reads as linked", stateOf(sheet, bonusId), "linked");
}

// ---------- Only dependents recompute ----------

{
	const abilities = cards.createStandardCard("abilityScores");
	const saves = cards.createStandardCard("savingThrows");
	let sheet = newSheet(abilities, saves);
	const before = engineLib.createEngine(sheet);
	const [strScore, strBonus] = piecesOf(abilities, 0);
	const dexBonus = piecesOf(abilities, 1)[1];
	const strSave = piecesOf(saves, 0)[1];
	sheet = ops.setPieceValue(sheet, strScore, 14);
	const after = engineLib.createEngine(sheet, before);
	check("value change recomputes incrementally", after.recomputed.length < after.nodes.size, true);
	check("recomputes the score, its bonus and its save", [strScore, strBonus, strSave].every((id) => after.recomputed.includes(id)), true);
	check("leaves unrelated values alone", after.recomputed.includes(dexBonus), false);
	check("recomputed exactly the chain", after.recomputed.length, 3);
	check("incremental result matches a full rebuild", after.values.get(strSave).value, engineLib.createEngine(sheet).values.get(strSave).value);
}

// ---------- Cycles ----------

{
	const card = numberCard("Loop", ["A", "B", "C"]);
	let sheet = newSheet(card);
	const [a, b, c] = numberIds(card);
	let engine = engineLib.createEngine(sheet);
	check("direct cycle (a field using itself) is rejected", engineLib.checkSource(engine, a, { piece: a }), "A field can't use its own value");
	sheet = ops.setReference(sheet, { kind: "value", pieceId: b }, ex.pieceSrc(a));
	sheet = ops.setReference(sheet, { kind: "value", pieceId: c }, ex.pieceSrc(b));
	engine = engineLib.createEngine(sheet);
	check("indirect cycle is rejected at pick time", engineLib.checkSource(engine, a, { piece: c }), "That would make a loop — it already depends on this field");
	check("a safe source is allowed", engineLib.checkSource(engine, c, { piece: a }), null);
	check("checkExpression finds the bad source", engineLib.checkExpression(engine, a, ex.add(ex.num(1), ex.pieceSrc(c))) !== null, true);
	// The evaluator guards on its own too.
	sheet = ops.setReference(sheet, { kind: "value", pieceId: a }, ex.pieceSrc(c));
	check("a forced cycle evaluates to an error", read(sheet, a).error, "Circular reference");
	check("…and so does everything in it", read(sheet, c).error, "Circular reference");

	const image = schema.createImageModule("Portrait");
	sheet = ops.addModuleToCard(sheet, card.id, image);
	check("images can't be sources", engineLib.checkSource(engineLib.createEngine(sheet), b, { piece: image.pieceOrder[0] }), "Images can't be used in math");
}

// ---------- Roles: pending → linked, unlinked never overwritten ----------

{
	const skills = cards.createStandardCard("skills");
	let sheet = newSheet(skills);
	const acrobatics = piecesOf(skills, 1)[1];
	const athletics = piecesOf(skills, 4)[1];
	check("skill without an Ability Scores card is pending", stateOf(sheet, acrobatics), "pending");
	check("…and is a plain editable field", read(sheet, acrobatics).computed, false);

	sheet = ops.setPieceValue(sheet, athletics, 5);
	check("typing into a pending field unlinks it", sheet.cards[skills.id].modules[skills.moduleOrder[4]].pieces[athletics].ref.unlinked, "typed");

	const abilities = cards.createStandardCard("abilityScores");
	sheet = ops.addCardToPage(sheet, sheet.pages[0].id, abilities, { maxCols: 60 });
	sheet = ops.setPieceValue(sheet, piecesOf(abilities, 1)[0], 16); // Dexterity 16 → +3
	check("with only Ability Scores, a skill is pending and needs more data", [stateOf(sheet, acrobatics), read(sheet, acrobatics).partial], ["pending", true]);
	sheet = ops.addCardToPage(sheet, sheet.pages[0].id, cards.createStandardCard("proficiencyBonus"), { maxCols: 60 });
	check("pending connects when the card is added", stateOf(sheet, acrobatics), "linked");
	check("…and computes from it", valueOf(sheet, acrobatics), 3);
	check("auto-connect leaves a typed value alone", [stateOf(sheet, athletics), valueOf(sheet, athletics)], ["unlinked", 5]);

	// Partly resolved: one role found, one not.
	const custom = numberCard("Mixed", ["Total"]);
	sheet = ops.addCardToPage(sheet, sheet.pages[0].id, custom, { maxCols: 60 });
	const total = numberIds(custom)[0];
	const mixed = schema.createReference(ex.add(ex.roleSrc("ability.dex.bonus"), ex.roleSrc("character.level")), { origin: "default" });
	sheet = withRef(sheet, custom.id, total, mixed);
	const partial = read(sheet, total);
	check("partly resolved reference is pending and needs more data", [partial.state, partial.partial, partial.error], ["pending", true, "Needs more data"]);
	check("…and says which role is missing", partial.missingRoles, ["character.level"]);
	sheet = ops.addCardToPage(sheet, sheet.pages[0].id, cards.createStandardCard("basicInfo"), { maxCols: 60 });
	check("…then connects once every role resolves", [stateOf(sheet, total), valueOf(sheet, total)], ["linked", 4]);

	// Explicit Unlink keeps the value, stays unlinked.
	const unlinked = ops.unlinkReference(sheet, { kind: "value", pieceId: acrobatics });
	check("Unlink keeps the current value as a literal", [stateOf(unlinked, acrobatics), valueOf(unlinked, acrobatics)], ["unlinked", 3]);
	check("Remove clears the reference and value", [read(ops.removeReference(sheet, { kind: "value", pieceId: acrobatics }), acrobatics).state, valueOf(ops.removeReference(sheet, { kind: "value", pieceId: acrobatics }), acrobatics)], [null, 0]);

	// First match wins: page order, then reading order.
	const second = cards.createStandardCard("abilityScores");
	let two = ops.addPage(sheet);
	two = ops.addCardToPage(two, two.pages[1].id, second, { maxCols: 60 });
	two = ops.setPieceValue(two, piecesOf(second, 1)[0], 20);
	check("a role resolves to the first card by page order", valueOf(two, acrobatics), 3);
	check("readSheetValue reads by role from outside the UI", engineLib.readSheetValue(two, { role: "ability.dex.bonus" }).value, 3);
}

// ---------- Delete: blocked, delete anyway, missing, reconnect ----------

{
	const abilities = cards.createStandardCard("abilityScores");
	const saves = cards.createStandardCard("savingThrows");
	const custom = numberCard("Feat", ["Bonus HP"]);
	let sheet = newSheet(abilities, saves, custom, cards.createStandardCard("proficiencyBonus"));
	const [strScore, strBonus] = piecesOf(abilities, 0);
	const featBonus = numberIds(custom)[0];
	const strSave = piecesOf(saves, 0)[1];
	sheet = ops.setPieceValue(sheet, strScore, 18); // +4
	sheet = ops.setReference(sheet, { kind: "value", pieceId: featBonus }, ex.add(ex.pieceSrc(strBonus), ex.num(1)));
	check("hand-made reference computes", valueOf(sheet, featBonus), 5);

	const blocked = ops.deleteCard(sheet, abilities.id);
	check("delete is blocked while referenced", blocked.ok, false);
	const described = refs.canDeleteCard(sheet, abilities.id).dependents;
	check("dependents list every field (6 saves + the feat)", described.length, 7);
	check("dependents name where they live", described.some((d) => d.label === "Feat › Bonus HP"), true);
	check("…clickable to the right card and module", described.find((d) => d.label === "Feat › Bonus HP").cardId, custom.id);

	const forced = ops.deleteCard(sheet, abilities.id, { force: true });
	sheet = forced.sheet;
	check("delete anyway removes the card", Boolean(sheet.cards[abilities.id]), false);
	check("dependent shows missing with its last known value", [stateOf(sheet, featBonus), valueOf(sheet, featBonus)], ["missing", 5]);
	check("role-based dependent too", [stateOf(sheet, strSave), valueOf(sheet, strSave)], ["missing", 4]);
	check("missing never throws, and has no error", read(sheet, featBonus).error, null);

	const again = cards.createStandardCard("abilityScores");
	sheet = ops.addCardToPage(sheet, sheet.pages[0].id, again, { maxCols: 60 });
	check("role-based reference reconnects when a matching card returns", [stateOf(sheet, strSave), valueOf(sheet, strSave)], ["linked", 0]);
	check("hand-made reference stays missing", stateOf(sheet, featBonus), "missing");
	sheet = ops.setReference(sheet, { kind: "value", pieceId: featBonus }, ex.pieceSrc(piecesOf(again, 0)[1]));
	check("…until it's edited", stateOf(sheet, featBonus), "linked");

	// A second holder of the role means nothing breaks.
	const spare = cards.createStandardCard("abilityScores");
	sheet = ops.addCardToPage(sheet, sheet.pages[0].id, spare, { maxCols: 60 });
	const roleOnly = refs.getDependents(sheet, refs.removalOf(sheet, { cardIds: [again.id] })).filter((d) => d.cardId === saves.id);
	check("a role another card can take over isn't a dependent", roleOnly.length, 0);

	// Rows: removing one never blocks, but its dependents keep their value.
	const deathSaves = cards.createStandardCard("deathSaves");
	const counter = numberCard("Counter", ["Successes"]);
	let rows = newSheet(deathSaves, counter);
	const successes = deathSaves.moduleOrder[0];
	rows = ops.setPieceValue(rows, deathSaves.modules[successes].pieceOrder[2], true);
	rows = ops.setReference(rows, { kind: "value", pieceId: numberIds(counter)[0] }, ex.checkedSrc(successes));
	check("checked count of a checkbox group", valueOf(rows, numberIds(counter)[0]), 1);
	rows = ops.setReference(rows, { kind: "value", pieceId: numberIds(counter)[0] }, ex.pieceSrc(deathSaves.modules[successes].pieceOrder[2]));
	rows = ops.removeModuleRow(rows, deathSaves.id, successes, 2);
	check("removing a referenced row leaves its last value", [stateOf(rows, numberIds(counter)[0]), valueOf(rows, numberIds(counter)[0])], ["missing", true]);

	// Pages.
	let paged = newSheet(schema.createCustomCard("Unused"));
	paged = ops.addPage(paged);
	const pageCard = cards.createStandardCard("abilityScores");
	paged = ops.addCardToPage(paged, paged.pages[1].id, pageCard, { maxCols: 60 });
	paged = ops.addCardToPage(paged, paged.pages[0].id, cards.createStandardCard("savingThrows"), { maxCols: 60 });
	check("a page's dependents are found too", refs.canDeletePage(paged, paged.pages[1].id).dependents.length, 6);
	check("a card shown elsewhere doesn't make its page's dependents", refs.canDeletePage(ops.insertExistingCardOnPage(paged, paged.pages[0].id, pageCard.id), paged.pages[1].id).ok, true);
}

// ---------- Duplicates ----------

{
	const external = numberCard("External", ["Source"]);
	const card = numberCard("Original", ["A", "B", "C"]);
	let sheet = newSheet(external, card);
	const [a, b, c] = numberIds(card);
	const outside = numberIds(external)[0];
	sheet = ops.setReference(sheet, { kind: "value", pieceId: b }, ex.mul(ex.pieceSrc(a), ex.num(2)));
	sheet = ops.setReference(sheet, { kind: "value", pieceId: c }, ex.pieceSrc(outside));
	const reader = numberCard("Reader", ["Reads A"]);
	sheet = ops.addCardToPage(sheet, sheet.pages[0].id, reader, { maxCols: 60 });
	sheet = ops.setReference(sheet, { kind: "value", pieceId: numberIds(reader)[0] }, ex.pieceSrc(a));

	const layoutId = sheet.pages[0].cardLayouts.find((layout) => layout.cardId === card.id).id;
	const copy = schema.cloneCard(live(sheet, card));
	sheet = ops.duplicateCards(sheet, sheet.pages[0].id, [{ sourceLayoutId: layoutId, card: copy }]);
	const [a2, b2, c2] = numberIds(copy);
	const sourcesOf = (pieceId) => ex.collectSources(engineLib.createEngine(sheet).index.pieces[pieceId].piece.ref.expr);
	check("reference inside the card points at the copy's own module", sourcesOf(b2), [{ piece: a2 }]);
	check("reference out of the card still points at the original source", sourcesOf(c2), [{ piece: outside }]);
	check("references into the card keep pointing at the original", sourcesOf(numberIds(reader)[0]), [{ piece: a }]);
	sheet = ops.setPieceValue(sheet, a2, 7);
	check("the copy computes on its own", [valueOf(sheet, b2), valueOf(sheet, b)], [14, 0]);

	const abilities = schema.cloneCard(cards.createStandardCard("abilityScores"));
	const [score, bonus] = piecesOf(abilities, 0);
	check("a duplicated Ability Scores card's Bonus follows its own Score", ex.collectSources(abilities.modules[abilities.moduleOrder[0]].pieces[bonus].ref.expr), [{ piece: score }]);
}

// ---------- Chips, dropdowns, rules, capacity ----------

{
	const abilities = cards.createStandardCard("abilityScores");
	const notes = schema.createCustomCard("Notes");
	const textModule = schema.createTextModule("Feature", { text: "Gain  Temp HP." });
	notes.modules[textModule.id] = textModule;
	notes.moduleOrder.push(textModule.id);
	let sheet = newSheet(abilities, notes);
	const textId = textModule.pieceOrder[0];
	const [conScore, conBonus] = piecesOf(abilities, 2);
	sheet = ops.setPieceValue(sheet, conScore, 14);
	const inserted = ops.insertChip(sheet, textId, ex.pieceSrc(conBonus), { offset: 5 });
	sheet = inserted.sheet;
	check("a chip sits between typed text", valueOf(sheet, textId), "Gain 2 Temp HP.");
	sheet = ops.setPieceValue(sheet, conScore, 18);
	check("…and updates live", valueOf(sheet, textId), "Gain 4 Temp HP.");
	check("Unlink turns a chip into its text", valueOf(ops.unlinkReference(sheet, { kind: "chip", pieceId: textId, refId: inserted.refId }), textId), "Gain 4 Temp HP.");
	const unlinkedChip = ops.unlinkReference(sheet, { kind: "chip", pieceId: textId, refId: inserted.refId });
	check("…leaving no chip behind", engineLib.createEngine(unlinkedChip).values.get(textId).computed, false);
	check("Remove drops the chip", valueOf(ops.removeReference(sheet, { kind: "chip", pieceId: textId, refId: inserted.refId }), textId), "Gain  Temp HP.");

	// Dropdown of references.
	const attack = schema.createCustomCard("Attack");
	const dropdown = schema.createDropdownModule("Ability", [
		{ label: "STR", ref: schema.createReference(ex.roleSrc("ability.str.bonus"), { origin: "default" }) },
		{ label: "CON", ref: schema.createReference(ex.roleSrc("ability.con.bonus"), { origin: "default" }) },
		"None",
	]);
	const toHit = schema.createNumberModule("To Hit", 0);
	for (const module of [dropdown, toHit]) {
		attack.modules[module.id] = module;
		attack.moduleOrder.push(module.id);
	}
	sheet = ops.addCardToPage(sheet, sheet.pages[0].id, attack, { maxCols: 60 });
	const dropdownId = dropdown.pieceOrder[0];
	const toHitId = toHit.pieceOrder[0];
	sheet = ops.setReference(sheet, { kind: "value", pieceId: toHitId }, ex.add(ex.pieceSrc(dropdownId), ex.num(2)));
	check("dropdown value is the selected option's reference", valueOf(sheet, toHitId), 2);
	const options = live(sheet, attack).modules[dropdown.id].pieces[dropdownId].options;
	sheet = ops.setPieceValue(sheet, dropdownId, options[1].id);
	check("changing the selection updates dependents", valueOf(sheet, toHitId), 6);
	sheet = ops.setPieceValue(sheet, dropdownId, options[2].id);
	check("a plain option's value is its label", valueOf(sheet, dropdownId), "None");

	// Rules: lock when Level < 5, counted as 0 while locked, contents kept.
	const basics = cards.createStandardCard("basicInfo");
	const levelId = basics.modules[basics.moduleOrder[1]].pieceOrder[0];
	sheet = ops.addCardToPage(sheet, sheet.pages[0].id, basics, { maxCols: 60 });
	const featureModule = schema.createNumberModule("Feature Bonus", 3);
	sheet = ops.addModuleToCard(sheet, notes.id, featureModule);
	const featureId = featureModule.pieceOrder[0];
	const user = numberCard("User", ["Total"]);
	sheet = ops.addCardToPage(sheet, sheet.pages[0].id, user, { maxCols: 60 });
	sheet = ops.setReference(sheet, { kind: "value", pieceId: numberIds(user)[0] }, ex.add(ex.pieceSrc(featureId), ex.num(10)));
	sheet = ops.setModuleRules(sheet, featureModule.id, [schema.createRule({ left: ex.pieceSrc(levelId), cmp: "<", right: ex.num(5), effect: "locked" })]);
	let engine = engineLib.createEngine(sheet);
	check("module locks while Level < 5", engineLib.moduleLockState(engine, featureModule.id), "locked");
	check("a locked module counts as 0 in math", valueOf(sheet, numberIds(user)[0]), 10);
	check("…but keeps its contents", valueOf(sheet, featureId), 3);
	sheet = ops.setPieceValue(sheet, levelId, 5);
	check("unlocks at Level 5", engineLib.moduleLockState(engineLib.createEngine(sheet), featureModule.id), "none");
	check("…and counts again", valueOf(sheet, numberIds(user)[0]), 13);
	sheet = ops.setModuleRules(sheet, featureModule.id, [schema.createRule({ left: ex.pieceSrc(levelId), cmp: ">=", right: ex.num(5), effect: "hidden" })]);
	check("hidden counts as 0 too", [engineLib.moduleLockState(engineLib.createEngine(sheet), featureModule.id), valueOf(sheet, numberIds(user)[0])], ["hidden", 10]);

	// Capacity: box count follows a reference; checked states kept.
	const hitDice = cards.createStandardCard("hitDice");
	sheet = ops.addCardToPage(sheet, sheet.pages[0].id, hitDice, { maxCols: 60 });
	const [, totalModule, usedModule] = hitDice.moduleOrder;
	const totalId = hitDice.modules[totalModule].pieceOrder[0];
	check("Hit Dice comes with its box count linked to Total", ex.collectSources(hitDice.modules[usedModule].capacity.expr), [{ piece: totalId }]);
	sheet = ops.setReference(sheet, { kind: "capacity", moduleId: usedModule }, ex.pieceSrc(totalId));
	sheet = ops.setPieceValue(sheet, totalId, 5);
	for (let index = 0; index < 5; index += 1) {
		sheet = ops.setBoxChecked(sheet, usedModule, index, true);
	}
	sheet = ops.setPieceValue(sheet, totalId, 2);
	engine = engineLib.createEngine(sheet);
	check("checked count only counts visible boxes", [engine.values.get(`${usedModule}:checked`).value, engine.values.get(`${usedModule}:checked`).boxes], [2, 2]);
	sheet = ops.setPieceValue(sheet, totalId, 5);
	check("raising the count restores checked boxes", engineLib.createEngine(sheet).values.get(`${usedModule}:checked`).value, 5);
	const capacityCheck = engineLib.checkSource(engineLib.createEngine(sheet), `${usedModule}:capacity`, { module: usedModule, field: "checked" });
	check("a group's count can't depend on its own checked count", capacityCheck !== null, true);
	const unlinkedBoxes = ops.unlinkReference(ops.setPieceValue(sheet, totalId, 3), { kind: "capacity", moduleId: usedModule });
	check("unlinking capacity keeps the count it showed", live(unlinkedBoxes, hitDice).modules[usedModule].pieceOrder.length, 3);

	// Names, for chips and dialogs.
	engine = engineLib.createEngine(sheet);
	check("source names read Card › Module · Piece", describe.describeSource(engine, { piece: conBonus }), "Ability Scores › Constitution · Bonus");
	check("expressions read in words", describe.describeExpression(engine, ex.sub(ex.fn("floor", ex.div(ex.pieceSrc(conScore), ex.num(2))), ex.num(5))), "round down([Ability Scores › Constitution · Score] ÷ 2) − 5");
	check("unresolved roles say what they wait for", describe.describeSource(engine, { role: "proficiency.bonus" }), "Proficiency Bonus (no card yet)");
}

// ---------- Editor tokens ----------

{
	const tokens = await import(`${BASE}/character_sheet/engine/tokens.js`);
	const src = { t: "src", src: { piece: "score" } };
	// round down( [Score] ÷ 2 ) − 5, entered button by button.
	const typed = [{ t: "fn", name: "floor" }, src, { t: "op", value: "/" }, { t: "num", value: "2" }, { t: ")" }, { t: "op", value: "-" }, { t: "num", value: "5" }];
	const parsed = tokens.tokensToExpr(typed);
	check("tokens parse into an expression", parsed.expr, ex.sub(ex.fn("floor", ex.div(ex.pieceSrc("score"), ex.num(2))), ex.num(5)));
	check("…which evaluates (score 15 → +2)", evaluate(parsed.expr, { score: 15 }).value, 2);
	check("expression turns back into the same tokens", tokens.exprToTokens(parsed.expr), typed);
	check("precedence: × before +", tokens.tokensToExpr([{ t: "num", value: "1" }, { t: "op", value: "+" }, { t: "num", value: "2" }, { t: "op", value: "*" }, { t: "num", value: "3" }]).expr, ex.add(ex.num(1), ex.mul(ex.num(2), ex.num(3))));
	const grouped = ex.mul(ex.add(ex.num(1), ex.num(2)), ex.num(3));
	check("parentheses come back where needed", tokens.exprToTokens(grouped).map((token) => token.t), ["(", "num", "op", "num", ")", "op", "num"]);
	check("a − (b − c) keeps its parentheses", tokens.tokensToExpr(tokens.exprToTokens(ex.sub(ex.num(9), ex.sub(ex.num(4), ex.num(1))))).expr, ex.sub(ex.num(9), ex.sub(ex.num(4), ex.num(1))));
	check("unary minus", evaluate(tokens.tokensToExpr([{ t: "op", value: "-" }, { t: "num", value: "3" }]).expr).value, -3);
	check("min takes several values", evaluate(tokens.tokensToExpr([{ t: "fn", name: "min" }, { t: "num", value: "4" }, { t: "," }, { t: "num", value: "2" }, { t: ")" }]).expr).value, 2);
	check("built-in rules as functions", evaluate(tokens.tokensToExpr([{ t: "fn", name: "abilityModifier" }, { t: "num", value: "18" }, { t: ")" }]).expr).value, 4);
	check("lookup tables as functions", evaluate(tokens.tokensToExpr([{ t: "lookup", name: "proficiencyBonusByLevel" }, { t: "num", value: "9" }, { t: ")" }]).expr).value, 4);
	check("empty row says what to do", tokens.tokensToExpr([]).error, "Add a value or pick a source");
	check("dangling operator is explained", tokens.tokensToExpr([src, { t: "op", value: "+" }]).error, "Add a value after “+”");
	check("unclosed function is explained", tokens.tokensToExpr([{ t: "fn", name: "floor" }, src]).error, "Close “round down(” with “)”");
	check("two values in a row need an operator", tokens.tokensToExpr([src, { t: "num", value: "2" }]).error, "Add an operator before “2”");
	const ifElse = ex.ifThen(ex.pieceSrc("a"), ">=", ex.num(5), ex.num(1), ex.num(0));
	check("anything else is kept whole", tokens.tokensToExpr(tokens.exprToTokens(ex.add(ifElse, ex.num(1)))).expr, ex.add(ifElse, ex.num(1)));

	const card = numberCard("Preview", ["Score"]);
	let sheet = newSheet(card);
	sheet = ops.setPieceValue(sheet, numberIds(card)[0], 15);
	check("preview evaluates against the live sheet", engineLib.previewExpression(engineLib.createEngine(sheet), ex.fn("abilityModifier", ex.pieceSrc(numberIds(card)[0]))).value, 2);
}

// ---------- Phase 3: if/else, rules, dropdown options, linked box counts ----------

{
	const tokens = await import(`${BASE}/character_sheet/engine/tokens.js`);
	const ifElse = ex.ifThen(ex.pieceSrc("level"), ">=", ex.num(5), ex.num(2), ex.num(1));
	const row = tokens.exprToTokens(ifElse);
	check("if/else becomes tokens", row.map((token) => token.t), ["if", "src", "cmp", "num", "then", "num", "else", "num", ")"]);
	check("…and parses back", tokens.tokensToExpr(row).expr, ifElse);
	check("if/else evaluates (level 6 → 2)", evaluate(tokens.tokensToExpr(row).expr, { level: 6 }).value, 2);
	check("the if skeleton explains what's missing", tokens.tokensToExpr(tokens.IF_SKELETON).error, "Add a value before “≥”");
	check("a comparison outside if( is explained", tokens.tokensToExpr([{ t: "num", value: "1" }, { t: "cmp", value: "<" }, { t: "num", value: "2" }]).error, "“<” only works inside “if(”");
	check("missing else is explained", tokens.tokensToExpr(row.filter((token) => token.t !== "else")).error, "Add “else” after the “then” value");

	// Rules as a reference target.
	const basics = cards.createStandardCard("basicInfo");
	const card = numberCard("Feature", ["Bonus"]);
	let sheet = newSheet(basics, card);
	const levelId = basics.modules[basics.moduleOrder[1]].pieceOrder[0];
	const moduleId = card.moduleOrder[0];
	sheet = ops.setModuleRules(sheet, moduleId, [schema.createRule({ left: null, cmp: "<", right: ex.num(5), effect: "locked" })]);
	const ruleId = live(sheet, card).modules[moduleId].rules[0].id;
	check("an empty rule never fires", engineLib.moduleLockState(engineLib.createEngine(sheet), moduleId), "none");
	const ruleTarget = { kind: "rule", moduleId, ruleId };
	check("a rule's condition reads like a reference", ops.getTargetReference(sheet, ruleTarget).expr, null);
	sheet = ops.setReference(sheet, ruleTarget, ex.roleSrc("character.level"));
	check("editing a rule's condition saves it by id", live(sheet, card).modules[moduleId].rules[0].left, ex.pieceSrc(levelId));
	check("…and the rule fires (Level 1 < 5)", engineLib.moduleLockState(engineLib.createEngine(sheet), moduleId), "locked");
	check("the rule's target node is the module's lock", ops.targetNode(ruleTarget), `${moduleId}:lock`);
	check("a rule may read its own module", engineLib.checkSource(engineLib.createEngine(sheet), `${moduleId}:lock`, { piece: numberIds(card)[0] }), null);
	sheet = ops.updateRule(sheet, moduleId, ruleId, { cmp: ">=" });
	check("changing the comparison flips it", engineLib.moduleLockState(engineLib.createEngine(sheet), moduleId), "none");
	check("removing a rule's condition empties it", live(ops.removeReference(sheet, ruleTarget), card).modules[moduleId].rules[0].left, null);

	// Dropdown options: add, rename, reorder, delete; selection follows its option.
	const attack = schema.createCustomCard("Attack");
	const dropdown = schema.createDropdownModule("Ability", ["STR", "DEX"]);
	attack.modules[dropdown.id] = dropdown;
	attack.moduleOrder.push(dropdown.id);
	sheet = ops.addCardToPage(sheet, sheet.pages[0].id, attack, { maxCols: 60 });
	const dropdownId = dropdown.pieceOrder[0];
	const optionsOf = () => live(sheet, attack).modules[dropdown.id].pieces[dropdownId].options;
	const [str, dex] = optionsOf();
	sheet = ops.setPieceValue(sheet, dropdownId, dex.id);
	const con = schema.createDropdownOption("CON");
	sheet = ops.setDropdownOptions(sheet, dropdownId, [dex, { ...str, label: "Strength" }, con]);
	check("options can be added, renamed and reordered", optionsOf().map((option) => option.label), ["DEX", "Strength", "CON"]);
	check("the selection stays on its option", valueOf(sheet, dropdownId), "DEX");
	sheet = ops.setDropdownOptions(sheet, dropdownId, optionsOf().filter((option) => option.id !== dex.id));
	check("deleting the selected option selects the first", valueOf(sheet, dropdownId), "Strength");
	sheet = ops.setReference(sheet, { kind: "option", pieceId: dropdownId, optionId: con.id }, ex.num(7));
	sheet = ops.setPieceValue(sheet, dropdownId, con.id);
	check("an option's reference is set like any other", valueOf(sheet, dropdownId), 7);

	// Linked box counts.
	const hitDice = cards.createStandardCard("hitDice");
	sheet = ops.addCardToPage(sheet, sheet.pages[0].id, hitDice, { maxCols: 60 });
	const [, totalModule, usedModule] = hitDice.moduleOrder;
	const totalId = hitDice.modules[totalModule].pieceOrder[0];
	let state = createHistoryState(sheet);
	state = historyReducer(state, { type: "setPieceValue", pieceId: totalId, value: 5 });
	state = historyReducer(state, { type: "setReference", target: { kind: "capacity", moduleId: usedModule }, expr: ex.pieceSrc(totalId) });
	const used = () => live(state.sheet, hitDice).modules[usedModule];
	check("a linked group records the boxes it shows", used().shownBoxes, 5);
	state = historyReducer(state, { type: "setBoxChecked", moduleId: usedModule, index: 4, checked: true });
	const layoutHeight = () => state.sheet.pages[0].cardLayouts.find((layout) => layout.cardId === hitDice.id).moduleRects[usedModule].h;
	const before = layoutHeight();
	state = historyReducer(state, { type: "setPieceValue", pieceId: totalId, value: 20 });
	check("raising the count updates what it shows", used().shownBoxes, 20);
	check("…and grows the module to fit", layoutHeight() > before, true);
	state = historyReducer(state, { type: "setBoxChecked", moduleId: usedModule, index: 14, checked: true });
	check("ticking a box past the pieces adds them", used().pieceOrder.length, 15);
	state = historyReducer(state, { type: "setPieceValue", pieceId: totalId, value: 3 });
	check("shrinking hides boxes but keeps them", [used().shownBoxes, used().pieceOrder.length], [3, 15]);
	check("…and they don't count while hidden", engineLib.createEngine(state.sheet).values.get(`${usedModule}:checked`).value, 0);
	state = historyReducer(state, { type: "setPieceValue", pieceId: totalId, value: 15 });
	check("growing again brings their ticks back", engineLib.createEngine(state.sheet).values.get(`${usedModule}:checked`).value, 2);
	state = historyReducer(state, { type: "addPage" });
	state = historyReducer(state, { type: "undo" });
	check("undoing an earlier step keeps ticked-on boxes", used().pieceOrder.length, 15);
	state = historyReducer(state, { type: "unlinkReference", target: { kind: "capacity", moduleId: usedModule } });
	check("unlinking the count keeps the boxes it showed", [used().capacity, used().shownBoxes, used().pieceOrder.length], [null, undefined, 15]);

	// Loops through links that don't exist yet are caught at pick time.
	const fresh = cards.createStandardCard("hitDice");
	let loops = newSheet(fresh, numberCard("Reader", ["Reads"]));
	const freshUsed = fresh.moduleOrder[2];
	check(
		"a group's count can't come from its own checked count, even before it's linked",
		engineLib.checkSource(engineLib.createEngine(loops), `${freshUsed}:capacity`, { module: freshUsed, field: "checked" }) !== null,
		true
	);
	const reader = Object.values(loops.cards).find((each) => each.title === "Reader");
	const readsId = numberIds(reader)[0];
	const rageModule = fresh.moduleOrder[1];
	loops = ops.setReference(loops, { kind: "value", pieceId: readsId }, ex.pieceSrc(fresh.modules[rageModule].pieceOrder[0]));
	check(
		"a module's first rule can't test something that reads the module",
		engineLib.checkSource(engineLib.createEngine(loops), `${rageModule}:lock`, { piece: readsId }) !== null,
		true
	);
	check(
		"…but it can test the module's own pieces",
		engineLib.checkSource(engineLib.createEngine(loops), `${rageModule}:lock`, { piece: fresh.modules[rageModule].pieceOrder[0] }),
		null
	);

	const tile = cards.createStandardCard("abilityScores");
	const tileSheet = newSheet(tile);
	const strength = tile.moduleOrder[0];
	check(
		"a rule may test a piece that reads its own module (an ability's Bonus)",
		engineLib.checkSource(engineLib.createEngine(tileSheet), `${strength}:lock`, { piece: tile.modules[strength].pieceOrder[1] }),
		null
	);

	// −/+ on a group whose linked count is still pending claims it.
	const pendingGroup = schema.createCheckboxRowModule("Uses", 2);
	pendingGroup.capacity = schema.createReference(ex.roleSrc("proficiency.bonus"), { origin: "default" });
	let pending = newSheet(schema.createCustomCard("Feat"));
	const featId = Object.keys(pending.cards)[0];
	pending = ops.addModuleToCard(pending, featId, pendingGroup);
	pending = ops.addModuleRow(pending, featId, pendingGroup.id);
	check("−/+ on a pending count makes it the player's", pending.cards[featId].modules[pendingGroup.id].capacity.unlinked, "typed");
}

// ---------- Phase 4: standard cards ----------

{
	// A fresh sheet with every standard card.
	let sheet = schema.createSheet("Everything");
	const byType = {};
	for (const type of cards.STANDARD_CARD_TYPES) {
		byType[type] = cards.createStandardCard(type);
		sheet = ops.addCardToPage(sheet, sheet.pages[0].id, byType[type], { maxCols: 60 });
	}
	const moduleNamed = (type, label) => {
		const card = byType[type];
		return card.modules[card.moduleOrder.find((id) => card.modules[id].label === label)];
	};
	const valueIn = (type, label, index = 0) => valueOf(sheet, moduleNamed(type, label).pieceOrder[index]);
	const set = (type, label, index, value) => (sheet = ops.setPieceValue(sheet, moduleNamed(type, label).pieceOrder[index], value));

	check("no default reference is left pending or broken", (() => {
		const engine = engineLib.createEngine(sheet);
		return [...engine.values.entries()].filter(([, entry]) => entry.state && entry.state !== "linked").map(([id]) => id);
	})(), []);

	set("abilityScores", "Dexterity", 0, 16); // +3
	check("Dex Bonus follows its Score", valueIn("abilityScores", "Dexterity", 1), 3);
	check("…the Dexterity save", valueIn("savingThrows", "Dexterity", 1), 3);
	check("…Dex skills", [valueIn("skills", "Acrobatics", 1), valueIn("skills", "Stealth", 1), valueIn("skills", "Sleight of Hand", 1)], [3, 3, 3]);
	check("…Initiative", valueIn("initiative", "Initiative"), 3);
	check("…Armor Class (10 + Dex)", valueIn("armorClass", "Armor Class"), 13);
	set("abilityScores", "Wisdom", 0, 14); // +2
	check("Passive Perception = 10 + Perception", valueIn("passiveSkills", "Perception (WIS)"), 12);
	check("Passive Insight = 10 + Insight", valueIn("passiveSkills", "Insight (WIS)"), 12);
	check("Passive Investigation = 10 + Investigation", valueIn("passiveSkills", "Investigation (INT)"), 10);

	// Proficiency, expertise, Level.
	set("savingThrows", "Dexterity", 0, true);
	set("skills", "Stealth", 0, 1);
	set("skills", "Acrobatics", 0, 2);
	check("Proficiency Bonus at Level 1 is +2", valueIn("proficiencyBonus", "Proficiency Bonus"), 2);
	check("proficient save adds it", valueIn("savingThrows", "Dexterity", 1), 5);
	check("proficient skill adds it", valueIn("skills", "Stealth", 1), 5);
	check("expertise adds it twice", valueIn("skills", "Acrobatics", 1), 7);
	set("basicInfo", "Level", 0, 9);
	check("Level 9 → Proficiency Bonus +4", valueIn("proficiencyBonus", "Proficiency Bonus"), 4);
	check("…which flows into saves and skills", [valueIn("savingThrows", "Dexterity", 1), valueIn("skills", "Stealth", 1), valueIn("skills", "Acrobatics", 1)], [7, 7, 11]);
	check("…and Hit Dice Total", valueIn("hitDice", "Total"), 9);
	const used = moduleNamed("hitDice", "Hit Dice Used");
	const state = historyReducer(createHistoryState(sheet), { type: "setPieceValue", pieceId: moduleNamed("basicInfo", "Level").pieceOrder[0], value: 10 });
	check("…and its box count", live(state.sheet, byType.hitDice).modules[used.id].shownBoxes, 10);

	// Attack: the Ability dropdown drives To Hit and Dmg +.
	const ability = moduleNamed("attack", "Ability");
	const dropdownId = ability.pieceOrder[0];
	const options = ability.pieces[dropdownId].options;
	check("Attack's Ability dropdown lists STR…CHA", options.map((option) => option.label), ["STR", "DEX", "CON", "INT", "WIS", "CHA"]);
	check("To Hit = STR + proficiency", valueIn("attack", "To Hit Bonus"), 4);
	sheet = ops.setPieceValue(sheet, dropdownId, options[1].id);
	check("choosing DEX changes To Hit", valueIn("attack", "To Hit Bonus"), 7);
	check("…and Dmg +", valueIn("attack", "Dmg +"), 3);
	const attackCopy = schema.cloneCard(live(sheet, byType.attack));
	const copyToHit = attackCopy.modules[attackCopy.moduleOrder[2]].pieces[attackCopy.modules[attackCopy.moduleOrder[2]].pieceOrder[0]];
	check("a duplicated Attack's To Hit reads its own dropdown", ex.collectSources(copyToHit.ref.expr)[0], { piece: attackCopy.modules[attackCopy.moduleOrder[1]].pieceOrder[0] });

	// Deleting a source offers its dependents.
	const deps = refs.canDeleteCard(sheet, byType.abilityScores.id).dependents;
	check("deleting Ability Scores lists what uses it", deps.length > 30, true);
	check("…including Attack's options", deps.filter((dep) => dep.kind === "option").length, 6);

	// Cards that changed.
	check("Skills header says Skill", byType.skills.modules[byType.skills.moduleOrder[0]].pieceOrder.map((id) => byType.skills.modules[byType.skills.moduleOrder[0]].pieces[id].segments[0].value), ["Proficient?", "Modifier", "Skill"]);
	check("skill proficiency is a tri-state", byType.skills.modules[byType.skills.moduleOrder[1]].pieces[byType.skills.modules[byType.skills.moduleOrder[1]].pieceOrder[0]].kind, "tristate");
	check("Basic Info has a numeric Level", moduleNamed("basicInfo", "Level").pieces[moduleNamed("basicInfo", "Level").pieceOrder[0]].kind, "variable");
}

{
	// Only Skills: plain editable fields; Ability Scores and Proficiency Bonus
	// added afterwards connect on their own, leaving an unlinked field alone.
	const skills = cards.createStandardCard("skills");
	let sheet = newSheet(skills);
	const ids = skills.moduleOrder.slice(1).map((id) => skills.modules[id].pieceOrder[1]);
	check("Skills alone: every modifier is a plain field", ids.every((id) => read(sheet, id).computed === false), true);
	sheet = ops.setPieceValue(sheet, ids[0], 9);
	sheet = ops.addCardToPage(sheet, sheet.pages[0].id, cards.createStandardCard("abilityScores"), { maxCols: 60 });
	sheet = ops.addCardToPage(sheet, sheet.pages[0].id, cards.createStandardCard("proficiencyBonus"), { maxCols: 60 });
	check("…then they connect", ids.slice(1).every((id) => stateOf(sheet, id) === "linked"), true);
	check("…except the one typed over", [stateOf(sheet, ids[0]), valueOf(sheet, ids[0])], ["unlinked", 9]);
}

{
	// Spellcasting Stats, Spell List and the Spell module are gone — and an
	// older save that still has them doesn't break anything.
	check("removed cards aren't standard cards", ["spellcastingStats", "spellList", "spellSlots"].filter((type) => cards.STANDARD_CARD_TYPES.includes(type) || cards.CARD_TYPE_OPTIONS.some((option) => option.id === type)), []);
	check("the Spell module type is gone from the builder", schema.MODULE_TYPE_OPTIONS.some((option) => option.id === "spellEntry"), false);
	check("an unknown type builds nothing", cards.createStandardCard("spellList"), null);
	const legacy = schema.createCard({
		type: "spellList",
		title: "Spell List",
		modules: [schema.createModule({ type: "spellEntry", label: "Fireball", pieces: [schema.createTextPiece({ label: "Name", text: "Fireball" })] })],
	});
	const cardLayouts = await import(`${BASE}/character_sheet/cardLayouts.js`);
	let sheet = newSheet(legacy);
	check("an old Spell List card still lays out", Object.keys(cardLayouts.buildDefaultLayout(legacy).moduleRects).length, 1);
	check("…and its values still read", valueOf(sheet, legacy.modules[legacy.moduleOrder[0]].pieceOrder[0]), "Fireball");
	sheet = ops.deleteCard(sheet, legacy.id).sheet;
	check("…and it can be deleted", Boolean(sheet.cards[legacy.id]), false);
}

// ---------- Undo ----------

{
	const card = numberCard("Undo", ["A", "B"]);
	const notes = schema.createCustomCard("Notes");
	const textModule = schema.createTextModule("Text", { text: "Hello" });
	notes.modules[textModule.id] = textModule;
	notes.moduleOrder.push(textModule.id);
	let state = createHistoryState(newSheet(card, notes));
	const [a, b] = numberIds(card);
	const textId = textModule.pieceOrder[0];
	state = historyReducer(state, { type: "setPieceValue", pieceId: a, value: 4 });
	state = historyReducer(state, { type: "setReference", target: { kind: "value", pieceId: b }, expr: ex.pieceSrc(a) });
	check("saving a reference is one undo step", state.past.length, 1);
	state = historyReducer(state, { type: "setPieceValue", pieceId: a, value: 9 });
	state = historyReducer(state, { type: "undo" });
	check("undo removes the reference", read(state.sheet, b).state, null);
	check("…but not the value typed since", valueOf(state.sheet, a), 9);
	state = historyReducer(state, { type: "redo" });
	check("redo restores it", valueOf(state.sheet, b), 9);

	state = historyReducer(state, { type: "insertChip", pieceId: textId, expr: ex.pieceSrc(a), offset: 5 });
	check("a chip is one undo step", valueOf(state.sheet, textId), "Hello9");
	state = historyReducer(state, { type: "undo" });
	check("undo takes the chip back out", valueOf(state.sheet, textId), "Hello");
	state = historyReducer(state, { type: "redo" });
	state = historyReducer(state, { type: "unlinkReference", target: { kind: "value", pieceId: b } });
	state = historyReducer(state, { type: "undo" });
	check("undoing Unlink relinks", read(state.sheet, b).state, "linked");
}

// ---------- Persistence ----------

{
	const abilities = cards.createStandardCard("abilityScores");
	const skills = cards.createStandardCard("skills");
	let sheet = newSheet(abilities, skills, cards.createStandardCard("proficiencyBonus"));
	sheet = ops.setPieceValue(sheet, piecesOf(abilities, 1)[0], 14);
	check("sheet version is 3", sheet.version, 3);
	check("storage key moved to v3", storage.CHARACTER_SHEETS_STORAGE_KEY, "character_sheets_v3");
	check("references are plain JSON", JSON.parse(JSON.stringify(sheet)), sheet);
	storage.upsertCharacterSheet(sheet);
	const reloaded = storage.getCharacterSheet(sheet.id);
	const acrobatics = piecesOf(skills, 1)[1];
	check("save/reload round trip keeps values", [valueOf(reloaded, acrobatics), stateOf(reloaded, acrobatics)], [2, "linked"]);
	check("a legacy key is discarded", (localStorage.setItem("character_sheets_v2", "[]"), storage.discardLegacyCharacterSheets(), localStorage.getItem("character_sheets_v2")), null);
}

// ---------- No eval ----------

{
	const root = fileURLToPath(new URL("../src/utils/character_sheet/", import.meta.url));
	const files = [...readdirSync(root).filter((name) => name.endsWith(".js")), ...readdirSync(`${root}engine`).map((name) => `engine/${name}`)];
	// Comments stripped first — they're allowed to say "never eval()".
	const code = (name) => readFileSync(`${root}${name}`, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
	const offenders = files.filter((name) => /\beval\s*\(|\bFunction\s*\(/.test(code(name)));
	check("no eval() or Function() anywhere in the sheet's engine", offenders, []);
}

console.log(failures ? `\n${failures} FAILURES` : "\nAll tests passed");
process.exit(failures ? 1 : 0);
