// What the popover editor edits: a reference as a flat row of tokens, the
// way it reads ("round down( [Score] ÷ 2 ) − 5"), converted to and from the
// saved expression tree (see expression.js). Tokens never get saved.
//
//   { t: "num", value: "12" }        a number (a string while it's typed)
//   { t: "src", src }                a source on the sheet
//   { t: "op", value: "+" | "-" | "*" | "/" }
//   { t: "(" } { t: ")" } { t: "," }
//   { t: "fn", name }                a function and its opening "(" —
//                                    floor, ceil, min, max, or a rules function
//   { t: "lookup", name }            a rules table and its opening "("
//   { t: "if" } { t: "cmp", value } { t: "then" } { t: "else" }
//                                    if( <value> <comparison> <value> then <value> else <value> )
//   { t: "expr", expr }              anything else, kept whole

import { RULES_5E } from "./rules5e.js";

const PRECEDENCE = { "+": 1, "-": 1, "*": 2, "/": 2 };
const BUILTIN_ARITY = { floor: 1, ceil: 1, min: null, max: null };

export const FUNCTION_LABELS = { floor: "round down", ceil: "round up", min: "min", max: "max" };
export const OPERATOR_LABELS = { "+": "+", "-": "−", "*": "×", "/": "÷" };
export const COMPARISON_LABELS = { "<": "<", "<=": "≤", "=": "=", "!=": "≠", ">=": "≥", ">": ">" };

// What the editor's "if" button inserts: the whole skeleton, so the row
// always reads as one; the caret goes just inside "if(".
export const IF_SKELETON = [{ t: "if" }, { t: "cmp", value: ">=" }, { t: "then" }, { t: "else" }, { t: ")" }];

class TokenError extends Error {}

// ---------- Expression → tokens ----------

function isUnaryMinus(node) {
	return node?.op === "-" && node.args?.[0] && "num" in node.args[0] && Number(node.args[0].num) === 0;
}

function precedenceOf(node) {
	if (node && "op" in node) {
		return isUnaryMinus(node) ? 3 : PRECEDENCE[node.op] || 0;
	}
	return 4;
}

export function exprToTokens(expr) {
	if (!expr || typeof expr !== "object") {
		return [];
	}
	if ("num" in expr) {
		return [{ t: "num", value: String(expr.num) }];
	}
	if ("src" in expr) {
		return [{ t: "src", src: expr.src }];
	}
	if ("op" in expr && Array.isArray(expr.args) && expr.args.length === 2) {
		const wrap = (child, needs) => (needs ? [{ t: "(" }, ...exprToTokens(child), { t: ")" }] : exprToTokens(child));
		if (isUnaryMinus(expr)) {
			return [{ t: "op", value: "-" }, ...wrap(expr.args[1], precedenceOf(expr.args[1]) < 3)];
		}
		const own = PRECEDENCE[expr.op];
		const [left, right] = expr.args;
		const rightPrecedence = precedenceOf(right);
		const rightNeedsParens = rightPrecedence < own || (rightPrecedence === own && (expr.op === "-" || expr.op === "/"));
		return [...wrap(left, precedenceOf(left) < own), { t: "op", value: expr.op }, ...wrap(right, rightNeedsParens)];
	}
	if ("fn" in expr) {
		const tokens = [{ t: "fn", name: expr.fn }];
		(expr.args || []).forEach((arg, index) => {
			if (index) {
				tokens.push({ t: "," });
			}
			tokens.push(...exprToTokens(arg));
		});
		return [...tokens, { t: ")" }];
	}
	if ("lookup" in expr) {
		return [{ t: "lookup", name: expr.lookup }, ...exprToTokens(expr.arg), { t: ")" }];
	}
	if ("if" in expr && expr.if && COMPARISON_LABELS[expr.if.cmp]) {
		return [
			{ t: "if" },
			...exprToTokens(expr.if.left),
			{ t: "cmp", value: expr.if.cmp },
			...exprToTokens(expr.if.right),
			{ t: "then" },
			...exprToTokens(expr.then),
			{ t: "else" },
			...exprToTokens(expr.else),
			{ t: ")" },
		];
	}
	return [{ t: "expr", expr }];
}

// ---------- Tokens → expression ----------

function describeToken(token) {
	if (!token) {
		return "the end";
	}
	if (token.t === "src" || token.t === "expr") {
		return "that value";
	}
	return `“${tokenLabel(token)}”`;
}

// Parses a token row into an expression: { expr, error }. An error names
// what's missing ("Add a value after “+”"), so the preview can say why it
// can't be saved yet.
export function tokensToExpr(tokens, rules = RULES_5E) {
	if (!tokens.length) {
		return { expr: null, error: "Add a value or pick a source" };
	}
	let pos = 0;
	const peek = () => tokens[pos];
	const next = () => tokens[pos++];

	function parseExpression() {
		let node = parseTerm();
		while (peek()?.t === "op" && (peek().value === "+" || peek().value === "-")) {
			const op = next().value;
			node = { op, args: [node, parseTerm(op)] };
		}
		return node;
	}

	function parseTerm(after) {
		let node = parseUnary(after);
		while (peek()?.t === "op" && (peek().value === "*" || peek().value === "/")) {
			const op = next().value;
			node = { op, args: [node, parseUnary(op)] };
		}
		return node;
	}

	function parseUnary(after) {
		if (peek()?.t === "op" && peek().value === "-") {
			next();
			return { op: "-", args: [{ num: 0 }, parseUnary("-")] };
		}
		return parsePrimary(after);
	}

	function parseArguments(name, arity) {
		const args = [parseExpression()];
		while (peek()?.t === ",") {
			next();
			args.push(parseExpression());
		}
		if (peek()?.t !== ")") {
			throw new TokenError(`Close “${name}(” with “)”`);
		}
		next();
		if (arity !== null && args.length !== arity) {
			throw new TokenError(`“${name}” takes ${arity} value${arity === 1 ? "" : "s"}`);
		}
		return args;
	}

	function parsePrimary(after) {
		const token = next();
		if (!token || [")", ",", "op", "cmp", "then", "else"].includes(token.t)) {
			throw new TokenError(after ? `Add a value after “${OPERATOR_LABELS[after] || after}”` : `Add a value before ${describeToken(token)}`);
		}
		switch (token.t) {
			case "num": {
				const value = Number(token.value);
				if (token.value === "" || !Number.isFinite(value)) {
					throw new TokenError(`“${token.value}” isn't a number`);
				}
				return { num: value };
			}
			case "src":
				return { src: token.src };
			case "expr":
				return token.expr;
			case "(": {
				const inner = parseExpression();
				if (peek()?.t !== ")") {
					throw new TokenError("Close “(” with “)”");
				}
				next();
				return inner;
			}
			case "fn": {
				const builtin = token.name in BUILTIN_ARITY;
				const defined = rules.functions?.[token.name];
				if (!builtin && !defined) {
					throw new TokenError(`Unknown function “${token.name}”`);
				}
				const label = FUNCTION_LABELS[token.name] || defined.label;
				const arity = builtin ? BUILTIN_ARITY[token.name] : defined.params.length;
				return { fn: token.name, args: parseArguments(label, arity) };
			}
			case "if": {
				const left = parseExpression();
				if (peek()?.t !== "cmp") {
					throw new TokenError("Add a comparison (<, ≤, =, ≠, ≥, >) inside “if(”");
				}
				const cmp = next().value;
				const right = parseExpression();
				if (peek()?.t !== "then") {
					throw new TokenError("Add “then” after the comparison");
				}
				next();
				const thenExpr = parseExpression();
				if (peek()?.t !== "else") {
					throw new TokenError("Add “else” after the “then” value");
				}
				next();
				const elseExpr = parseExpression();
				if (peek()?.t !== ")") {
					throw new TokenError("Close “if(” with “)”");
				}
				next();
				return { if: { left, cmp, right }, then: thenExpr, else: elseExpr };
			}
			case "lookup": {
				const table = rules.tables?.[token.name];
				if (!table) {
					throw new TokenError(`Unknown table “${token.name}”`);
				}
				return { lookup: token.name, arg: parseArguments(table.label, 1)[0] };
			}
			default:
				throw new TokenError("That piece doesn't fit here");
		}
	}

	try {
		const expr = parseExpression();
		if (pos < tokens.length) {
			const extra = tokens[pos];
			if (extra.t === ")") {
				throw new TokenError("There's a “)” with no “(”");
			}
			if (["cmp", "then", "else"].includes(extra.t)) {
				throw new TokenError(`“${tokenLabel(extra)}” only works inside “if(”`);
			}
			throw new TokenError(`Add an operator before ${describeToken(extra)}`);
		}
		return { expr, error: null };
	} catch (error) {
		if (error instanceof TokenError) {
			return { expr: null, error: error.message };
		}
		throw error;
	}
}

// How one token reads in the editor (sources are named by the caller).
export function tokenLabel(token, rules = RULES_5E) {
	switch (token.t) {
		case "num":
			return token.value;
		case "op":
			return OPERATOR_LABELS[token.value];
		case "fn":
			return `${FUNCTION_LABELS[token.name] || rules.functions?.[token.name]?.label || token.name}(`;
		case "lookup":
			return `${rules.tables?.[token.name]?.label || token.name}(`;
		case "if":
			return "if(";
		case "cmp":
			return COMPARISON_LABELS[token.value] || token.value;
		case "then":
		case "else":
			return token.t;
		case "(":
		case ")":
		case ",":
			return token.t;
		default:
			return "…";
	}
}
