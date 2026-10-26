// Reference expressions: a small tree of plain data, saved with the sheet by
// stable id and evaluated by walking it — never a formula string, never
// eval() or Function(). Node shapes:
//
//   { num: 3 }                                        a number
//   { text: "STR" }                                   a piece of text
//   { src: { piece: "piece-…" } }                     another piece's value
//   { src: { role: "ability.dex.bonus" } }            whichever piece holds that role
//   { src: { module: "module-…", field: "checked" } } how many of a checkbox group's boxes are checked
//   { op: "+" | "-" | "*" | "/", args: [a, b] }
//   { fn: "floor" | "ceil" | "min" | "max" | <rules function>, args: [...] }
//   { lookup: "<rules table>", arg: a }
//   { if: { left: a, cmp: "<", right: b }, then: c, else: d }
//   { param: "score" }                                only inside a rules-file function
//
// In math, blank counts as 0, a checkbox as 0/1 and a tri-state as 0/1/2;
// text that isn't a number is an error. Evaluation never throws: problems
// come back as { value: null, error }.

import { RULES_5E } from "./rules5e.js";

export const COMPARISONS = ["<", "<=", ">", ">=", "=", "!="];
const MAX_FUNCTION_DEPTH = 20;

class ExpressionError extends Error {}

// ---------- Builders (for defaults written as data, and tests) ----------

export const num = (value) => ({ num: value });
export const text = (value) => ({ text: value });
export const pieceSrc = (pieceId) => ({ src: { piece: pieceId } });
export const roleSrc = (role) => ({ src: { role } });
export const checkedSrc = (moduleId) => ({ src: { module: moduleId, field: "checked" } });
export const add = (a, b) => ({ op: "+", args: [a, b] });
export const sub = (a, b) => ({ op: "-", args: [a, b] });
export const mul = (a, b) => ({ op: "*", args: [a, b] });
export const div = (a, b) => ({ op: "/", args: [a, b] });
export const fn = (name, ...args) => ({ fn: name, args });
export const lookup = (table, arg) => ({ lookup: table, arg });
export const ifThen = (left, cmp, right, thenExpr, elseExpr) => ({ if: { left, cmp, right }, then: thenExpr, else: elseExpr });

// ---------- Walking ----------

// Every child expression of a node, in reading order.
function children(node) {
	if (!node || typeof node !== "object") {
		return [];
	}
	if (Array.isArray(node.args)) {
		return node.args;
	}
	if ("lookup" in node) {
		return [node.arg];
	}
	if ("if" in node) {
		return [node.if?.left, node.if?.right, node.then, node.else];
	}
	return [];
}

// Every `src` an expression reads, in reading order (duplicates kept).
export function collectSources(expr) {
	const sources = [];
	const walk = (node) => {
		if (node && typeof node === "object" && node.src) {
			sources.push(node.src);
		}
		children(node).forEach(walk);
	};
	walk(expr);
	return sources;
}

// A copy of `expr` with every src replaced by update(src) (return the same
// src to keep it).
export function mapSources(expr, update) {
	if (!expr || typeof expr !== "object") {
		return expr;
	}
	if (expr.src) {
		return { ...expr, src: update(expr.src) };
	}
	if (Array.isArray(expr.args)) {
		return { ...expr, args: expr.args.map((arg) => mapSources(arg, update)) };
	}
	if ("lookup" in expr) {
		return { ...expr, arg: mapSources(expr.arg, update) };
	}
	if ("if" in expr) {
		return {
			...expr,
			if: { ...expr.if, left: mapSources(expr.if?.left, update), right: mapSources(expr.if?.right, update) },
			then: mapSources(expr.then, update),
			else: mapSources(expr.else, update),
		};
	}
	return expr;
}

// ---------- Coercion ----------

function requireNumber(value) {
	if (typeof value === "number") {
		if (!Number.isFinite(value)) {
			throw new ExpressionError("The result isn't a finite number");
		}
		return value;
	}
	if (typeof value === "boolean") {
		return value ? 1 : 0;
	}
	if (value === null || value === undefined) {
		return 0;
	}
	const trimmed = String(value).trim();
	if (trimmed === "") {
		return 0;
	}
	const number = Number(trimmed);
	if (!Number.isFinite(number)) {
		throw new ExpressionError(`“${trimmed}” isn't a number`);
	}
	return number;
}

// A value as a number for math: { value, error }.
export function toNumber(value) {
	try {
		return { value: requireNumber(value), error: null };
	} catch (error) {
		return { value: null, error: error.message };
	}
}

// Floating-point noise (0.1 + 0.2) never reaches the sheet.
function tidy(value) {
	return typeof value === "number" ? Math.round(value * 1e10) / 1e10 : value;
}

function compare(left, cmp, right) {
	if (cmp === "=" || cmp === "!=") {
		const a = toNumber(left);
		const b = toNumber(right);
		const equal = !a.error && !b.error ? a.value === b.value : String(left ?? "").trim() === String(right ?? "").trim();
		return cmp === "=" ? equal : !equal;
	}
	const a = requireNumber(left);
	const b = requireNumber(right);
	switch (cmp) {
		case "<":
			return a < b;
		case "<=":
			return a <= b;
		case ">":
			return a > b;
		case ">=":
			return a >= b;
		default:
			throw new ExpressionError(`Unknown comparison “${cmp}”`);
	}
}

// A threshold ladder: rows are [threshold, result] in ascending order. The
// last row whose threshold is at or below the input wins; inputs below the
// first row or above the last clamp to them.
export function lookupLadder(rows, input) {
	if (!Array.isArray(rows) || !rows.length) {
		throw new ExpressionError("That table has no rows");
	}
	let result = rows[0][1];
	for (const [threshold, output] of rows) {
		if (input >= threshold) {
			result = output;
		}
	}
	return result;
}

const BUILTIN_FUNCTIONS = {
	floor: (args) => Math.floor(requireNumber(args[0])),
	ceil: (args) => Math.ceil(requireNumber(args[0])),
	min: (args) => Math.min(...args.map(requireNumber)),
	max: (args) => Math.max(...args.map(requireNumber)),
};

const ARITY = { floor: 1, ceil: 1 };

// ---------- Evaluation ----------

function evaluateNode(node, env) {
	if (!node || typeof node !== "object") {
		throw new ExpressionError("The reference is empty");
	}
	if ("num" in node) {
		return requireNumber(node.num);
	}
	if ("text" in node) {
		return String(node.text ?? "");
	}
	if ("src" in node) {
		const read = env.readSource(node.src);
		if (read.error) {
			throw new ExpressionError(read.error);
		}
		return read.value;
	}
	if ("param" in node) {
		if (!env.params || !(node.param in env.params)) {
			throw new ExpressionError(`Unknown input “${node.param}”`);
		}
		return env.params[node.param];
	}
	if ("op" in node) {
		if (!Array.isArray(node.args) || node.args.length !== 2) {
			throw new ExpressionError(`“${node.op}” needs two values`);
		}
		const [a, b] = node.args.map((arg) => requireNumber(evaluateNode(arg, env)));
		switch (node.op) {
			case "+":
				return a + b;
			case "-":
				return a - b;
			case "*":
				return a * b;
			case "/":
				if (b === 0) {
					throw new ExpressionError("Can't divide by zero");
				}
				return a / b;
			default:
				throw new ExpressionError(`Unknown operator “${node.op}”`);
		}
	}
	if ("fn" in node) {
		const args = (node.args || []).map((arg) => evaluateNode(arg, env));
		const builtin = BUILTIN_FUNCTIONS[node.fn];
		if (builtin) {
			if (!args.length || (ARITY[node.fn] && args.length !== ARITY[node.fn])) {
				throw new ExpressionError(`${node.fn} needs ${ARITY[node.fn] || "at least one"} value`);
			}
			return builtin(args);
		}
		const defined = env.rules.functions?.[node.fn];
		if (!defined) {
			throw new ExpressionError(`Unknown function “${node.fn}”`);
		}
		if (env.depth >= MAX_FUNCTION_DEPTH) {
			throw new ExpressionError("Too many nested functions");
		}
		const params = Object.fromEntries(defined.params.map((name, index) => [name, args[index]]));
		return evaluateNode(defined.expr, { ...env, params, depth: env.depth + 1 });
	}
	if ("lookup" in node) {
		const table = env.rules.tables?.[node.lookup];
		if (!table) {
			throw new ExpressionError(`Unknown table “${node.lookup}”`);
		}
		return lookupLadder(table.rows, requireNumber(evaluateNode(node.arg, env)));
	}
	if ("if" in node) {
		const condition = compare(evaluateNode(node.if?.left, env), node.if?.cmp, evaluateNode(node.if?.right, env));
		return evaluateNode(condition ? node.then : node.else, env);
	}
	throw new ExpressionError("Unknown kind of reference");
}

// Evaluates an expression. readSource(src) returns { value, error } for one
// source. Returns { value, error } and never throws for expression problems.
export function evaluateExpression(expr, readSource, rules = RULES_5E) {
	try {
		const value = evaluateNode(expr, { readSource, rules, params: null, depth: 0 });
		if (typeof value === "number" && !Number.isFinite(value)) {
			return { value: null, error: "The result isn't a finite number" };
		}
		return { value: tidy(value), error: null };
	} catch (error) {
		if (error instanceof ExpressionError) {
			return { value: null, error: error.message };
		}
		throw error;
	}
}

// Whether a comparison holds — what module rules use. { value: bool, error }.
export function evaluateComparison(left, cmp, right, readSource, rules = RULES_5E) {
	return evaluateExpression({ if: { left, cmp, right }, then: { num: 1 }, else: { num: 0 } }, readSource, rules);
}
