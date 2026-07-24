// Formula engine for Variable module pieces.
// A formula is a plain string where other pieces are referenced as #{pieceId},
// e.g. "floor((#{piece-123-abc} - 10) / 2)". References are stored by stable ID,
// never by value, so renames and value changes are always live.
// Supported: + - * / ( ), unary minus, floor(), ceil(), round(), abs(), min(), max().
// Evaluated with a small recursive-descent parser — no eval().

const REF_PATTERN = /#\{([^}]+)\}/g;

export class FormulaError extends Error {}

// Builds a reference token for use inside a formula string.
export function ref(pieceId) {
	return `#{${pieceId}}`;
}

// Returns every pieceId referenced by a formula string.
export function getFormulaRefs(formula) {
	if (!formula) {
		return [];
	}
	const refs = [];
	for (const match of formula.matchAll(REF_PATTERN)) {
		refs.push(match[1]);
	}
	return refs;
}

const FUNCTIONS = {
	floor: { arity: 1, apply: (args) => Math.floor(args[0]) },
	ceil: { arity: 1, apply: (args) => Math.ceil(args[0]) },
	round: { arity: 1, apply: (args) => Math.round(args[0]) },
	abs: { arity: 1, apply: (args) => Math.abs(args[0]) },
	min: { arity: null, apply: (args) => Math.min(...args) },
	max: { arity: null, apply: (args) => Math.max(...args) },
};

function tokenize(formula) {
	const tokens = [];
	let i = 0;
	while (i < formula.length) {
		const ch = formula[i];
		if (/\s/.test(ch)) {
			i += 1;
		} else if (ch === "#" && formula[i + 1] === "{") {
			const end = formula.indexOf("}", i + 2);
			if (end === -1) {
				throw new FormulaError("Unclosed reference (missing })");
			}
			tokens.push({ type: "ref", pieceId: formula.slice(i + 2, end) });
			i = end + 1;
		} else if (/[0-9.]/.test(ch)) {
			const match = /^\d*\.?\d+/.exec(formula.slice(i));
			if (!match) {
				throw new FormulaError(`Invalid number at "${formula.slice(i, i + 8)}"`);
			}
			tokens.push({ type: "number", value: Number(match[0]) });
			i += match[0].length;
		} else if (/[a-zA-Z_]/.test(ch)) {
			const match = /^[a-zA-Z_][a-zA-Z0-9_]*/.exec(formula.slice(i));
			tokens.push({ type: "identifier", value: match[0] });
			i += match[0].length;
		} else if ("+-*/(),".includes(ch)) {
			tokens.push({ type: "op", value: ch });
			i += 1;
		} else {
			throw new FormulaError(`Unexpected character "${ch}"`);
		}
	}
	return tokens;
}

// Evaluates a formula string. resolveRef(pieceId) must return a finite number
// (or throw a FormulaError). Returns { value, error } and never throws for
// formula problems, so a bad formula can render as an error instead of crashing.
export function evaluateFormula(formula, resolveRef) {
	try {
		const tokens = tokenize(formula);
		let pos = 0;
		const peek = () => tokens[pos];
		const next = () => tokens[pos++];
		const expectOp = (value) => {
			const token = next();
			if (!token || token.type !== "op" || token.value !== value) {
				throw new FormulaError(`Expected "${value}"`);
			}
		};

		function parseExpression() {
			let value = parseTerm();
			while (peek() && peek().type === "op" && (peek().value === "+" || peek().value === "-")) {
				const op = next().value;
				const rhs = parseTerm();
				value = op === "+" ? value + rhs : value - rhs;
			}
			return value;
		}

		function parseTerm() {
			let value = parseFactor();
			while (peek() && peek().type === "op" && (peek().value === "*" || peek().value === "/")) {
				const op = next().value;
				const rhs = parseFactor();
				value = op === "*" ? value * rhs : value / rhs;
			}
			return value;
		}

		function parseFactor() {
			const token = peek();
			if (!token) {
				throw new FormulaError("Unexpected end of formula");
			}
			if (token.type === "op" && token.value === "-") {
				next();
				return -parseFactor();
			}
			if (token.type === "op" && token.value === "+") {
				next();
				return parseFactor();
			}
			if (token.type === "number") {
				next();
				return token.value;
			}
			if (token.type === "ref") {
				next();
				const value = resolveRef(token.pieceId);
				if (typeof value !== "number" || Number.isNaN(value)) {
					throw new FormulaError("Reference is not a number");
				}
				return value;
			}
			if (token.type === "identifier") {
				next();
				const fn = FUNCTIONS[token.value];
				if (!fn) {
					throw new FormulaError(`Unknown function "${token.value}"`);
				}
				expectOp("(");
				const args = [parseExpression()];
				while (peek() && peek().type === "op" && peek().value === ",") {
					next();
					args.push(parseExpression());
				}
				expectOp(")");
				if (fn.arity !== null && args.length !== fn.arity) {
					throw new FormulaError(`${token.value}() expects ${fn.arity} argument(s)`);
				}
				return fn.apply(args);
			}
			if (token.type === "op" && token.value === "(") {
				next();
				const value = parseExpression();
				expectOp(")");
				return value;
			}
			throw new FormulaError(`Unexpected "${token.value}"`);
		}

		const value = parseExpression();
		if (pos < tokens.length) {
			throw new FormulaError(`Unexpected "${tokens[pos].value ?? tokens[pos].type}"`);
		}
		if (!Number.isFinite(value)) {
			throw new FormulaError("Result is not a finite number");
		}
		return { value, error: null };
	} catch (error) {
		if (error instanceof FormulaError) {
			return { value: null, error: error.message };
		}
		throw error;
	}
}
