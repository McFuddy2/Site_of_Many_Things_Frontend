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

// --- ids and colours ---
const ids = new Set(Array.from({ length: 500 }, () => schema.makeId("piece")));
check("ids are unique", ids.size, 500);
const shades = colors.deriveModuleShades("#a01b1b");
check("derived shades: bar is the base", shades.bar, "#a01b1b");
check("derived shades: dark base gets light bar text", shades.barText, "#ffffff");
check("derived shades: pale body gets dark text", shades.text, "#16263f");

console.log(failures ? `\n${failures} FAILURES` : "\nAll tests passed");
process.exit(failures ? 1 : 0);
