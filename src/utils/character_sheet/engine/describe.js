// Names for references, in words: what chips' tooltips, the info modal, the
// "Choose source" list and the delete dialog say. Names are looked up live
// from the sheet, so they follow renames.

const ABILITY_WORDS = { str: "Strength", dex: "Dexterity", con: "Constitution", int: "Intelligence", wis: "Wisdom", cha: "Charisma" };

const titleCase = (text) => text.replace(/(^|[\s-])\w/g, (match) => match.toUpperCase()).replace(/-/g, " ");

// "ability.dex.bonus" -> "Dexterity Bonus", "proficiency.bonus" ->
// "Proficiency Bonus", "skill.sleight-of-hand.modifier" -> "Sleight Of Hand Modifier".
export function describeRole(role) {
	const parts = String(role).split(".");
	if (parts[0] === "ability" && ABILITY_WORDS[parts[1]]) {
		return `${ABILITY_WORDS[parts[1]]} ${titleCase(parts[2] || "")}`.trim();
	}
	if ((parts[0] === "save" || parts[0] === "passive") && ABILITY_WORDS[parts[1]]) {
		return `${ABILITY_WORDS[parts[1]]} ${parts[0] === "save" ? "Save" : "Passive"}`;
	}
	if (parts[0] === "skill" || parts[0] === "passive") {
		return `${titleCase(parts[1] || "")} ${parts[0] === "passive" ? "Passive" : titleCase(parts[2] || "")}`.trim();
	}
	if (parts[0] === "character") {
		return titleCase(parts.slice(1).join(" "));
	}
	return titleCase(parts.join(" "));
}

// The page a card is shown on: `preferPageId` when it's there, else the
// first page (in tab order) that shows it.
export function pageOfCard(sheet, cardId, preferPageId = sheet.activePageId) {
	const preferred = sheet.pages.find((page) => page.id === preferPageId);
	if (preferred?.cardLayouts.some((layout) => layout.cardId === cardId)) {
		return preferred;
	}
	return sheet.pages.find((page) => page.cardLayouts.some((layout) => layout.cardId === cardId)) || null;
}

// "Module label · piece label" — or just the module's label when the piece
// is named the same (a lone number in a labelled box).
export function pieceName(module, piece) {
	const moduleLabel = module?.label || "Untitled";
	const pieceLabel = piece?.label || "";
	return !pieceLabel || pieceLabel === moduleLabel ? moduleLabel : `${moduleLabel} · ${pieceLabel}`;
}

// Where a piece (or a checkbox group's count) lives, in words:
// { name, cardTitle, pageId, pageName, path } with path like
// "Skills › Acrobatics · Modifier" (prefixed with the page when it isn't
// `currentPageId`).
export function describeLocation(engine, { pieceId = null, moduleId = null, field = null }, currentPageId = engine.sheet.activePageId) {
	const sheet = engine.sheet;
	const pieceEntry = pieceId ? engine.index.pieces[pieceId] : null;
	const moduleEntry = engine.index.modules[pieceEntry?.moduleId || moduleId];
	if (!moduleEntry) {
		return null;
	}
	const module = moduleEntry.module;
	const card = sheet.cards[moduleEntry.cardId];
	const moduleLabel = module.label || "Untitled";
	const name = pieceEntry ? pieceName(module, pieceEntry.piece) : field === "checked" ? `${moduleLabel} · Checked` : moduleLabel;
	const page = pageOfCard(sheet, card.id, currentPageId);
	const onOtherPage = page && page.id !== currentPageId;
	return {
		name,
		cardId: card.id,
		cardTitle: card.title,
		moduleId: module.id,
		pieceId,
		pageId: page?.id || null,
		pageName: page?.name || null,
		path: `${onOtherPage ? `${page.name} › ` : ""}${card.title} › ${name}`,
	};
}

// A source's name: where it points now, or (unresolved) what it's waiting for.
export function describeSource(engine, src, currentPageId) {
	const target = engine.resolve(src);
	if (target) {
		return describeLocation(engine, { ...target, field: src.field || null }, currentPageId).path;
	}
	if (src.role) {
		return `${describeRole(src.role)} (no card yet)`;
	}
	return "Missing source";
}

const OPERATOR_WORDS = { "+": "+", "-": "−", "*": "×", "/": "÷" };
const COMPARISON_WORDS = { "<": "<", "<=": "≤", ">": ">", ">=": "≥", "=": "=", "!=": "≠" };
const FUNCTION_WORDS = { floor: "round down", ceil: "round up", min: "min", max: "max" };

// The whole expression in named form, e.g.
// "round down(Ability Scores › Strength · Score ÷ 2) − 5".
export function describeExpression(engine, expr, currentPageId) {
	const walk = (node, parentPrecedence = 0) => {
		if (!node || typeof node !== "object") {
			return "?";
		}
		if ("num" in node) {
			return String(node.num);
		}
		if ("text" in node) {
			return `“${node.text}”`;
		}
		if ("src" in node) {
			return `[${describeSource(engine, node.src, currentPageId)}]`;
		}
		if ("op" in node) {
			const precedence = node.op === "+" || node.op === "-" ? 1 : 2;
			const [a, b] = node.args || [];
			const inner = `${walk(a, precedence)} ${OPERATOR_WORDS[node.op] || node.op} ${walk(b, precedence + 1)}`;
			return precedence < parentPrecedence ? `(${inner})` : inner;
		}
		if ("fn" in node) {
			const label = FUNCTION_WORDS[node.fn] || engine.rules.functions?.[node.fn]?.label || node.fn;
			return `${label}(${(node.args || []).map((arg) => walk(arg)).join(", ")})`;
		}
		if ("lookup" in node) {
			return `${engine.rules.tables?.[node.lookup]?.label || node.lookup}(${walk(node.arg)})`;
		}
		if ("if" in node) {
			const condition = `${walk(node.if?.left)} ${COMPARISON_WORDS[node.if?.cmp] || node.if?.cmp} ${walk(node.if?.right)}`;
			return `if ${condition} then ${walk(node.then)} else ${walk(node.else)}`;
		}
		return "?";
	};
	return walk(expr);
}
