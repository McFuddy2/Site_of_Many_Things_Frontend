// The reference engine: every value on a sheet that can be read, what each
// one depends on, and their current values — computed in dependency order
// and, after a change, recomputed only where the change can reach.
//
// Pure and UI-free: it takes a sheet and returns plain data, so anything on
// the site (a future spell tool, say) can read sheet values without the
// Character Sheet's components (see readSheetValue).
//
// Graph nodes:
//   "<pieceId>"            a value-holding piece (number, checkbox, tri-state, text, dropdown)
//   "<pieceId>#<partId>"   one chip inside a text piece, or one dropdown option's reference
//   "<moduleId>:checked"   how many of a checkbox group's (visible) boxes are checked
//   "<moduleId>:capacity"  how many boxes a checkbox group shows, when linked
//   "<moduleId>:lock"      "none" | "locked" | "hidden", from the module's rules
//
// A reference ({ id, expr, origin, unlinked, nickname, lastKnown }) is in one
// of four states, worked out here rather than stored:
//   linked    every source resolves; the value is computed
//   pending   a role it names has no matching piece yet (and it was never
//             broken by a deletion). With nothing resolved the field is just
//             an ordinary editable field; partly resolved, it needs more data
//   missing   a source was deleted: shows its last known value
//   unlinked  the player unlinked it (or typed over it while pending)

import { collectSources, evaluateExpression, evaluateComparison, toNumber } from "./expression.js";
import { RULES_5E } from "./rules5e.js";

export const VALUE_KINDS = new Set(["variable", "checkbox", "tristate", "text", "dropdown"]);

export const nodeIds = {
	piece: (pieceId) => pieceId,
	part: (pieceId, partId) => `${pieceId}#${partId}`,
	checked: (moduleId) => `${moduleId}:checked`,
	capacity: (moduleId) => `${moduleId}:capacity`,
	lock: (moduleId) => `${moduleId}:lock`,
};

const CYCLE_ERROR = "Circular reference";

// ---------- Indexes ----------

// pieceId -> { piece, moduleId, cardId }, moduleId -> { module, cardId }.
export function indexSheet(sheet) {
	const pieces = {};
	const modules = {};
	for (const card of Object.values(sheet.cards)) {
		for (const module of Object.values(card.modules)) {
			modules[module.id] = { module, cardId: card.id };
			for (const piece of Object.values(module.pieces)) {
				pieces[piece.id] = { piece, moduleId: module.id, cardId: card.id };
			}
		}
	}
	return { pieces, modules };
}

const readingOrder = (a, b) => a.y - b.y || a.x - b.x;

// Card ids by page order, then reading order (y, then x) within each page;
// cards that aren't placed anywhere come last.
export function cardsInReadingOrder(sheet) {
	const seen = new Set();
	const ordered = [];
	for (const page of sheet.pages) {
		for (const layout of [...page.cardLayouts].sort(readingOrder)) {
			if (!seen.has(layout.cardId) && sheet.cards[layout.cardId]) {
				seen.add(layout.cardId);
				ordered.push(layout.cardId);
			}
		}
	}
	for (const cardId of Object.keys(sheet.cards)) {
		if (!seen.has(cardId)) {
			ordered.push(cardId);
		}
	}
	return ordered;
}

// role -> pieceId: the first piece holding each role, in reading order.
// `exclude` (a Set of piece ids) answers "who would hold it after a delete".
export function resolveRoles(sheet, { exclude = null } = {}) {
	const roles = new Map();
	for (const cardId of cardsInReadingOrder(sheet)) {
		const card = sheet.cards[cardId];
		for (const moduleId of card.moduleOrder) {
			const module = card.modules[moduleId];
			for (const pieceId of module?.pieceOrder || []) {
				const role = module.pieces[pieceId]?.role;
				if (role && !roles.has(role) && !exclude?.has(pieceId)) {
					roles.set(role, pieceId);
				}
			}
		}
	}
	return roles;
}

// Every reference a module holds: its box count, each number piece's
// reference, each chip in its text pieces, each dropdown option's
// reference. (Rules are listed separately — they're conditions, not values.)
export function moduleReferences(module) {
	const list = [];
	if (module.capacity) {
		list.push({ kind: "capacity", node: nodeIds.capacity(module.id), ref: module.capacity, moduleId: module.id });
	}
	for (const pieceId of module.pieceOrder) {
		const piece = module.pieces[pieceId];
		if (!piece) {
			continue;
		}
		if (piece.kind === "variable" && piece.ref) {
			list.push({ kind: "value", node: pieceId, ref: piece.ref, moduleId: module.id, pieceId });
		} else if (piece.kind === "text") {
			for (const segment of piece.segments) {
				if (segment.type === "chip" && segment.ref) {
					list.push({
						kind: "chip",
						node: nodeIds.part(pieceId, segment.ref.id),
						ref: segment.ref,
						moduleId: module.id,
						pieceId,
						partId: segment.ref.id,
					});
				}
			}
		} else if (piece.kind === "dropdown") {
			for (const option of piece.options) {
				if (option.ref) {
					list.push({
						kind: "option",
						node: nodeIds.part(pieceId, option.id),
						ref: option.ref,
						moduleId: module.id,
						pieceId,
						partId: option.id,
					});
				}
			}
		}
	}
	return list;
}

// ---------- Graph ----------

export function buildGraph(sheet) {
	const index = indexSheet(sheet);
	const roles = resolveRoles(sheet);
	const nodes = new Map(); // id -> { id, kind, deps: string[], moduleId, pieceId?, ref?, rules? }
	const partsByPiece = new Map();
	const nodesByModule = new Map();

	const hasLock = (moduleId) => Boolean(index.modules[moduleId]?.module.rules?.length);

	// What a source points at right now: { pieceId } or { moduleId }, or null.
	const resolve = (src) => {
		if (!src) {
			return null;
		}
		if (src.piece || src.role) {
			const pieceId = src.piece || roles.get(src.role);
			const entry = pieceId && index.pieces[pieceId];
			return entry && VALUE_KINDS.has(entry.piece.kind) ? { pieceId, moduleId: entry.moduleId } : null;
		}
		if (src.module && src.field === "checked") {
			return index.modules[src.module]?.module.type === "checkboxRow" ? { moduleId: src.module } : null;
		}
		return null;
	};

	// The graph nodes a source reads. Reading a piece in a module with rules
	// also reads that module's lock (locked or hidden reads as 0) — except
	// from that module's own lock, which sees its pieces as they are.
	const sourceDeps = (src, readerLockModuleId = null) => {
		const target = resolve(src);
		if (!target) {
			return [];
		}
		const deps = [target.pieceId ? nodeIds.piece(target.pieceId) : nodeIds.checked(target.moduleId)];
		if (hasLock(target.moduleId) && readerLockModuleId !== target.moduleId) {
			deps.push(nodeIds.lock(target.moduleId));
		}
		return deps;
	};

	const exprDeps = (expr, readerLockModuleId = null) => [
		...new Set(collectSources(expr).flatMap((src) => sourceDeps(src, readerLockModuleId))),
	];
	const refDeps = (ref) => (ref.unlinked ? [] : exprDeps(ref.expr));

	const addNode = (node) => {
		nodes.set(node.id, node);
		if (!nodesByModule.has(node.moduleId)) {
			nodesByModule.set(node.moduleId, []);
		}
		nodesByModule.get(node.moduleId).push(node.id);
		if (node.partOf) {
			if (!partsByPiece.has(node.partOf)) {
				partsByPiece.set(node.partOf, []);
			}
			partsByPiece.get(node.partOf).push(node.id);
		}
	};

	for (const { module } of Object.values(index.modules)) {
		const moduleId = module.id;
		if (module.rules?.length) {
			const deps = new Set();
			for (const rule of module.rules) {
				exprDeps(rule.left, moduleId).forEach((dep) => deps.add(dep));
				exprDeps(rule.right, moduleId).forEach((dep) => deps.add(dep));
			}
			addNode({ id: nodeIds.lock(moduleId), kind: "lock", moduleId, deps: [...deps] });
		}
		if (module.capacity) {
			addNode({ id: nodeIds.capacity(moduleId), kind: "capacity", moduleId, ref: module.capacity, deps: refDeps(module.capacity) });
		}
		if (module.type === "checkboxRow") {
			const deps = module.pieceOrder.filter((pieceId) => module.pieces[pieceId]?.kind === "checkbox");
			if (module.capacity) {
				deps.push(nodeIds.capacity(moduleId));
			}
			addNode({ id: nodeIds.checked(moduleId), kind: "checked", moduleId, deps });
		}
		for (const pieceId of module.pieceOrder) {
			const piece = module.pieces[pieceId];
			if (!piece || !VALUE_KINDS.has(piece.kind)) {
				continue;
			}
			const deps = [];
			if (piece.kind === "variable" && piece.ref) {
				deps.push(...refDeps(piece.ref));
			} else if (piece.kind === "text") {
				for (const segment of piece.segments) {
					if (segment.type === "chip" && segment.ref) {
						const id = nodeIds.part(pieceId, segment.ref.id);
						addNode({ id, kind: "chip", moduleId, pieceId, partOf: pieceId, ref: segment.ref, deps: refDeps(segment.ref) });
						deps.push(id);
					}
				}
			} else if (piece.kind === "dropdown") {
				for (const option of piece.options) {
					if (option.ref) {
						const id = nodeIds.part(pieceId, option.id);
						addNode({ id, kind: "option", moduleId, pieceId, partOf: pieceId, ref: option.ref, deps: refDeps(option.ref) });
						deps.push(id);
					}
				}
			}
			addNode({ id: nodeIds.piece(pieceId), kind: "piece", moduleId, pieceId, deps });
		}
	}

	// Dependents, and a topological order (Kahn). Whatever can't be ordered
	// is part of — or downstream of — a cycle.
	const dependents = new Map();
	const waiting = new Map();
	for (const node of nodes.values()) {
		const deps = node.deps.filter((dep) => nodes.has(dep));
		node.deps = deps;
		waiting.set(node.id, deps.length);
		for (const dep of deps) {
			if (!dependents.has(dep)) {
				dependents.set(dep, []);
			}
			dependents.get(dep).push(node.id);
		}
	}
	const order = [];
	const ready = [...nodes.keys()].filter((id) => waiting.get(id) === 0);
	while (ready.length) {
		const id = ready.shift();
		order.push(id);
		for (const next of dependents.get(id) || []) {
			waiting.set(next, waiting.get(next) - 1);
			if (waiting.get(next) === 0) {
				ready.push(next);
			}
		}
	}
	const ordered = new Set(order);
	const cyclic = new Set([...nodes.keys()].filter((id) => !ordered.has(id)));

	// Two sheets with the same key have the same graph, so values can be
	// updated incrementally between them.
	const key = [...nodes.values()].map((node) => `${node.id}<${node.deps.join(",")}`).join("|");

	return { index, roles, nodes, dependents, order: [...order, ...cyclic], cyclic, partsByPiece, nodesByModule, key, resolve, sourceDeps };
}

// ---------- Evaluation ----------

function literalNumber(value) {
	const number = Number(value);
	return value !== "" && value !== null && Number.isFinite(number) ? number : 0;
}

// Linked / pending / missing for a reference that isn't unlinked.
export function referenceStatus(graph, ref) {
	const sources = collectSources(ref.expr);
	const unresolved = sources.filter((src) => !graph.resolve(src));
	if (!unresolved.length) {
		return { state: "linked", unresolved };
	}
	if (ref.lastKnown || unresolved.some((src) => !src.role)) {
		return { state: "missing", unresolved };
	}
	// Only roles count towards "partly there": a skill's own proficiency
	// checkbox resolving doesn't make its missing ability Bonus less missing.
	const roles = sources.filter((src) => src.role).length;
	return { state: "pending", partial: unresolved.length < roles, unresolved };
}

function evaluateReference(graph, ref, readSource, literal, rules) {
	if (ref.unlinked) {
		return { value: literal, error: null, computed: false, state: "unlinked" };
	}
	const status = referenceStatus(graph, ref);
	if (status.state === "linked") {
		return { ...evaluateExpression(ref.expr, readSource, rules), computed: true, state: "linked" };
	}
	const missingRoles = status.unresolved.filter((src) => src.role).map((src) => src.role);
	if (status.state === "missing") {
		return ref.lastKnown
			? { value: ref.lastKnown.value, error: null, computed: true, state: "missing", missingRoles }
			: { value: null, error: "Its source was deleted", computed: true, state: "missing", missingRoles };
	}
	if (status.partial) {
		return { value: null, error: "Needs more data", computed: true, state: "pending", partial: true, missingRoles };
	}
	return { value: literal, error: null, computed: false, state: "pending", partial: false, missingRoles };
}

function computeNode(graph, node, values, rules) {
	const { index } = graph;
	const readerLock = node.kind === "lock" ? node.moduleId : null;
	const readSource = (src) => {
		const target = graph.resolve(src);
		if (!target) {
			return { value: null, error: "Its source is missing" };
		}
		if (readerLock !== target.moduleId) {
			const lock = values.get(nodeIds.lock(target.moduleId))?.value;
			if (lock === "locked" || lock === "hidden") {
				const kind = target.pieceId ? index.pieces[target.pieceId].piece.kind : null;
				return { value: kind === "text" ? "" : 0, error: null };
			}
		}
		const entry = values.get(target.pieceId ? nodeIds.piece(target.pieceId) : nodeIds.checked(target.moduleId));
		if (!entry) {
			return { value: null, error: "Its source is missing" };
		}
		return entry.error ? { value: null, error: entry.error } : { value: entry.value, error: null };
	};

	if (graph.cyclic.has(node.id)) {
		return { value: null, error: CYCLE_ERROR, computed: true, state: "linked" };
	}

	switch (node.kind) {
		case "chip":
		case "option":
			return evaluateReference(graph, node.ref, readSource, null, rules);
		case "capacity": {
			const result = evaluateReference(graph, node.ref, readSource, null, rules);
			if (!result.computed || result.error || result.value === null) {
				return result;
			}
			const count = toNumber(result.value);
			return count.error ? { ...result, value: null, error: count.error } : { ...result, value: Math.max(0, Math.floor(count.value)) };
		}
		case "checked": {
			const module = index.modules[node.moduleId].module;
			const boxes = module.pieceOrder.filter((pieceId) => module.pieces[pieceId]?.kind === "checkbox");
			const capacity = values.get(nodeIds.capacity(node.moduleId));
			const limit = capacity?.computed && !capacity.error && typeof capacity.value === "number" ? capacity.value : boxes.length;
			const visible = boxes.slice(0, limit);
			return {
				value: visible.filter((pieceId) => module.pieces[pieceId].value).length,
				error: null,
				computed: true,
				state: null,
				boxes: limit,
			};
		}
		case "lock": {
			const module = index.modules[node.moduleId].module;
			let value = "none";
			const errors = [];
			for (const rule of module.rules) {
				const result = evaluateComparison(rule.left, rule.cmp, rule.right, readSource, rules);
				if (result.error) {
					errors.push(result.error);
				} else if (result.value === 1) {
					value = rule.effect === "hidden" || value === "hidden" ? "hidden" : "locked";
				}
			}
			return { value, error: null, ruleErrors: errors, computed: true, state: null };
		}
		default:
			break;
	}

	const piece = index.pieces[node.pieceId].piece;
	switch (piece.kind) {
		case "variable":
			return piece.ref
				? evaluateReference(graph, piece.ref, readSource, literalNumber(piece.value), rules)
				: { value: literalNumber(piece.value), error: null, computed: false, state: null };
		case "checkbox":
			return { value: Boolean(piece.value), error: null, computed: false, state: null };
		case "tristate":
			return { value: Math.max(0, Math.min(2, Math.trunc(Number(piece.value) || 0))), error: null, computed: false, state: null };
		case "text": {
			let text = "";
			let error = null;
			let hasChip = false;
			for (const segment of piece.segments) {
				if (segment.type === "chip") {
					hasChip = true;
					const entry = values.get(nodeIds.part(piece.id, segment.ref?.id));
					if (entry?.error) {
						error = error || entry.error;
					} else if (entry?.value !== null && entry?.value !== undefined) {
						text += String(entry.value);
					}
				} else {
					text += segment.value ?? "";
				}
			}
			return { value: text, error, computed: hasChip, state: null };
		}
		case "dropdown": {
			const option = piece.options.find((each) => each.id === piece.selectedOptionId) || piece.options[0];
			if (!option) {
				return { value: "", error: null, computed: false, state: null };
			}
			if (!option.ref) {
				return { value: option.label, error: null, computed: false, state: null, optionId: option.id };
			}
			const entry = values.get(nodeIds.part(piece.id, option.id));
			return { value: null, error: null, state: null, ...entry, computed: true, optionId: option.id };
		}
		default:
			return { value: null, error: null, computed: false, state: null };
	}
}

// Every node `changed` can reach through its dependents (itself included).
function downstreamOf(graph, changed) {
	const reached = new Set();
	const stack = [...changed];
	while (stack.length) {
		const id = stack.pop();
		if (reached.has(id) || !graph.nodes.has(id)) {
			continue;
		}
		reached.add(id);
		stack.push(...(graph.dependents.get(id) || []));
	}
	return reached;
}

// The nodes whose own inputs differ between two sheets with the same graph:
// any piece object that changed (its value, selection, segments…), and the
// module-level nodes of any module object that changed. Unchanged objects
// are shared between sheets (every op copies only what it touches), so an
// identity check is enough.
function changedNodes(graph, previousSheet, sheet) {
	const changed = new Set();
	for (const [cardId, card] of Object.entries(sheet.cards)) {
		const previousCard = previousSheet.cards[cardId];
		if (previousCard === card) {
			continue;
		}
		for (const [moduleId, module] of Object.entries(card.modules)) {
			const previousModule = previousCard?.modules[moduleId];
			if (previousModule === module) {
				continue;
			}
			for (const id of [nodeIds.checked(moduleId), nodeIds.capacity(moduleId), nodeIds.lock(moduleId)]) {
				if (graph.nodes.has(id)) {
					changed.add(id);
				}
			}
			for (const [pieceId, piece] of Object.entries(module.pieces)) {
				if (previousModule?.pieces[pieceId] !== piece) {
					changed.add(nodeIds.piece(pieceId));
					(graph.partsByPiece.get(pieceId) || []).forEach((id) => changed.add(id));
				}
			}
		}
	}
	return changed;
}

// Builds the engine for a sheet. Given the engine of the sheet just before
// (and the graph hasn't changed shape), only the nodes downstream of what
// changed are recomputed; `recomputed` lists them.
export function createEngine(sheet, previous = null, rules = RULES_5E) {
	const graph = buildGraph(sheet);
	const incremental = previous && previous.key === graph.key && previous.rules === rules;
	const dirty = incremental ? downstreamOf(graph, changedNodes(graph, previous.sheet, sheet)) : new Set(graph.nodes.keys());
	const values = incremental ? new Map(previous.values) : new Map();
	const recomputed = [];
	for (const id of graph.order) {
		if (dirty.has(id)) {
			values.set(id, computeNode(graph, graph.nodes.get(id), values, rules));
			recomputed.push(id);
		}
	}
	return { ...graph, sheet, rules, values, recomputed };
}

// ---------- Reading ----------

export function readNode(engine, nodeId) {
	return engine.values.get(nodeId) || null;
}

// The current lock state of a module: "none" | "locked" | "hidden".
export function moduleLockState(engine, moduleId) {
	return engine.values.get(nodeIds.lock(moduleId))?.value || "none";
}

// A sheet value by source ({ piece } / { role } / { module, field }), for
// code outside the Character Sheet UI. Returns { value, error }.
export function readSheetValue(sheet, src, engine = createEngine(sheet)) {
	const target = engine.resolve(src);
	if (!target) {
		return { value: null, error: "No such value on this sheet" };
	}
	const entry = engine.values.get(target.pieceId ? nodeIds.piece(target.pieceId) : nodeIds.checked(target.moduleId));
	return entry ? { value: entry.value, error: entry.error } : { value: null, error: "No such value on this sheet" };
}

// ---------- Picking sources ----------

// Whether `src` may be used in the reference held by `targetNode` (a piece,
// chip, option, capacity or lock node). Returns null when it's fine, or a
// short reason it isn't — what pick mode shows on a dimmed source.
export function checkSource(engine, targetNode, src) {
	if (src.piece) {
		const entry = engine.index.pieces[src.piece];
		if (!entry) {
			return "That piece no longer exists";
		}
		if (!VALUE_KINDS.has(entry.piece.kind)) {
			return entry.piece.kind === "image" ? "Images can't be used in math" : "Buttons don't hold a value";
		}
	}
	const target = engine.resolve(src);
	if (!target) {
		return src.role ? "No card on the sheet has that value yet" : "That value no longer exists";
	}
	const start = target.pieceId ? nodeIds.piece(target.pieceId) : nodeIds.checked(target.moduleId);
	const targetPiece = targetNode.split(/[#:]/)[0];
	if (start === targetNode || start === targetPiece) {
		return "A field can't use its own value";
	}
	// A cycle exists if the source already depends on the target.
	const seen = new Set();
	const stack = [start];
	while (stack.length) {
		const id = stack.pop();
		if (id === targetNode) {
			return "That would make a loop — it already depends on this field";
		}
		if (seen.has(id)) {
			continue;
		}
		seen.add(id);
		stack.push(...(engine.nodes.get(id)?.deps || []));
	}
	return null;
}

// The first problem with any source in `expr` for `targetNode`, or null.
export function checkExpression(engine, targetNode, expr) {
	for (const src of collectSources(expr)) {
		const problem = checkSource(engine, targetNode, src);
		if (problem) {
			return problem;
		}
	}
	return null;
}
