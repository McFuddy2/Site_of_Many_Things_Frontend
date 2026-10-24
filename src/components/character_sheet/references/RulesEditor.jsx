import { useState } from "react";
import { useCharacterSheet } from "../CharacterSheetContext";
import { useReferenceUI } from "./useReferenceUI";
import FloatingPanel from "./FloatingPanel";
import { chipText } from "./chips";
import { createRule } from "../../../utils/character_sheet/schema";
import { moduleLockState, previewExpression } from "../../../utils/character_sheet/engine/engine";
import { describeExpression } from "../../../utils/character_sheet/engine/describe";
import { COMPARISON_LABELS } from "../../../utils/character_sheet/engine/tokens";

// A module's lock/hide rules (desktop only): "when [value] [comparison]
// [value] then [Locked | Hidden]". The left side is built with the popover
// editor, like any reference; the right side is typed. Locked greys the
// module out and keeps its contents; hidden takes it off the sheet (on a
// computer it stays as a faint outline, so this panel can still be found).
// Either way it counts as 0 in math. Every change is one undo step.

const EFFECTS = [
	{ id: "locked", label: "Locked" },
	{ id: "hidden", label: "Hidden" },
];

function exprFromText(text) {
	const trimmed = text.trim();
	return trimmed !== "" && Number.isFinite(Number(trimmed)) ? { num: Number(trimmed) } : { text: trimmed };
}

function textFromExpr(expr) {
	if (expr && "num" in expr) {
		return String(expr.num);
	}
	return expr && "text" in expr ? expr.text : "";
}

function RuleValue({ rule, onCommit }) {
	const [draft, setDraft] = useState(textFromExpr(rule.right));
	const commit = () => {
		if (draft !== textFromExpr(rule.right)) {
			onCommit(exprFromText(draft));
		}
	};
	return (
		<input
			type="text"
			className="cs-ref-panel-input cs-ref-panel-input--value"
			aria-label="Value to compare with"
			value={draft}
			onChange={(event) => setDraft(event.target.value)}
			onBlur={commit}
			onKeyDown={(event) => {
				if (event.key === "Enter") {
					event.preventDefault();
					commit();
				}
			}}
		/>
	);
}

export default function RulesEditor({ moduleId, anchor, onClose }) {
	const { engine, dispatch } = useCharacterSheet();
	const ui = useReferenceUI();
	const module = engine.index.modules[moduleId]?.module;
	if (!module) {
		return null;
	}
	const rules = module.rules || [];
	const label = module.label || "this module";
	const commit = (next) => dispatch({ type: "setModuleRules", moduleId, rules: next });
	const update = (ruleId, patch) => commit(rules.map((rule) => (rule.id === ruleId ? { ...rule, ...patch } : rule)));
	const lock = moduleLockState(engine, moduleId);

	const addRule = (event) => {
		const rule = createRule({ left: null, cmp: "<", right: { num: 1 }, effect: "locked" });
		commit([...rules, rule]);
		ui.openEditor({ kind: "rule", moduleId, ruleId: rule.id }, event.currentTarget);
	};

	return (
		<FloatingPanel anchor={anchor} label={`Lock or hide rules for ${label}`} className="cs-rules-panel" onClose={onClose}>
			<div className="cs-popover-title">Lock or hide “{label}”</div>
			<p className="cs-popover-hint">
				Locked: greyed out and can&apos;t be changed, but keeps what&apos;s in it. Hidden: not shown. Either way it counts
				as 0 in other fields&apos; math.
			</p>
			{rules.length ? (
				<ul className="cs-ref-panel-list">
					{rules.map((rule) => {
						const target = { kind: "rule", moduleId, ruleId: rule.id };
						const now = rule.left ? previewExpression(engine, rule.left) : null;
						const holds = rule.left
							? previewExpression(engine, { if: { left: rule.left, cmp: rule.cmp, right: rule.right }, then: { num: 1 }, else: { num: 0 } })
							: null;
						return (
							<li key={rule.id} className="cs-ref-panel-row cs-rule-row">
								<span className="cs-rule-word">When</span>
								<button
									type="button"
									className={`cs-chip cs-chip--token${rule.left ? "" : " cs-chip--pending"}`}
									title={rule.left ? `${describeExpression(engine, rule.left)} — click to edit` : "Choose the value this rule tests"}
									onClick={(event) => ui.openEditor(target, event.currentTarget)}
								>
									<span className="cs-chip-text">
										{rule.left ? `${describeExpression(engine, rule.left)} (${chipText(now)})` : "Choose a value…"}
									</span>
								</button>
								<select className="cs-ref-panel-select" aria-label="Comparison" value={rule.cmp} onChange={(event) => update(rule.id, { cmp: event.target.value })}>
									{Object.entries(COMPARISON_LABELS).map(([cmp, symbol]) => (
										<option key={cmp} value={cmp}>
											{symbol}
										</option>
									))}
								</select>
								<RuleValue key={JSON.stringify(rule.right)} rule={rule} onCommit={(right) => update(rule.id, { right })} />
								<span className="cs-rule-word">then</span>
								<select className="cs-ref-panel-select" aria-label="Effect" value={rule.effect} onChange={(event) => update(rule.id, { effect: event.target.value })}>
									{EFFECTS.map((effect) => (
										<option key={effect.id} value={effect.id}>
											{effect.label}
										</option>
									))}
								</select>
								<button
									type="button"
									className="cs-ref-key cs-ref-key--danger"
									aria-label="Delete this rule"
									title="Delete this rule"
									onClick={() => commit(rules.filter((each) => each.id !== rule.id))}
								>
									✕
								</button>
								<span className={`cs-rule-status${holds?.value === 1 ? " cs-rule-status--on" : ""}`}>
									{!rule.left ? "Not set up yet" : holds?.error ? `Can't tell: ${holds.error}` : holds?.value === 1 ? "True right now" : "Not true right now"}
								</span>
							</li>
						);
					})}
				</ul>
			) : (
				<p className="cs-ref-panel-empty">No rules yet — this module is always shown.</p>
			)}
			<div className="cs-modal-actions">
				<span className="cs-rule-now">Right now: {lock === "hidden" ? "Hidden" : lock === "locked" ? "Locked" : "Shown"}</span>
				<span className="cs-modal-actions-spacer" />
				<button type="button" className="cs-modal-button" onClick={addRule}>
					+ Add rule
				</button>
				<button type="button" className="cs-modal-button cs-modal-button--primary" onClick={onClose}>
					Done
				</button>
			</div>
		</FloatingPanel>
	);
}
