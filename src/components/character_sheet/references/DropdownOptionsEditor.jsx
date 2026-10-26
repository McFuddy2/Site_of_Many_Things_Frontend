import { useState } from "react";
import { useCharacterSheet } from "../CharacterSheetContext";
import { useReferenceUI } from "./useReferenceUI";
import FloatingPanel from "./FloatingPanel";
import { chipText, chipState } from "./chips";
import { LinkIcon } from "../icons";
import { createDropdownOption } from "../../../utils/character_sheet/schema";
import { nodeIds } from "../../../utils/character_sheet/engine/engine";
import { describeExpression } from "../../../utils/character_sheet/engine/describe";

// A dropdown's options (desktop only — the ✎ at the foot of its list): add,
// rename, reorder and delete them, and link each to a value with the same
// popover editor and Pick mode as any reference. Every change is one undo
// step; the selection stays on its option while that option exists.

function OptionName({ option, onCommit }) {
	const [draft, setDraft] = useState(option.label);
	const commit = () => {
		const label = draft.trim() || option.label;
		setDraft(label);
		if (label !== option.label) {
			onCommit(label);
		}
	};
	return (
		<input
			type="text"
			className="cs-ref-panel-input"
			aria-label="Option name"
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

export default function DropdownOptionsEditor({ pieceId, anchor, onClose }) {
	const { engine, dispatch } = useCharacterSheet();
	const ui = useReferenceUI();
	const entry = engine.index.pieces[pieceId];
	if (!entry || entry.piece.kind !== "dropdown") {
		return null;
	}
	const { piece } = entry;
	const options = piece.options;
	const commit = (next) => dispatch({ type: "setDropdownOptions", pieceId, options: next });
	const move = (index, by) => {
		const next = [...options];
		const [option] = next.splice(index, 1);
		next.splice(index + by, 0, option);
		commit(next);
	};

	return (
		<FloatingPanel anchor={anchor} label={`Options for ${piece.label || "this dropdown"}`} className="cs-options-panel" onClose={onClose}>
			<div className="cs-popover-title">Options — {piece.label || "Dropdown"}</div>
			<p className="cs-popover-hint">
				An option can be plain text, or linked to a value on the sheet — then the dropdown&apos;s value is that value.
			</p>
			<ul className="cs-ref-panel-list">
				{options.map((option, index) => {
					const value = option.ref ? engine.values.get(nodeIds.part(pieceId, option.id)) : null;
					const state = chipState(value);
					const target = { kind: "option", pieceId, optionId: option.id };
					return (
						<li key={option.id} className="cs-ref-panel-row">
							<span className="cs-ref-panel-order">
								<button type="button" className="cs-ref-key" aria-label={`Move ${option.label} up`} disabled={index === 0} onClick={() => move(index, -1)}>
									↑
								</button>
								<button
									type="button"
									className="cs-ref-key"
									aria-label={`Move ${option.label} down`}
									disabled={index === options.length - 1}
									onClick={() => move(index, 1)}
								>
									↓
								</button>
							</span>
							<OptionName option={option} onCommit={(label) => commit(options.map((each) => (each.id === option.id ? { ...each, label } : each)))} />
							{option.ref ? (
								<button
									type="button"
									className={`cs-chip cs-chip--token${state ? ` cs-chip--${state}` : ""}`}
									title={`= ${describeExpression(engine, option.ref.expr)} — click to edit`}
									aria-label={`${option.label} is linked: ${chipText(value, { signed: true })}. Edit its reference`}
									onClick={(event) => ui.openEditor(target, event.currentTarget)}
								>
									<LinkIcon />
									<span className="cs-chip-text">{chipText(value, { signed: true })}</span>
								</button>
							) : (
								<button type="button" className="cs-modal-button cs-ref-panel-small" onClick={(event) => ui.openEditor(target, event.currentTarget)}>
									Link…
								</button>
							)}
							{option.ref ? (
								<button
									type="button"
									className="cs-ref-key"
									title="Make it plain text again"
									aria-label={`Unlink ${option.label}`}
									onClick={() => dispatch({ type: "removeReference", target })}
								>
									⊘
								</button>
							) : null}
							<button
								type="button"
								className="cs-ref-key cs-ref-key--danger"
								aria-label={`Delete ${option.label}`}
								title="Delete this option"
								onClick={() => commit(options.filter((each) => each.id !== option.id))}
							>
								✕
							</button>
						</li>
					);
				})}
			</ul>
			<div className="cs-modal-actions">
				<button type="button" className="cs-modal-button" onClick={() => commit([...options, createDropdownOption(`Option ${options.length + 1}`)])}>
					+ Add option
				</button>
				<span className="cs-modal-actions-spacer" />
				<button type="button" className="cs-modal-button cs-modal-button--primary" onClick={onClose}>
					Done
				</button>
			</div>
		</FloatingPanel>
	);
}
