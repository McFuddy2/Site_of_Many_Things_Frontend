import { useEffect, useRef, useState } from "react";
import { getModuleRole, getModuleSizing } from "../../utils/character_sheet/moduleTypes";
import { getModuleRowShape, getModuleRowCount } from "../../utils/character_sheet/sheetOps";
import { getContrastTextColor, borderForBody } from "../../utils/character_sheet/colors";
import { rectToPx } from "../../utils/character_sheet/grid";
import { buildDefaultLayout } from "../../utils/character_sheet/cardLayouts";
import { tokenCssVars, unitsToPx } from "../../utils/character_sheet/layoutConstants";
import { useCharacterSheet } from "./CharacterSheetContext";
import usePieceValue from "./usePieceValue";
import { KebabIcon, EyeOffIcon, LinkIcon, PencilIcon } from "./icons";
import { ValueChip, chipText, chipState, chipTitle, chipLabel } from "./references/chips";
import ChipTextField from "./references/ChipTextField";
import { rememberCaret, useReferenceUI } from "./references/useReferenceUI";
import { moduleLockState, nodeIds } from "../../utils/character_sheet/engine/engine";

// Every module fills its grid rect exactly, and everything inside it is sized
// by the shared tokens (see layoutConstants.js / tokenCssVars) — a label bar
// is the same height, an input the same height and font, on every card.
// Module sizes themselves come from moduleTypes.js, which is what guarantees
// the content below always fits without clipping or scrollbars.

const ABILITY_TINTS = new Set(["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]);

// Default colours: the six abilities tint their own modules (ability tiles,
// saves, and the skills they govern), death-save rows keep their
// success/danger tone, and everything else is coloured by its role (see the
// --cs-role-* palette in CharacterSheetStyles.css). A user's own colours
// override that per part — the label bar (module.labelColor) and the body
// (module.bodyColor) independently, each exactly as picked, with text
// colours chosen for contrast and the border following the body.
function defaultColorClass(module) {
	if (module.ability && ABILITY_TINTS.has(module.ability)) {
		return `cs-tint--${module.ability}`;
	}
	if (module.tone === "success" || module.tone === "danger") {
		return `cs-tint--${module.tone}`;
	}
	return `cs-role--${getModuleRole(module)}`;
}

export function moduleColorProps(module) {
	const style = {};
	if (module.labelColor) {
		style["--m-bar"] = module.labelColor;
		style["--m-bar-text"] = getContrastTextColor(module.labelColor);
	}
	if (module.bodyColor) {
		style["--m-bg"] = module.bodyColor;
		style["--m-border"] = borderForBody(module.bodyColor);
		style["--m-text"] = getContrastTextColor(module.bodyColor);
	}
	return { className: defaultColorClass(module), style: Object.keys(style).length ? style : undefined };
}

const lockedClass = (read) => (read.locked ? " cs-locked" : "");

// A module's rule state: "none" | "locked" | "hidden" (see createRule).
function useModuleLock(module) {
	const { engine } = useCharacterSheet();
	return moduleLockState(engine, module.id);
}

// Remembers where the caret was in a plain text field, so "Add reference…"
// can put a chip there.
const caretProps = (pieceId) => {
	const remember = (event) => rememberCaret(pieceId, event.target.selectionStart ?? null);
	return { onSelect: remember, onBlur: remember };
};

// ---------- Piece views (all values go through usePieceValue) ----------
//
// Every value-holding piece carries data-piece-id: it's how Pick mode finds
// the values on screen and how Go to source scrolls to one.

// A number value. `signed` reads as a bonus ("+3"): a number input can't show
// a leading plus, so it's drawn beside the field and hidden once the value is
// negative. `suffix` is a unit after the value ("30 ft"). A number whose
// value is a reference shows as a chip instead of an input (see chips.jsx).
function NumberField({ pieceId, signed = false, suffix = "", big = false, className = "" }) {
	const read = usePieceValue(pieceId);
	const inputClass = `cs-input cs-input--number${big ? " cs-input--big" : ""}`;
	const field = read.computed ? (
		<ValueChip read={read} pieceId={pieceId} signed={signed} big={big} />
	) : (
		<>
			{signed && Number(read.value) >= 0 ? <span className="cs-value-sign">+</span> : null}
			<input
				type="number"
				className={`${inputClass}${lockedClass(read)}`}
				aria-label={read.piece?.label || undefined}
				value={read.value ?? 0}
				disabled={read.locked}
				onChange={(event) => read.set(event.target.value === "" ? 0 : Number(event.target.value))}
			/>
		</>
	);
	return (
		<span className={`cs-number-field ${className}`} data-piece-id={pieceId}>
			{field}
			{suffix ? <span className="cs-value-suffix">{suffix}</span> : null}
		</span>
	);
}

// A single-line text value. Number-locked text strips anything non-numeric.
// `tooltip` shows the whole value on hover, for fields that act as labels and
// may ellipsize.
function TextField({ pieceId, className = "cs-input", placeholder = "", title, tooltip = false }) {
	const read = usePieceValue(pieceId);
	if (read.computed) {
		return <ChipTextField pieceId={pieceId} className={className.replace(/\bcs-input\b/, "")} />;
	}
	return (
		<input
			type="text"
			className={`${className}${lockedClass(read)}`}
			data-piece-id={pieceId}
			{...caretProps(pieceId)}
			inputMode={read.piece?.numberLocked ? "numeric" : undefined}
			placeholder={placeholder}
			title={title ?? (tooltip ? read.value || undefined : undefined)}
			value={read.value ?? ""}
			disabled={read.locked}
			onChange={(event) => {
				const raw = event.target.value;
				read.set(read.piece?.numberLocked ? raw.replace(/[^0-9.-]/g, "") : raw);
			}}
		/>
	);
}

// Multi-line counterpart to TextField: the one kind of field allowed to scroll
// (vertically) when its text outgrows the module.
function TextAreaField({ pieceId, placeholder = "" }) {
	const read = usePieceValue(pieceId);
	if (read.computed) {
		return <ChipTextField pieceId={pieceId} multiline />;
	}
	return (
		<textarea
			className={`cs-textarea${lockedClass(read)}`}
			data-piece-id={pieceId}
			{...caretProps(pieceId)}
			placeholder={placeholder}
			value={read.value ?? ""}
			disabled={read.locked}
			onChange={(event) => read.set(event.target.value)}
		/>
	);
}

function CheckboxField({ pieceId, label }) {
	const read = usePieceValue(pieceId);
	return (
		<input
			type="checkbox"
			className={`cs-checkbox${lockedClass(read)}`}
			data-piece-id={pieceId}
			aria-label={label || read.piece?.label}
			checked={Boolean(read.value)}
			disabled={read.locked}
			onChange={(event) => read.set(event.target.checked)}
		/>
	);
}

// A skill's proficiency: one press cycles none → proficient → expertise →
// none. The three look different by shape as well as colour — an empty ring,
// a filled dot, a filled dot with a second ring and an "E" — and each says
// what it is, and what a press does next, to screen readers and on hover.
const PROFICIENCY_STATES = ["Not proficient", "Proficient", "Expertise"];

function TristateField({ pieceId, label }) {
	const read = usePieceValue(pieceId);
	const state = read.value ?? 0;
	const next = (state + 1) % PROFICIENCY_STATES.length;
	const describe = `${label}: ${PROFICIENCY_STATES[state]}. Press for ${PROFICIENCY_STATES[next]}.`;
	return (
		<button
			type="button"
			className={`cs-tristate cs-tristate--${state}${lockedClass(read)}`}
			data-piece-id={pieceId}
			aria-label={describe}
			title={describe}
			disabled={read.locked}
			onClick={() => read.set(next)}
		>
			{state === 2 ? (
				<span className="cs-tristate-mark" aria-hidden="true">
					E
				</span>
			) : null}
		</button>
	);
}

function ButtonField({ pieceId, className = "" }) {
	const { dispatch } = useCharacterSheet();
	const read = usePieceValue(pieceId);
	return (
		<button
			type="button"
			className={`cs-btn ${className}${lockedClass(read)}`}
			data-piece-id={pieceId}
			disabled={read.locked}
			onClick={() => dispatch({ type: "pressButton", pieceId })}
		>
			{read.piece?.label}
		</button>
	);
}

// The label an option reads as: its name, plus its value when it's a
// reference ("DEX · +3").
function optionText(engine, pieceId, option) {
	if (!option.ref) {
		return option.label;
	}
	const value = chipText(engine.values.get(nodeIds.part(pieceId, option.id)), { signed: true });
	return `${option.label} · ${value}`;
}

// A dropdown. On desktop it's a listbox with ✎ "Edit options…" at the
// bottom of the open list; on tablets and phones it's the browser's own
// select (selection works everywhere, editing the list doesn't).
function DropdownField({ pieceId }) {
	const read = usePieceValue(pieceId);
	const { engine } = useCharacterSheet();
	const ui = useReferenceUI();
	const options = read.piece?.options || [];
	if (!ui.editable) {
		return (
			<select
				className={`cs-input cs-select${lockedClass(read)}`}
				data-piece-id={pieceId}
				aria-label={read.piece?.label || undefined}
				value={read.value ?? ""}
				disabled={read.locked}
				onChange={(event) => read.set(event.target.value)}
			>
				{options.map((option) => (
					<option key={option.id} value={option.id}>
						{optionText(engine, pieceId, option)}
					</option>
				))}
			</select>
		);
	}
	return <ListboxDropdown read={read} pieceId={pieceId} options={options} optionText={(option) => optionText(engine, pieceId, option)} />;
}

function ListboxDropdown({ read, pieceId, options, optionText: textOf }) {
	const ui = useReferenceUI();
	const buttonRef = useRef(null);
	const listRef = useRef(null);
	const [open, setOpen] = useState(false);
	const [active, setActive] = useState(0);
	const [box, setBox] = useState(null);
	const selected = options.find((option) => option.id === read.value) || options[0];

	const show = () => {
		const rect = buttonRef.current.getBoundingClientRect();
		setBox({ left: rect.left, top: rect.bottom + 2, width: Math.max(rect.width, 160) });
		setActive(Math.max(0, options.indexOf(selected)));
		setOpen(true);
	};
	const hide = (refocus = true) => {
		setOpen(false);
		if (refocus) {
			buttonRef.current?.focus();
		}
	};
	const choose = (option) => {
		if (option) {
			read.set(option.id);
		}
		hide();
	};

	useEffect(() => {
		if (!open) {
			return undefined;
		}
		listRef.current?.focus();
		const onPointerDown = (event) => {
			if (!listRef.current?.contains(event.target) && !buttonRef.current?.contains(event.target)) {
				hide(false);
			}
		};
		const onScroll = (event) => {
			if (!listRef.current?.contains(event.target)) {
				hide(false);
			}
		};
		document.addEventListener("pointerdown", onPointerDown, true);
		window.addEventListener("scroll", onScroll, true);
		return () => {
			document.removeEventListener("pointerdown", onPointerDown, true);
			window.removeEventListener("scroll", onScroll, true);
		};
	}, [open]);

	return (
		<>
			<button
				ref={buttonRef}
				type="button"
				className={`cs-input cs-select cs-dropdown-btn${lockedClass(read)}`}
				data-piece-id={pieceId}
				aria-haspopup="listbox"
				aria-expanded={open}
				aria-label={`${read.piece?.label || "Choice"}: ${selected ? textOf(selected) : "nothing chosen"}`}
				title={selected ? textOf(selected) : undefined}
				disabled={read.locked}
				onClick={() => (open ? hide() : show())}
				onKeyDown={(event) => {
					if (event.key === "ArrowDown" || event.key === "ArrowUp") {
						event.preventDefault();
						show();
					}
				}}
			>
				<span className="cs-dropdown-btn-text">{selected ? textOf(selected) : "—"}</span>
				<span className="cs-dropdown-caret" aria-hidden="true">
					▾
				</span>
			</button>
			{open && box ? (
				<div
					ref={listRef}
					className="cs-dropdown-list"
					role="listbox"
					tabIndex={-1}
					aria-label={read.piece?.label || "Choices"}
					aria-activedescendant={options[active] ? `${pieceId}-${options[active].id}` : undefined}
					style={{ left: box.left, top: box.top, minWidth: box.width }}
					data-ref-ui
					onKeyDown={(event) => {
						if (event.key === "ArrowDown") {
							event.preventDefault();
							setActive((index) => Math.min(index + 1, options.length - 1));
						} else if (event.key === "ArrowUp") {
							event.preventDefault();
							setActive((index) => Math.max(index - 1, 0));
						} else if (event.key === "Enter" || event.key === " ") {
							event.preventDefault();
							choose(options[active]);
						} else if (event.key === "Escape" || event.key === "Tab") {
							event.preventDefault();
							event.stopPropagation();
							hide();
						}
					}}
				>
					{options.map((option, index) => (
						<div
							key={option.id}
							id={`${pieceId}-${option.id}`}
							role="option"
							aria-selected={option === selected}
							className={`cs-dropdown-option${index === active ? " cs-dropdown-option--active" : ""}`}
							onMouseEnter={() => setActive(index)}
							onClick={() => choose(option)}
						>
							{option.ref ? <LinkIcon /> : null}
							<span>{textOf(option)}</span>
						</div>
					))}
					{options.length === 0 ? <div className="cs-dropdown-empty">No options yet</div> : null}
					<button
						type="button"
						className="cs-dropdown-edit"
						onClick={() => {
							hide(false);
							ui.openOptionsEditor(pieceId, buttonRef.current);
						}}
					>
						<PencilIcon /> Edit options…
					</button>
				</div>
			) : null}
		</>
	);
}

// Images are stored inline on the sheet (a pasted URL, or a data: URI from a
// local file), and the whole sheet is autosaved to localStorage — so a picked
// file is capped well under that quota rather than silently breaking saves.
const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024;

function ImageField({ pieceId }) {
	const read = usePieceValue(pieceId);
	const fileInputRef = useRef(null);
	const src = read.value || "";

	const handleFile = (file) => {
		if (!file) {
			return;
		}
		if (file.size > MAX_IMAGE_BYTES) {
			window.alert("That image is too large to store on the sheet. Please pick one under 1.5 MB, or paste a link to it instead.");
			return;
		}
		const reader = new FileReader();
		reader.onload = () => read.set(String(reader.result));
		reader.readAsDataURL(file);
	};

	return (
		<>
			{src ? (
				<img className="cs-image-preview" src={src} alt={read.piece?.alt || read.piece?.label || ""} data-piece-id={pieceId} />
			) : (
				<div className="cs-image-empty" data-piece-id={pieceId}>
					No image yet
				</div>
			)}
			<div className="cs-image-controls">
				<input
					type="text"
					className="cs-input cs-input--left"
					placeholder="Paste an image link…"
					value={src.startsWith("data:") ? "" : src}
					onChange={(event) => read.set(event.target.value)}
				/>
				<button type="button" className="cs-btn cs-btn--quiet" onClick={() => fileInputRef.current?.click()}>
					Upload
				</button>
				<input
					ref={fileInputRef}
					type="file"
					accept="image/*"
					className="cs-visually-hidden"
					onChange={(event) => {
						handleFile(event.target.files?.[0]);
						event.target.value = "";
					}}
				/>
			</div>
		</>
	);
}

// ---------- Module chrome ----------

// The +/− controls on a variable-length module (list rows, checkbox counts),
// tucked into its label bar. Only live cards pass a cardId, so previews and
// the layout editor never show them.
function RowControls({ cardId, module }) {
	const { dispatch, engine } = useCharacterSheet();
	const lock = useModuleLock(module);
	if (!cardId || !getModuleRowShape(module.type)) {
		return null;
	}
	const count = module.capacity ? engine.values.get(nodeIds.capacity(module.id)) : null;
	if (count?.computed) {
		return <BoxCountChip module={module} entry={count} />;
	}
	const rowCount = getModuleRowCount(module);
	const noun = module.type === "checkboxRow" ? "checkbox" : "row";
	return (
		<span className="cs-row-controls">
			<button
				type="button"
				className="cs-row-btn"
				title={`Remove a ${noun}`}
				aria-label={`Remove a ${noun} from ${module.label}`}
				disabled={rowCount === 0 || lock === "locked"}
				onClick={() => dispatch({ type: "removeModuleRow", cardId, moduleId: module.id, rowIndex: rowCount - 1 })}
			>
				−
			</button>
			<button
				type="button"
				className="cs-row-btn"
				title={`Add a ${noun}`}
				aria-label={`Add a ${noun} to ${module.label}`}
				disabled={lock === "locked"}
				onClick={() => dispatch({ type: "addModuleRow", cardId, moduleId: module.id })}
			>
				+
			</button>
		</span>
	);
}

// A checkbox group whose box count is linked shows the count as a chip where
// its −/+ buttons were; like any chip, it opens its info modal.
function BoxCountChip({ module, entry }) {
	const { engine } = useCharacterSheet();
	const ui = useReferenceUI();
	const text = chipText(entry);
	const state = chipState(entry);
	const open = () => ui.openInfo({ kind: "capacity", moduleId: module.id });
	return (
		<button
			type="button"
			className={`cs-chip cs-chip--count${state ? ` cs-chip--${state}` : ""}`}
			data-chip={module.capacity.id}
			data-chip-kind="capacity"
			data-chip-module={module.id}
			title={`Box count\n${chipTitle(engine, module.capacity, entry)}`}
			aria-label={chipLabel(module.capacity, entry, text, `${module.label} box count`)}
			onClick={open}
			onKeyDown={(event) => {
				if (event.key === "Backspace" || event.key === "Delete") {
					event.preventDefault();
					event.stopPropagation();
					open();
				}
			}}
		>
			<LinkIcon size={10} />
			<span className="cs-chip-text">{text}</span>
		</button>
	);
}

// The shape nearly every module is drawn as: a label bar naming it, with the
// content filling the rest of the box beneath. Labels are single-line; one
// that's too long for its module ellipsizes and shows in full on hover.
function ModuleShell({ module, cardId, className = "", bodyClassName = "", labelProps = null, children }) {
	const color = moduleColorProps(module);
	const label = module.label || "Untitled";
	const locked = useModuleLock(module) === "locked";
	return (
		<div
			className={`cs-module ${color.className} ${className}${locked ? " cs-locked" : ""}`}
			style={color.style}
			aria-disabled={locked || undefined}
			title={locked ? `${label} is locked by a rule` : undefined}
		>
			<div className="cs-mod-label" {...labelProps}>
				<span className="cs-mod-label-text" title={label}>
					{label}
				</span>
				<RowControls cardId={cardId} module={module} />
			</div>
			<div className={`cs-mod-body ${bodyClassName}`}>{children}</div>
		</div>
	);
}

// The other shape: one line with no label bar, whose own text is its label
// (a skill row, a lone checkbox).
function RowShell({ module, className = "", children }) {
	const color = moduleColorProps(module);
	const locked = useModuleLock(module) === "locked";
	return (
		<div
			className={`cs-module cs-module--row ${color.className} ${className}${locked ? " cs-locked" : ""}`}
			style={color.style}
			aria-disabled={locked || undefined}
			title={locked ? `${module.label || "This module"} is locked by a rule` : undefined}
		>
			{children}
		</div>
	);
}

// ---------- Module views ----------

// Ability tile: the live Bonus, with the editable Score beneath it.
function AbilityScoreModule({ module, cardId }) {
	const [scoreId, bonusId] = module.pieceOrder;
	const bonus = usePieceValue(bonusId);
	return (
		<ModuleShell module={module} cardId={cardId} bodyClassName="cs-mod-body--stack cs-ability-body">
			<div className="cs-ability-line">
				<span className="cs-caption">Bonus</span>
				<NumberField pieceId={bonusId} signed big={bonus.computed} />
			</div>
			<div className="cs-ability-line">
				<span className="cs-caption">Score</span>
				<NumberField pieceId={scoreId} />
			</div>
		</ModuleShell>
	);
}

function NumberModule({ module, cardId }) {
	return (
		<ModuleShell module={module} cardId={cardId}>
			<NumberField pieceId={module.pieceOrder[0]} signed={module.signed} suffix={module.suffix} />
		</ModuleShell>
	);
}

// A headline number at display size (Armor Class, Initiative, Proficiency).
function BigNumberModule({ module, cardId }) {
	return (
		<ModuleShell module={module} cardId={cardId}>
			<NumberField pieceId={module.pieceOrder[0]} signed={module.signed} big />
		</ModuleShell>
	);
}

function BigTextModule({ module, cardId }) {
	return (
		<ModuleShell module={module} cardId={cardId}>
			<TextField pieceId={module.pieceOrder[0]} className="cs-input cs-input--big" />
		</ModuleShell>
	);
}

function TextModule({ module, cardId }) {
	return (
		<ModuleShell module={module} cardId={cardId}>
			<TextField pieceId={module.pieceOrder[0]} />
		</ModuleShell>
	);
}

function TextAreaModule({ module, cardId }) {
	return (
		<ModuleShell module={module} cardId={cardId} bodyClassName="cs-mod-body--stack">
			<TextAreaField pieceId={module.pieceOrder[0]} />
		</ModuleShell>
	);
}

function DropdownModule({ module, cardId }) {
	return (
		<ModuleShell module={module} cardId={cardId}>
			<DropdownField pieceId={module.pieceOrder[0]} />
		</ModuleShell>
	);
}

// Saving throw / skill row: proficiency checkbox, live modifier, name. Its
// columns line up with the Skills card's column heading (see --cs-stat-*).
//
// A skill's proficiency is a tri-state (expertise doubles it); a save's is a
// checkbox.
function StatRowModule({ module }) {
	const [profId, bonusId, labelId] = module.pieceOrder;
	const name = usePieceValue(labelId);
	const label = name.error ? module.label : name.value || module.label;
	const Proficiency = module.pieces[profId]?.kind === "tristate" ? TristateField : CheckboxField;
	return (
		<RowShell module={module} className={`cs-stat-row${module.type === "savingThrow" ? " cs-stat-row--save" : ""}`}>
			<span className="cs-stat-cell">
				<Proficiency pieceId={profId} label={`${label} proficiency`} />
			</span>
			<span className="cs-stat-cell">
				<NumberField pieceId={bonusId} signed />
			</span>
			<span className="cs-row-label" title={label}>
				{label}
			</span>
		</RowShell>
	);
}

// The heading strip above a stack of skill rows. Its labels are editable text
// pieces, so they ellipsize (with a tooltip) if renamed to something long.
function ColumnHeaderModule({ module }) {
	return (
		<RowShell module={module} className="cs-stat-row cs-column-header">
			{module.pieceOrder.map((pieceId) => (
				<TextField key={pieceId} pieceId={pieceId} className="cs-input-flush cs-column-label" tooltip />
			))}
		</RowShell>
	);
}

// Passive score row: the score, then what it's the passive score of.
function PassiveSkillModule({ module }) {
	const [valueId, nameId] = module.pieceOrder;
	return (
		<RowShell module={module} className="cs-passive-row">
			<NumberField pieceId={valueId} className="cs-passive-value" />
			<TextField pieceId={nameId} className="cs-input cs-input--left cs-row-label-input" tooltip />
		</RowShell>
	);
}

function CheckboxModule({ module }) {
	const label = module.label || "Checkbox";
	return (
		<RowShell module={module} className="cs-checkbox-module">
			<CheckboxField pieceId={module.pieceOrder[0]} label={label} />
			<span className="cs-row-label" title={label}>
				{label}
			</span>
		</RowShell>
	);
}

// A labelled run of checkboxes — death saves, hit dice spent, charges, uses.
// The boxes wrap; the module's minimum height grows with the count (see
// moduleTypes.js), so every box always stays visible.
//
// With a linked box count it shows exactly that many: boxes past the count
// keep their ticks but aren't drawn, and boxes past the pieces it has are
// drawn empty, getting a piece the first time they're ticked.
function CheckboxRowModule({ module, cardId }) {
	const { engine, dispatch, readOnly } = useCharacterSheet();
	const lock = useModuleLock(module);
	const count = module.capacity ? engine.values.get(nodeIds.capacity(module.id)) : null;
	const linked = count?.computed && !count.error && typeof count.value === "number";
	const boxes = module.pieceOrder.filter((pieceId) => module.pieces[pieceId]?.kind === "checkbox");
	const shown = linked ? count.value : boxes.length;
	return (
		<ModuleShell module={module} cardId={cardId} bodyClassName="cs-checkbox-wrap" labelProps={{ "data-pick-module": module.id }}>
			{Array.from({ length: shown }, (unused, index) =>
				boxes[index] ? (
					<CheckboxField key={boxes[index]} pieceId={boxes[index]} label={`${module.label} ${index + 1}`} />
				) : (
					<input
						key={`extra-${index}`}
						type="checkbox"
						className="cs-checkbox"
						aria-label={`${module.label} ${index + 1}`}
						checked={false}
						disabled={readOnly || lock === "locked"}
						onChange={(event) => dispatch({ type: "setBoxChecked", moduleId: module.id, index, checked: event.target.checked })}
					/>
				)
			)}
		</ModuleShell>
	);
}

// A growable stack of plain text lines (Proficiencies and Languages).
function ListTextModule({ module, cardId }) {
	return (
		<ModuleShell module={module} cardId={cardId} bodyClassName="cs-mod-body--stack cs-list-body">
			{module.pieceOrder.map((pieceId, index) => (
				<div key={pieceId} className={`cs-list-row${index % 2 ? " cs-list-row--alt" : ""}`}>
					<TextField pieceId={pieceId} className="cs-input-flush" />
				</div>
			))}
		</ModuleShell>
	);
}

// Equipment / Treasure: a name and quantity per row (pieces come in pairs —
// see the itemList row shape in sheetOps).
function ItemListModule({ module, cardId }) {
	const rows = [];
	for (let index = 0; index < module.pieceOrder.length; index += 2) {
		rows.push([module.pieceOrder[index], module.pieceOrder[index + 1]]);
	}
	return (
		<ModuleShell module={module} cardId={cardId} bodyClassName="cs-mod-body--stack cs-list-body">
			<div className="cs-list-row cs-list-head">
				<span className="cs-list-head-name">Item Name</span>
				<span className="cs-list-qty">Qty</span>
			</div>
			{rows.map(([nameId, qtyId], index) => (
				<div key={nameId} className={`cs-list-row${index % 2 ? " cs-list-row--alt" : ""}`}>
					<TextField pieceId={nameId} className="cs-input-flush" />
					{qtyId ? <TextField pieceId={qtyId} className="cs-input-flush cs-list-qty" /> : null}
				</div>
			))}
		</ModuleShell>
	);
}

function ImageModule({ module, cardId }) {
	return (
		<ModuleShell module={module} cardId={cardId} bodyClassName="cs-mod-body--stack">
			<ImageField pieceId={module.pieceOrder[0]} />
		</ModuleShell>
	);
}

// Currency: the four coin quantities plus their live total in gold, each row
// in its own metal's colour (see the --cs-coin-* palette).
const COIN_ROW_CLASSES = ["cs-coin--pp", "cs-coin--gp", "cs-coin--sp", "cs-coin--cp"];

function CoinRow({ pieceId, className }) {
	const read = usePieceValue(pieceId);
	const label = read.piece?.label || "";
	return (
		<div className={`cs-coin-row ${className}`}>
			<span className="cs-coin-label" title={label}>
				{label}
			</span>
			{read.kind === "variable" ? (
				<NumberField pieceId={pieceId} className="cs-coin-value" />
			) : (
				<TextField pieceId={pieceId} className="cs-input cs-coin-value" />
			)}
		</div>
	);
}

function CurrencyModule({ module, cardId }) {
	const [totalId, ...coinIds] = module.pieceOrder;
	return (
		<ModuleShell module={module} cardId={cardId} bodyClassName="cs-mod-body--stack cs-coin-body">
			<CoinRow pieceId={totalId} className="cs-coin--total" />
			{coinIds.map((pieceId, index) => (
				<CoinRow key={pieceId} pieceId={pieceId} className={COIN_ROW_CLASSES[index] || ""} />
			))}
		</ModuleShell>
	);
}

// Health's Damage/Heal control: number-locked amount + the two wired buttons.
function DamageHealModule({ module, cardId }) {
	const [amountId, damageId, healId] = module.pieceOrder;
	return (
		<ModuleShell module={module} cardId={cardId} bodyClassName="cs-damage-heal">
			<TextField pieceId={amountId} placeholder="Amount" />
			<ButtonField pieceId={damageId} className="cs-btn--damage" />
			<ButtonField pieceId={healId} className="cs-btn--heal" />
		</ModuleShell>
	);
}

// Fallback for module types without a dedicated view: renders each piece by kind.
function GenericModule({ module, cardId }) {
	const { pieceIndex } = useCharacterSheet();
	return (
		<ModuleShell module={module} cardId={cardId} bodyClassName="cs-mod-body--stack">
			{module.pieceOrder.map((pieceId) => {
				switch (pieceIndex[pieceId]?.piece.kind) {
					case "variable":
						return <NumberField key={pieceId} pieceId={pieceId} />;
					case "checkbox":
						return <CheckboxField key={pieceId} pieceId={pieceId} />;
					case "tristate":
						return <TristateField key={pieceId} pieceId={pieceId} label={pieceIndex[pieceId].piece.label} />;
					case "text":
						return <TextField key={pieceId} pieceId={pieceId} />;
					case "button":
						return <ButtonField key={pieceId} pieceId={pieceId} />;
					case "dropdown":
						return <DropdownField key={pieceId} pieceId={pieceId} />;
					case "image":
						return <ImageField key={pieceId} pieceId={pieceId} />;
					default:
						return null;
				}
			})}
		</ModuleShell>
	);
}

const MODULE_VIEWS = {
	abilityScore: AbilityScoreModule,
	number: NumberModule,
	bigNumber: BigNumberModule,
	bigText: BigTextModule,
	savingThrow: StatRowModule,
	skill: StatRowModule,
	columnHeader: ColumnHeaderModule,
	passiveSkill: PassiveSkillModule,
	text: TextModule,
	textArea: TextAreaModule,
	checkbox: CheckboxModule,
	checkboxRow: CheckboxRowModule,
	dropdown: DropdownModule,
	listText: ListTextModule,
	itemList: ItemListModule,
	image: ImageModule,
	currency: CurrencyModule,
	damageHeal: DamageHealModule,
};

// Renders one module with the view matching its type. The layout editor and
// card previews pass no cardId, which is what hides the row +/− controls.
//
// A module a rule hides isn't drawn — except on desktop, where it shows as a
// faint dashed outline at its own spot, so it can still be selected and its
// rule changed (⋮ or right-click → Lock / Hide Rules…).
export function ModuleView({ module, cardId = null }) {
	const ui = useReferenceUI();
	const lock = useModuleLock(module);
	if (lock === "hidden") {
		return ui.editable && cardId ? <HiddenModuleGhost module={module} /> : null;
	}
	const View = MODULE_VIEWS[module.type] || GenericModule;
	return <View module={module} cardId={cardId} />;
}

function HiddenModuleGhost({ module }) {
	const label = module.label || "Untitled";
	return (
		<div
			className="cs-module cs-module--ghost"
			title={`“${label}” is hidden by a rule. Select it and use ⋮ → Lock / Hide Rules… to change that.`}
			aria-label={`${label} (hidden by a rule)`}
		>
			<EyeOffIcon />
			<span className="cs-module-ghost-text">Hidden · {label}</span>
		</div>
	);
}

// Header inline style for a card's own chosen color (falls back to the
// default navy via CSS when unset), with readable text picked to match.
export function cardHeaderStyle(card) {
	if (!card.headerColor) {
		return undefined;
	}
	return { backgroundColor: card.headerColor, color: getContrastTextColor(card.headerColor) };
}

// px box of a module slot inside its card's module grid.
export function moduleSlotStyle(rect) {
	const box = rectToPx(rect);
	return { position: "absolute", left: box.left, top: box.top, width: box.width, height: box.height };
}

// In-place title editing (double-click a title, or Rename… in its menu):
// Enter or leaving the field keeps the new title, Esc keeps the old one.
function TitleEditor({ title, onCommit, onCancel }) {
	const [draft, setDraft] = useState(title);
	const inputRef = useRef(null);
	const doneRef = useRef(false);
	useEffect(() => {
		inputRef.current?.focus();
		inputRef.current?.select();
	}, []);
	const finish = (keep) => {
		if (doneRef.current) {
			return;
		}
		doneRef.current = true;
		if (keep) {
			onCommit(draft);
		} else {
			onCancel();
		}
	};
	return (
		<input
			ref={inputRef}
			className="cs-card-title-input"
			aria-label="Card title"
			value={draft}
			onChange={(event) => setDraft(event.target.value)}
			onBlur={() => finish(true)}
			onKeyDown={(event) => {
				if (event.key === "Enter") {
					finish(true);
				} else if (event.key === "Escape") {
					event.stopPropagation();
					finish(false);
				}
			}}
		/>
	);
}

// The phone layout of a card's modules: no grid, just wrapping rows in
// reading order (top-to-bottom, then left-to-right, by their grid
// positions). Each module starts at its type's default size and stretches to
// fill its row; its height follows its content (phone sizes are bigger than
// the grid's), never less than its default.
function FlowModules({ card, layout, moduleIds, cardId }) {
	const { engine } = useCharacterSheet();
	const ordered = moduleIds.filter((moduleId) => moduleLockState(engine, moduleId) !== "hidden").sort((a, b) => {
		const ra = layout.moduleRects[a];
		const rb = layout.moduleRects[b];
		return ra.y - rb.y || ra.x - rb.x;
	});
	return (
		<div className="cs-flow-modules">
			{ordered.map((moduleId) => {
				const module = card.modules[moduleId];
				const sizing = getModuleSizing(module);
				return (
					<div
						key={moduleId}
						className="cs-module-slot cs-module-slot--flow"
						data-module-id={moduleId}
						data-module-type={module.type}
						style={{ flex: `1 1 ${unitsToPx(sizing.defaultW)}px`, minHeight: unitsToPx(sizing.defaultH) }}
					>
						<ModuleView module={module} cardId={cardId} />
					</div>
				);
			})}
		</div>
	);
}

// A card's face — header plus its modules at their grid rects — at whatever
// position `style` gives it. Shared by the live canvas and every preview, so
// a card looks identical everywhere it's drawn.
export function CardFace({
	card,
	layout,
	style,
	className = "",
	cardId = null,
	layoutId = null,
	onMenu,
	renaming = false,
	onRenameCommit,
	onRenameCancel,
	showGrid = false,
	flow = false,
}) {
	const moduleIds = layout.moduleOrder.filter((moduleId) => card.modules[moduleId] && layout.moduleRects?.[moduleId]);
	return (
		<section
			className={`cs-card ${className}`}
			style={card.bodyColor ? { ...style, backgroundColor: card.bodyColor } : style}
			data-card-type={card.type}
			data-layout-id={layoutId || undefined}
		>
			<header className="cs-card-header" style={cardHeaderStyle(card)}>
				{renaming ? (
					<TitleEditor title={card.title} onCommit={onRenameCommit} onCancel={onRenameCancel} />
				) : (
					<span className="cs-card-title" title={onMenu ? `${card.title} — double-click to rename` : card.title}>
						{card.title}
					</span>
				)}
				{/* Only where the sheet can be edited — elsewhere there's no menu to open. */}
				{onMenu ? (
					<button
						type="button"
						className="cs-card-header-menu-btn"
						aria-label={`${card.title} options`}
						title="Card options"
						onPointerDown={(event) => event.stopPropagation()}
						onClick={onMenu}
					>
						<KebabIcon />
					</button>
				) : null}
			</header>
			<div className={`cs-card-body${showGrid ? " cs-card-body--grid" : ""}`}>
				{flow ? (
					<FlowModules card={card} layout={layout} moduleIds={moduleIds} cardId={cardId} />
				) : (
					<div className="cs-module-grid">
						{moduleIds.map((moduleId) => (
							<div
								key={moduleId}
								className="cs-module-slot"
								data-module-id={moduleId}
								data-module-type={card.modules[moduleId].type}
								style={moduleSlotStyle(layout.moduleRects[moduleId])}
							>
								<ModuleView module={card.modules[moduleId]} cardId={cardId} />
							</div>
						))}
					</div>
				)}
			</div>
		</section>
	);
}

// Size-only style for a card drawn in normal flow (previews, the gallery).
export function staticCardStyle(layout) {
	const box = rectToPx({ x: 0, y: 0, w: layout.w, h: layout.h });
	return { position: "relative", width: box.width, height: box.height };
}

// A card drawn in normal flow at its default size and arrangement — for
// previews of cards that aren't placed yet. Callers wrap it in a
// SheetPreviewProvider so nothing in it can edit the real sheet. It carries
// its own theme because previews can render outside .cs-page (dialogs portal
// to <body>).
export function CardPreview({ card }) {
	const layout = buildDefaultLayout(card);
	return (
		<div className="cs-theme" style={tokenCssVars()}>
			<CardFace card={card} layout={layout} style={staticCardStyle(layout)} />
		</div>
	);
}

// One card on the page canvas at its (possibly previewed) grid rect. All
// pointer handling lives on the canvas (see SheetCanvas); the card just marks
// itself with data-layout-id / data-module-id so the canvas can tell what a
// press landed on. The kebab opens the card's menu.
export default function CharacterSheetCard({
	layout,
	onMenu,
	dragging = false,
	selected = false,
	renaming = false,
	onRenameCommit,
	onRenameCancel,
	showGrid,
}) {
	const { sheet } = useCharacterSheet();
	const card = sheet.cards[layout.cardId];
	if (!card) {
		return null;
	}
	const box = rectToPx(layout);
	return (
		<CardFace
			card={card}
			layout={layout}
			cardId={card.id}
			layoutId={layout.id}
			className={`cs-card--live${dragging ? " cs-card--dragging" : ""}${selected ? " cs-card--selected" : ""}`}
			style={{ position: "absolute", left: box.left, top: box.top, width: box.width, height: box.height }}
			onMenu={onMenu}
			renaming={renaming}
			onRenameCommit={onRenameCommit}
			onRenameCancel={onRenameCancel}
			showGrid={showGrid}
		/>
	);
}
