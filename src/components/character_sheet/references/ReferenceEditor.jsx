import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { useCharacterSheet } from "../CharacterSheetContext";
import { useReferenceUI } from "./useReferenceUI";
import SourceChooser from "./SourceChooser";
import { chipText } from "./chips";
import { LinkIcon } from "../icons";
import { getTargetReference, targetNode } from "../../../utils/character_sheet/sheetOps";
import { nodeIds, checkExpression, previewExpression } from "../../../utils/character_sheet/engine/engine";
import {
	exprToTokens,
	tokensToExpr,
	tokenLabel,
	FUNCTION_LABELS,
	OPERATOR_LABELS,
	COMPARISON_LABELS,
	IF_SKELETON,
} from "../../../utils/character_sheet/engine/tokens";
import { describeExpression, describeLocation, describeRole } from "../../../utils/character_sheet/engine/describe";

// The popover editor (desktop only): a reference built with buttons, not
// typed as a formula. The expression reads as a row of tokens — named
// sources, numbers, operators — with a caret; buttons insert at the caret,
// sources come from Pick on sheet (click the value itself, on any page) or
// Choose source (search), and the preview shows the live result as you go.
// The row also takes the keyboard: digits, + − * / ( ) , Backspace/Delete,
// arrows, Enter saves, Esc cancels.
//
// Saving is one undo step. For a text piece, "Add reference…" saves a new
// chip where the caret was.

const OPERATORS = ["+", "-", "*", "/"];
const KEY_TOKENS = {
	"+": { t: "op", value: "+" },
	"-": { t: "op", value: "-" },
	"*": { t: "op", value: "*" },
	x: { t: "op", value: "*" },
	"/": { t: "op", value: "/" },
	"(": { t: "(" },
	")": { t: ")" },
	",": { t: "," },
	"<": { t: "cmp", value: "<" },
	">": { t: "cmp", value: ">" },
	"=": { t: "cmp", value: "=" },
};
const VIEWPORT_MARGIN = 8;
const GAP = 6;

export default function ReferenceEditor({ target, anchor, onClose }) {
	const { sheet, engine, dispatch } = useCharacterSheet();
	const ui = useReferenceUI();
	const previewId = useId();
	const rootRef = useRef(null);
	const rowRef = useRef(null);
	const isNewChip = target.kind === "chip" && !target.refId;
	const existing = isNewChip ? null : getTargetReference(sheet, target);
	const [draft, setDraft] = useState(() => {
		const tokens = existing ? exprToTokens(existing.expr) : [];
		return { tokens, caret: tokens.length };
	});
	const [nickname, setNickname] = useState(existing?.nickname || "");
	const [number, setNumber] = useState("");
	const [choosing, setChoosing] = useState(false);
	const [position, setPosition] = useState({ left: anchor.left, top: anchor.bottom + GAP });

	const node = isNewChip ? nodeIds.piece(target.pieceId) : targetNode(target);
	const host = describeLocation(engine, { pieceId: target.pieceId ?? null, moduleId: target.moduleId ?? null });
	const hostModule = target.pieceId ? engine.index.modules[engine.index.pieces[target.pieceId]?.moduleId]?.module : null;
	const parsed = tokensToExpr(draft.tokens, engine.rules);
	const problem = parsed.error || checkExpression(engine, node, parsed.expr);
	const preview = problem ? null : previewExpression(engine, parsed.expr);
	const canSave = !problem && !preview?.error;
	const option = target.kind === "option" ? engine.index.pieces[target.pieceId]?.piece.options.find((each) => each.id === target.optionId) : null;
	const title =
		target.kind === "rule"
			? "Rule: the value to test"
			: target.kind === "capacity"
				? "Box count"
				: option
					? `Option “${option.label}”`
					: existing
						? "Edit reference"
						: "Add reference";

	// Below the field when there's room, else above it; always on screen.
	useLayoutEffect(() => {
		const box = rootRef.current?.getBoundingClientRect();
		if (!box || ui.picking) {
			return;
		}
		const below = anchor.bottom + GAP;
		const top = below + box.height <= window.innerHeight - VIEWPORT_MARGIN ? below : anchor.top - box.height - GAP;
		setPosition({
			left: Math.max(VIEWPORT_MARGIN, Math.min(anchor.left, window.innerWidth - box.width - VIEWPORT_MARGIN)),
			top: Math.max(VIEWPORT_MARGIN, Math.min(top, window.innerHeight - box.height - VIEWPORT_MARGIN)),
		});
	}, [anchor.left, anchor.top, anchor.bottom, ui.picking, choosing]);

	useEffect(() => {
		if (!ui.picking && !choosing) {
			rowRef.current?.focus();
		}
	}, [ui.picking, choosing]);

	const insert = (tokens) =>
		setDraft(({ tokens: current, caret }) => ({
			tokens: [...current.slice(0, caret), ...tokens, ...current.slice(caret)],
			caret: caret + tokens.length,
		}));

	const typeDigit = (digit) =>
		setDraft(({ tokens, caret }) => {
			const before = tokens[caret - 1];
			if (before?.t === "num") {
				const next = [...tokens];
				next[caret - 1] = { t: "num", value: before.value + digit };
				return { tokens: next, caret };
			}
			return { tokens: [...tokens.slice(0, caret), { t: "num", value: digit }, ...tokens.slice(caret)], caret: caret + 1 };
		});

	// Backspace: one character off a number being typed, else the whole token.
	const backspace = () =>
		setDraft(({ tokens, caret }) => {
			const before = tokens[caret - 1];
			if (!before) {
				return { tokens, caret };
			}
			if (before.t === "num" && before.value.length > 1) {
				const next = [...tokens];
				next[caret - 1] = { t: "num", value: before.value.slice(0, -1) };
				return { tokens: next, caret };
			}
			return { tokens: [...tokens.slice(0, caret - 1), ...tokens.slice(caret)], caret: caret - 1 };
		});

	// The if… button drops in the whole "if( ≥ then else )" frame with the
	// caret inside it; a comparison button swaps the comparison just before
	// the caret, or adds one.
	const insertIf = () =>
		setDraft(({ tokens, caret }) => ({
			tokens: [...tokens.slice(0, caret), ...IF_SKELETON, ...tokens.slice(caret)],
			caret: caret + 1,
		}));
	const setComparison = (value) =>
		setDraft(({ tokens, caret }) => {
			if (tokens[caret - 1]?.t === "cmp") {
				const next = [...tokens];
				next[caret - 1] = { t: "cmp", value };
				return { tokens: next, caret };
			}
			return { tokens: [...tokens.slice(0, caret), { t: "cmp", value }, ...tokens.slice(caret)], caret: caret + 1 };
		});

	const removeAfter = () => setDraft(({ tokens, caret }) => ({ tokens: [...tokens.slice(0, caret), ...tokens.slice(caret + 1)], caret }));
	const moveCaret = (to) => setDraft(({ tokens, caret }) => ({ tokens, caret: Math.max(0, Math.min(tokens.length, to(caret, tokens.length))) }));

	const addNumber = () => {
		const value = number.trim();
		if (value !== "" && Number.isFinite(Number(value))) {
			insert([{ t: "num", value }]);
			setNumber("");
			rowRef.current?.focus();
		}
	};

	const addSource = (src) => {
		insert([{ t: "src", src }]);
		setChoosing(false);
	};

	const save = () => {
		if (!canSave) {
			return;
		}
		const name = nickname.trim() || null;
		if (isNewChip) {
			dispatch({ type: "insertChip", pieceId: target.pieceId, expr: parsed.expr, offset: target.offset ?? null, nickname: name });
		} else {
			dispatch({ type: "setReference", target, expr: parsed.expr, nickname: name });
		}
		onClose();
	};

	const sourceName = (src) => {
		const resolved = engine.resolve(src);
		if (resolved) {
			const where = describeLocation(engine, { ...resolved, field: src.field || null });
			return where.pageId && where.pageId !== sheet.activePageId ? `${where.pageName} › ${where.name}` : where.name;
		}
		return src.role ? `${describeRole(src.role)} (no card yet)` : "Missing source";
	};

	const onRowKeyDown = (event) => {
		if (event.ctrlKey || event.metaKey || event.altKey) {
			return;
		}
		const key = event.key;
		let handled = true;
		if (/^[0-9.]$/.test(key)) {
			typeDigit(key);
		} else if (KEY_TOKENS[key.toLowerCase()]?.t === "cmp") {
			setComparison(KEY_TOKENS[key.toLowerCase()].value);
		} else if (KEY_TOKENS[key.toLowerCase()]) {
			insert([KEY_TOKENS[key.toLowerCase()]]);
		} else if (key === "Backspace") {
			backspace();
		} else if (key === "Delete") {
			removeAfter();
		} else if (key === "ArrowLeft") {
			moveCaret((caret) => caret - 1);
		} else if (key === "ArrowRight") {
			moveCaret((caret) => caret + 1);
		} else if (key === "Home") {
			moveCaret(() => 0);
		} else if (key === "End") {
			moveCaret((caret, length) => length);
		} else if (key === "Enter") {
			save();
		} else {
			handled = false;
		}
		if (handled) {
			event.preventDefault();
			event.stopPropagation();
		}
	};

	if (ui.picking) {
		return (
			<div className="cs-ref-pickbar" role="status" data-ref-ui>
				<LinkIcon size={14} />
				<span>Click a value on the sheet to use it — other pages work too.</span>
				<button type="button" className="cs-modal-button" onClick={ui.stopPick}>
					Cancel (Esc)
				</button>
			</div>
		);
	}

	const tokenElements = [];
	draft.tokens.forEach((token, index) => {
		if (index === draft.caret) {
			tokenElements.push(<span key="caret" className="cs-ref-caret" aria-hidden="true" />);
		}
		const place = () => setDraft(({ tokens }) => ({ tokens, caret: index + 1 }));
		if (token.t === "src") {
			const name = sourceName(token.src);
			tokenElements.push(
				<span key={index} className={`cs-chip cs-chip--token${engine.resolve(token.src) ? "" : " cs-chip--pending"}`} title={name} onClick={place}>
					<LinkIcon />
					<span className="cs-chip-text">{name}</span>
				</span>
			);
		} else {
			const label = token.t === "expr" ? describeExpression(engine, token.expr) : tokenLabel(token, engine.rules);
			tokenElements.push(
				<span key={index} className={`cs-ref-token cs-ref-token--${token.t}`} onClick={place}>
					{label}
				</span>
			);
		}
	});
	if (draft.caret === draft.tokens.length) {
		tokenElements.push(<span key="caret" className="cs-ref-caret" aria-hidden="true" />);
	}

	const keyButton = (label, tokens, title) => (
		<button key={label} type="button" className="cs-ref-key" title={title} onClick={() => insert(tokens)}>
			{label}
		</button>
	);

	return (
		<div
			ref={rootRef}
			className="cs-popover cs-ref-editor"
			role="dialog"
			aria-label={`Reference for ${host?.name || "this field"}`}
			data-ref-ui
			style={{ left: position.left, top: position.top }}
			onKeyDown={(event) => {
				if (event.key === "Escape") {
					event.preventDefault();
					event.stopPropagation();
					onClose();
				}
			}}
		>
			<div className="cs-popover-title">
				{title} <span className="cs-ref-editor-where">— {host?.path}</span>
			</div>

			<div
				ref={rowRef}
				className="cs-ref-tokens"
				tabIndex={0}
				role="textbox"
				aria-label="Reference: use the buttons below, or type numbers and + − * / ( )"
				aria-describedby={previewId}
				onKeyDown={onRowKeyDown}
				onClick={(event) => {
					if (event.target === event.currentTarget) {
						moveCaret((caret, length) => length);
					}
				}}
			>
				{draft.tokens.length ? null : <span className="cs-ref-tokens-empty">Pick a source or add a number…</span>}
				{tokenElements}
			</div>

			<div className="cs-ref-keys" role="group" aria-label="Math">
				{OPERATORS.map((op) => keyButton(OPERATOR_LABELS[op], [{ t: "op", value: op }]))}
				{keyButton("(", [{ t: "(" }])}
				{keyButton(")", [{ t: ")" }])}
				{keyButton(",", [{ t: "," }], "Separates the values in min/max")}
				<button type="button" className="cs-ref-key" title="Delete the piece before the caret" onClick={backspace}>
					⌫
				</button>
			</div>
			<div className="cs-ref-keys" role="group" aria-label="Conditions">
				<button type="button" className="cs-ref-key" title="if (value, comparison, value) then … else …" onClick={insertIf}>
					if … then … else
				</button>
				{Object.entries(COMPARISON_LABELS).map(([cmp, symbol]) => (
					<button key={cmp} type="button" className="cs-ref-key" title="Comparison (inside if…)" onClick={() => setComparison(cmp)}>
						{symbol}
					</button>
				))}
			</div>
			<div className="cs-ref-keys" role="group" aria-label="Functions">
				{Object.entries(FUNCTION_LABELS).map(([name, label]) => keyButton(label, [{ t: "fn", name }]))}
				{Object.entries(engine.rules.functions || {}).map(([name, rule]) => keyButton(`${rule.label} …`, [{ t: "fn", name }]))}
				{Object.entries(engine.rules.tables || {}).map(([name, table]) => keyButton(`${table.label} …`, [{ t: "lookup", name }]))}
			</div>

			<div className="cs-ref-row">
				<input
					type="number"
					className="cs-ref-number"
					aria-label="Number to add"
					placeholder="Number"
					value={number}
					onChange={(event) => setNumber(event.target.value)}
					onKeyDown={(event) => {
						if (event.key === "Enter") {
							event.preventDefault();
							addNumber();
						}
					}}
				/>
				<button type="button" className="cs-modal-button" onClick={addNumber}>
					Add number
				</button>
				<span className="cs-modal-actions-spacer" />
				<button type="button" className="cs-modal-button" onClick={() => ui.startPick(node, addSource)}>
					Pick on sheet
				</button>
				<button type="button" className="cs-modal-button" aria-expanded={choosing} onClick={() => setChoosing((open) => !open)}>
					Choose source…
				</button>
			</div>
			{choosing ? (
				<SourceChooser engine={engine} sheet={sheet} targetNode={node} onChoose={addSource} onClose={() => setChoosing(false)} />
			) : null}

			<div id={previewId} className={`cs-ref-preview${problem || preview?.error ? " cs-ref-preview--problem" : ""}`} aria-live="polite">
				{problem
					? problem
					: preview?.error
						? `Problem: ${preview.error}`
						: `Result: ${chipText(preview, { signed: Boolean(hostModule?.signed) })}`}
			</div>

			{target.kind === "rule" ? null : (
				<label className="cs-ref-row cs-ref-nickname">
					<span>Name (optional)</span>
					<input type="text" value={nickname} placeholder="e.g. Rage damage" onChange={(event) => setNickname(event.target.value)} />
				</label>
			)}

			<div className="cs-modal-actions">
				<button type="button" className="cs-modal-button" onClick={onClose}>
					Cancel
				</button>
				<button type="button" className="cs-modal-button cs-modal-button--primary" disabled={!canSave} onClick={save}>
					Save
				</button>
			</div>
		</div>
	);
}
