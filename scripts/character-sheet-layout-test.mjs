// Tests for the Character Sheet's grid geometry and default card layouts.
// No test framework — same style as character-sheet-engine-test.mjs.
// Run from the project root with:  node scripts/character-sheet-layout-test.mjs
const BASE = new URL("../src/utils/character_sheet", import.meta.url).href;

const schema = await import(`${BASE}/schema.js`);
const ops = await import(`${BASE}/sheetOps.js`);
const grid = await import(`${BASE}/grid.js`);
const tokens = await import(`${BASE}/layoutConstants.js`);
const moduleTypes = await import(`${BASE}/moduleTypes.js`);
const cardLayouts = await import(`${BASE}/cardLayouts.js`);
const refs = await import(`${BASE}/references.js`);
const values = await import(`${BASE}/values.js`);
const colors = await import(`${BASE}/colors.js`);
const placement = await import(`${BASE}/placement.js`);
const snapping = await import(`${BASE}/snapping.js`);
const history = await import(`${BASE}/history.js`);

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

// --- token math: one gap everywhere ---
check("header is 40px", tokens.CARD_HEADER_HEIGHT, 40);
check("module-to-card-edge gap equals module gap", tokens.CARD_PAD + tokens.INSET, tokens.GAP);
check("card chrome is exactly half a unit per side", tokens.INSET + tokens.CARD_BORDER + tokens.CARD_PAD, tokens.GRID_UNIT / 2);
const left = grid.rectToPx({ x: 0, y: 0, w: 3, h: 3 });
const right = grid.rectToPx({ x: 3, y: 0, w: 3, h: 3 });
check("neighbours are GAP apart", right.left - (left.left + left.width), tokens.GAP);
check("pxToUnits rounds up to fit", [tokens.pxToUnits(52), tokens.pxToUnits(53)], [3, 4]);

// --- findFreeSpot: reading order, never overlapping ---
const occupied = [
	{ x: 0, y: 0, w: 10, h: 5 },
	{ x: 12, y: 0, w: 10, h: 3 },
];
check("first free spot in reading order", grid.findFreeSpot(occupied, 4, 2, 30), { x: 22, y: 0, w: 4, h: 2 });
check("fits in a gap on a later row", grid.findFreeSpot(occupied, 8, 2, 22), { x: 10, y: 3, w: 8, h: 2 });
check("too wide for the page lands below everything", grid.findFreeSpot(occupied, 40, 2, 30), { x: 0, y: 5, w: 40, h: 2 });
check("empty page starts at the origin", grid.findFreeSpot([], 5, 5, 30), { x: 0, y: 0, w: 5, h: 5 });

// --- every standard card: authored, gap-free, content-fit ---
const typeIds = schema.STANDARD_CARD_TYPES;
check("every picker card type has a builder", schema.CARD_TYPE_OPTIONS.filter((o) => o.available && !["custom", "insertExisting"].includes(o.id)).map((o) => o.id).sort(), [...typeIds].sort());
for (const typeId of typeIds) {
	const card = schema.createStandardCard(typeId);
	const recipe = cardLayouts.CARD_DEFAULT_ROWS[typeId];
	const recipeCount = recipe ? recipe.reduce((n, row) => n + row.w.length, 0) : -1;
	check(`${typeId}: has an authored layout for all its modules`, recipeCount, card.moduleOrder.length);

	const layout = cardLayouts.buildDefaultLayout(card);
	const rects = card.moduleOrder.map((id) => layout.moduleRects[id]);
	const { cols, rows } = grid.boundingSize(rects);
	const overlaps = rects.some((a, i) => rects.some((b, j) => i < j && grid.rectsOverlap(a, b)));
	check(`${typeId}: no overlapping modules`, overlaps, false);
	check(`${typeId}: no dead space`, grid.coverage(rects, cols, rows), 1);
	check(`${typeId}: card is exactly content + header`, [layout.w, layout.h], [cols + tokens.CARD_CHROME_W, rows + tokens.CARD_CHROME_H]);
	const tooSmall = card.moduleOrder.filter((id) => {
		const rect = layout.moduleRects[id];
		const sizing = moduleTypes.getModuleSizing(card.modules[id], rect.w);
		return rect.w < sizing.minW || rect.h < sizing.minH;
	});
	check(`${typeId}: every module at least its minimum size`, tooSmall, []);
	const unlabelled = card.moduleOrder.filter((id) => !card.modules[id].label?.trim());
	check(`${typeId}: every module has a label`, unlabelled, []);
}

// --- placement ---
let sheet = schema.createSheet("Layout");
const pageId = sheet.pages[0].id;
for (const typeId of typeIds) {
	sheet = ops.addCardToPage(sheet, pageId, schema.createStandardCard(typeId, sheet), { maxCols: 60 });
}
const placed = sheet.pages[0].cardLayouts;
const cardOverlap = placed.some((a, i) => placed.some((b, j) => i < j && grid.rectsOverlap(a, b)));
check("adding every card never overlaps another", cardOverlap, false);
check("every placement fits the page width", placed.every((l) => l.x + l.w <= 60 || l.x === 0), true);

// --- growing a variable-length module pushes what's below it ---
let grow = schema.createSheet("Grow");
const attack = schema.createAttackCard();
grow = ops.addCardToPage(grow, grow.pages[0].id, attack);
const chargesId = attack.moduleOrder[6];
const notesId = attack.moduleOrder[7];
const before = grow.pages[0].cardLayouts[0];
for (let i = 0; i < 6; i += 1) {
	grow = ops.addModuleRow(grow, attack.id, chargesId);
}
const after = grow.pages[0].cardLayouts[0];
const grewBy = after.moduleRects[chargesId].h - before.moduleRects[chargesId].h;
check("checkbox row grows when its boxes wrap", grewBy > 0, true);
check("module below moves down by the same amount", after.moduleRects[notesId].y - before.moduleRects[notesId].y, grewBy);
check("card grows to match", after.h - before.h, grewBy);

// --- value accessor ---
const health = schema.createHealthCard();
let vSheet = ops.addCardToPage(schema.createSheet("Values"), schema.createSheet().pages[0].id, health);
vSheet = { ...vSheet, cards: { ...vSheet.cards, [health.id]: health } };
const hpId = health.modules[health.moduleOrder[0]].pieceOrder[0];
vSheet = ops.setPieceValue(vSheet, hpId, 7);
check("setPieceValue writes a variable", values.readPieceValue(refs.buildPieceIndex(vSheet), hpId).value, 7);
const abil = schema.createAbilityScoresCard();
const abilIndex = refs.buildPieceIndex({ cards: { [abil.id]: abil } });
const bonusRead = values.readPieceValue(abilIndex, abil.modules[abil.moduleOrder[0]].pieceOrder[1]);
check("formula values read as computed", [bonusRead.computed, bonusRead.value], [true, 0]);
check("locked defaults to false", bonusRead.locked, false);

// --- push-away placement ---
const anyOverlap = (rects) => {
	const list = Object.values(rects);
	return list.some((a, i) => list.some((b, j) => i < j && grid.rectsOverlap(a, b)));
};
{
	const rects = {
		dropped: { x: 0, y: 0, w: 6, h: 4 },
		below: { x: 0, y: 2, w: 6, h: 4 },
		under: { x: 0, y: 6, w: 6, h: 2 },
		aside: { x: 20, y: 0, w: 4, h: 4 },
	};
	const pushed = placement.resolvePush(rects, ["dropped"], { maxCols: 12 });
	check("dropped item stays where it was dropped", pushed.dropped, rects.dropped);
	check("overlapped item pushed down by the minimum", pushed.below, { x: 0, y: 4, w: 6, h: 4 });
	check("push cascades into the next item", pushed.under, { x: 0, y: 8, w: 6, h: 2 });
	check("untouched item stays put", pushed.aside, rects.aside);
	check("nothing overlaps after a push", anyOverlap(pushed), false);
	check("nothing is lost", Object.keys(pushed).sort(), Object.keys(rects).sort());
	check("deterministic", placement.resolvePush(rects, ["dropped"], { maxCols: 12 }), pushed);
}
{
	// A sliver of overlap on the side, with free room there, moves sideways
	// rather than all the way down.
	const rects = { dropped: { x: 0, y: 0, w: 6, h: 6 }, neighbour: { x: 5, y: 0, w: 4, h: 6 } };
	const pushed = placement.resolvePush(rects, ["dropped"], { maxCols: 20 });
	check("small side overlap pushes sideways into free room", pushed.neighbour, { x: 6, y: 0, w: 4, h: 6 });
	const blocked = placement.resolvePush({ ...rects, wall: { x: 9, y: 0, w: 4, h: 6 } }, ["dropped"], { maxCols: 20 });
	check("no free room sideways falls back to down", blocked.neighbour, { x: 5, y: 6, w: 4, h: 6 });
	const narrow = placement.resolvePush(rects, ["dropped"], { maxCols: 9 });
	check("sideways push respects the width limit", narrow.neighbour, { x: 5, y: 6, w: 4, h: 6 });
}
{
	// Module push inside a card: stays within the card's width, card grows.
	let s2 = schema.createSheet("Push");
	const healthCard = schema.createHealthCard();
	const mana = schema.createCheckboxRowModule("Mana", 3);
	healthCard.modules[mana.id] = mana;
	healthCard.moduleOrder.push(mana.id);
	s2 = ops.addCardToPage(s2, s2.pages[0].id, healthCard, { maxCols: 60 });
	s2 = ops.addCardToPage(s2, s2.pages[0].id, schema.createStandardCard("initiative"), { maxCols: 60 });
	const page2 = s2.pages[0];
	const [hLayout, iLayout] = page2.cardLayouts;
	const firstId = healthCard.moduleOrder[0];
	const plan = placement.planModuleChange(healthCard, hLayout, { [firstId]: { ...hLayout.moduleRects[firstId], y: hLayout.moduleRects[firstId].y + 1 } }, page2.cardLayouts, { maxCols: 60 });
	const cols = hLayout.w - tokens.CARD_CHROME_W;
	check("modules stay within the card's width", Object.values(plan.moduleRects).every((r) => r.x >= 0 && r.x + r.w <= cols), true);
	check("modules don't overlap after a push", anyOverlap(plan.moduleRects), false);
	check("card grows taller instead of clipping", plan.cardRect.h > hLayout.h, true);
	check("cards on the page don't overlap after the card grows", anyOverlap(plan.pageRects), false);
	check("page plan keeps every card", Object.keys(plan.pageRects).sort(), [hLayout.id, iLayout.id].sort());
}

// --- snapping and guides ---
{
	const targets = [{ x: 10, y: 0, w: 6, h: 4 }];
	const near = snapping.snapMove({ x: 9.6, y: 5.2, w: 6, h: 3 }, targets);
	check("move snaps to whole units", [Number.isInteger(near.rect.x), Number.isInteger(near.rect.y)], [true, true]);
	check("edge alignment catches within tolerance", near.rect.x, 10);
	check("an aligned edge shows a guide", near.guides.some((g) => g.orientation === "vertical" && g.position === 10), true);
	const pulled = snapping.snapMove({ x: 4.55, y: 9, w: 6, h: 3 }, targets);
	check("guide magnetism beats plain rounding", pulled.rect.x, 4); // right edge 10 lines up with the target's left edge
	const alt = snapping.snapMove({ x: 9.6, y: 5.2, w: 6, h: 3 }, targets, { guides: false });
	check("Alt: no guides, still on the grid", [alt.rect.x, alt.guides.length], [10, 0]);
	const e = snapping.RESIZE_HANDLES.find((h) => h.id === "e");
	const tooSmall = snapping.resizeSnap({ x: 0, y: 0, w: 6, h: 4 }, e, { dx: -10, dy: 0 }, { minW: 3 });
	check("resize stops at the minimum width", tooSmall.rect.w, 3);
	const capped = snapping.resizeSnap({ x: 0, y: 0, w: 6, h: 4 }, e, { dx: 10, dy: 0 }, { maxRight: 8 });
	check("resize stops at the card's edge", capped.rect.w, 8);
	const s = snapping.RESIZE_HANDLES.find((h) => h.id === "s");
	const taller = snapping.resizeSnap({ x: 0, y: 0, w: 6, h: 4 }, s, { dx: 0, dy: -3 }, { minHFor: (w) => (w < 8 ? 3 : 2) });
	check("width-dependent minimum height", taller.rect.h, 3);
	const nw = snapping.RESIZE_HANDLES.find((h) => h.id === "nw");
	const moved = snapping.resizeSnap({ x: 4, y: 4, w: 6, h: 4 }, nw, { dx: -2, dy: -1 }, {});
	check("nw handle moves the origin, keeps the far corner", [moved.rect.x, moved.rect.y, moved.rect.x + moved.rect.w, moved.rect.y + moved.rect.h], [2, 3, 10, 8]);
	const se = snapping.RESIZE_HANDLES.find((h) => h.id === "se");
	const locked = snapping.resizeSnap({ x: 0, y: 0, w: 6, h: 3 }, se, { dx: 6, dy: 0 }, { lockAspect: true });
	check("Shift-drag keeps the ratio", [locked.rect.w, locked.rect.h], [12, 6]);
}

// --- undo/redo history ---
{
	const reducer = history.withHistory((sheet, action) => {
		if (action.type === "setPageArrangement") return ops.setPageArrangement(sheet, action.pageId, { rects: action.rects });
		if (action.type === "setPieceValue") return ops.setPieceValue(sheet, action.pieceId, action.value);
		return sheet;
	});
	let hs = schema.createSheet("History");
	const hp = schema.createHealthCard();
	hs = ops.addCardToPage(hs, hs.pages[0].id, hp, { maxCols: 60 });
	const hLayoutId = hs.pages[0].cardLayouts[0].id;
	const hpPiece = hp.modules[hp.moduleOrder[0]].pieceOrder[0];
	let state = history.createHistoryState(hs);
	state = reducer(state, { type: "setPageArrangement", pageId: hs.pages[0].id, rects: { [hLayoutId]: { x: 5, y: 5 } } });
	check("a layout change is one undo step", state.past.length, 1);
	state = reducer(state, { type: "setPieceValue", pieceId: hpPiece, value: 3 });
	check("value edits are not undo steps", state.past.length, 1);
	state = reducer(state, { type: "undo" });
	check("undo restores the layout", state.sheet.pages[0].cardLayouts[0].x, 0);
	check("undo keeps values typed since", values.readPieceValue(refs.buildPieceIndex(state.sheet), hpPiece).value, 3);
	state = reducer(state, { type: "redo" });
	check("redo reapplies the layout", state.sheet.pages[0].cardLayouts[0].x, 5);
	check("redo keeps live values too", values.readPieceValue(refs.buildPieceIndex(state.sheet), hpPiece).value, 3);
	state = reducer(state, { type: "redo" });
	check("redo with nothing to redo is a no-op", state.future.length, 0);
}

// --- deleting ---
{
	let ds = schema.createSheet("Delete");
	const abilities = schema.createAbilityScoresCard();
	ds = ops.addCardToPage(ds, ds.pages[0].id, abilities, { maxCols: 60 });
	ds = ops.addCardToPage(ds, ds.pages[0].id, schema.createStandardCard("skills", ds), { maxCols: 60 });
	const strength = abilities.moduleOrder[0];
	check("a module other cards use can't be deleted", refs.canDeleteModule(ds, abilities.id, strength).ok, false);
	check("blocked delete is a no-op", ops.deleteModules(ds, abilities.id, [strength]), ds);
	const skills = Object.values(ds.cards).find((card) => card.type === "skills");
	const header = skills.moduleOrder[0];
	const without = ops.deleteModules(ds, skills.id, [header]);
	check("module deleted from the card", Boolean(without.cards[skills.id].modules[header]), false);
	check("and from its layout", Boolean(without.pages[0].cardLayouts[1].moduleRects[header]), false);
	const abilityLayout = ds.pages[0].cardLayouts[0].id;
	check("referenced card isn't deleted", ops.deleteLayouts(ds, ds.pages[0].id, [abilityLayout]).pages[0].cardLayouts.length, 2);
}

// --- copies: fresh ids, internal references remapped, external kept ---
{
	const money = schema.createMoneyCard();
	const copy = schema.cloneCard(money);
	const originalModule = money.modules[money.moduleOrder[0]];
	const copiedModule = copy.modules[copy.moduleOrder[0]];
	check("copy has a new card id", copy.id !== money.id, true);
	check("copy has new module ids", copy.moduleOrder.every((id) => !money.modules[id]), true);
	const copiedTotal = copiedModule.pieces[copiedModule.pieceOrder[0]];
	const ownPieces = new Set(copiedModule.pieceOrder);
	const totalRefs = [...copiedTotal.formula.matchAll(/#\{([^}]+)\}/g)].map((m) => m[1]);
	check("copied total adds up the copy's own coins", totalRefs.every((id) => ownPieces.has(id)), true);
	check("original total untouched", originalModule.pieces[originalModule.pieceOrder[0]].formula === copiedTotal.formula, false);

	let cs = schema.createSheet("Copies");
	const abilities = schema.createAbilityScoresCard();
	cs = ops.addCardToPage(cs, cs.pages[0].id, abilities, { maxCols: 60 });
	const skills = schema.createStandardCard("skills", cs);
	const skillCopy = schema.cloneCard(skills);
	const skillModule = skillCopy.modules[skillCopy.moduleOrder[1]];
	const modifier = skillModule.pieces[skillModule.pieceOrder[1]];
	const abilityPieces = new Set(Object.values(abilities.modules).flatMap((module) => module.pieceOrder));
	check("copied skill still reads the Ability Scores card", [...modifier.formula.matchAll(/#\{([^}]+)\}/g)].some((m) => abilityPieces.has(m[1])), true);

	const health = schema.createHealthCard();
	const healthCopy = schema.cloneCard(health);
	const dh = healthCopy.modules[healthCopy.moduleOrder[3]];
	const damage = dh.pieces[dh.pieceOrder[1]];
	check("copied Damage button hits the copy's own HP", healthCopy.modules[healthCopy.moduleOrder[0]].pieceOrder.includes(damage.actions[0].targetPieceId), true);
}
{
	let ds = schema.createSheet("Duplicate");
	const attack = schema.createAttackCard();
	ds = ops.addCardToPage(ds, ds.pages[0].id, attack, { maxCols: 60 });
	const source = ds.pages[0].cardLayouts[0];
	const copy = schema.cloneCard(attack);
	ds = ops.duplicateCards(ds, ds.pages[0].id, [{ sourceLayoutId: source.id, card: copy }], { maxCols: 60 });
	const placed = ds.pages[0].cardLayouts.find((layout) => layout.cardId === copy.id);
	check("duplicate card keeps its source's size", [placed.w, placed.h], [source.w, source.h]);
	check("duplicate card lands beside its source", [placed.x, placed.y], [source.w, 0]);
	check("duplicate keeps the module arrangement", copy.moduleOrder.map((id) => placed.moduleRects[id]), attack.moduleOrder.map((id) => source.moduleRects[id]));
	check("source didn't move", ds.pages[0].cardLayouts[0].x, 0);

	const nameId = attack.moduleOrder[0];
	const moduleCopy = schema.cloneModule(attack.modules[nameId]);
	const before = ds.pages[0].cardLayouts[0];
	ds = ops.duplicateModules(ds, attack.id, [{ sourceModuleId: nameId, module: moduleCopy }]);
	const after = ds.pages[0].cardLayouts[0];
	check("duplicate module added to the card", ds.cards[attack.id].moduleOrder.includes(moduleCopy.id), true);
	check("duplicate module keeps its source's size", [after.moduleRects[moduleCopy.id].w, after.moduleRects[moduleCopy.id].h], [before.moduleRects[nameId].w, before.moduleRects[nameId].h]);
	check("no module overlaps after duplicating", anyOverlap(after.moduleRects), false);
	check("no cards overlap after the card grew", anyOverlap(Object.fromEntries(ds.pages[0].cardLayouts.map((l) => [l.id, l]))), false);

	ds = ops.setItemsColor(ds, [{ cardId: attack.id, part: "background" }], "#efe8f8");
	check("card background colours on its own", [ds.cards[attack.id].bodyColor, ds.cards[attack.id].headerColor], ["#efe8f8", null]);
	ds = ops.setItemsColor(ds, [{ cardId: attack.id, part: "header" }, { cardId: attack.id, moduleId: nameId, part: "label" }], "#a01b1b");
	const named = () => ds.cards[attack.id].modules[nameId];
	check("colours a card header and a module label in one go", [ds.cards[attack.id].headerColor, named().labelColor], ["#a01b1b", "#a01b1b"]);
	check("colouring the label leaves the body alone", named().bodyColor, null);
	ds = ops.setItemsColor(ds, [{ cardId: attack.id, moduleId: nameId, part: "body" }], "#fbf0cd");
	check("body colour is set exactly as picked", [named().labelColor, named().bodyColor], ["#a01b1b", "#fbf0cd"]);
	ds = ops.setItemsColor(ds, [{ cardId: attack.id, moduleId: nameId }], null);
	check("reset colour clears both label and body", [named().labelColor, named().bodyColor], [null, null]);
	ds = ops.setItemsColor(ds, [{ cardId: attack.id }], null);
	check("reset colour on a card clears header and background", [ds.cards[attack.id].headerColor, ds.cards[attack.id].bodyColor], [null, null]);
}

// --- align / distribute ---
{
	const rects = { a: { x: 0, y: 0, w: 4, h: 2 }, b: { x: 6, y: 3, w: 6, h: 2 }, c: { x: 14, y: 1, w: 2, h: 2 } };
	check("align left", placement.alignRects(rects, ["a", "b"], "left"), { b: { x: 0, y: 3, w: 6, h: 2 } });
	check("align tops", placement.alignRects(rects, ["a", "b", "c"], "top"), { b: { x: 6, y: 0, w: 6, h: 2 }, c: { x: 14, y: 0, w: 2, h: 2 } });
	check("align centres rounds to whole cells", placement.alignRects(rects, ["a", "c"], "hcenter").a.x, 6);
	check("distribute horizontally evens the gaps", placement.distributeRects({ ...rects, b: { ...rects.b, x: 8 } }, ["a", "b", "c"], "horizontal"), { b: { x: 6, y: 3, w: 6, h: 2 } });
	const stacked = { a: { x: 0, y: 0, w: 4, h: 2 }, b: { x: 0, y: 2, w: 4, h: 2 } };
	const aligned = placement.alignRects(stacked, ["a", "b"], "top");
	const layoutsForPlan = Object.entries(stacked).map(([id, r]) => ({ id, ...r }));
	const settled = placement.planCardChange(layoutsForPlan, aligned, { anchorId: "a" });
	check("aligning onto each other still never overlaps", anyOverlap(settled), false);
}

// --- ids and colours ---
const ids = new Set(Array.from({ length: 500 }, () => schema.makeId("piece")));
check("ids are unique", ids.size, 500);
check("dark colours get light text", colors.getContrastTextColor("#a01b1b"), "#ffffff");
check("pale colours get dark text", colors.getContrastTextColor("#fbf0cd"), "#16263f");
check("a body colour's border is a deeper shade of it", colors.borderForBody("#ffffff"), "#bfbfbf");

console.log(failures ? `\n${failures} FAILURES` : "\nAll tests passed");
process.exit(failures ? 1 : 0);
