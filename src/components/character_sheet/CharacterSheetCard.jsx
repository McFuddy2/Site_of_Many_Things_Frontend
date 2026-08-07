import { useEffect, useRef, useState } from "react";
import { getPieceNumericValue, getPieceTextValue } from "../../utils/character_sheet/references";
import { getModuleContentScale } from "../../utils/character_sheet/layoutConstants";
import { getModuleRowShape, getModuleRowCount } from "../../utils/character_sheet/sheetOps";
import { getContrastTextColor } from "../../utils/character_sheet/colors";
import { useCharacterSheet } from "./CharacterSheetContext";

// Pastel color-coding by module type (mockup convention): variable-based modules
// read differently from checkbox-, text-, button-, and dropdown-based ones.
const MODULE_COLOR_CLASS = {
	abilityScore: "cs-module--variable",
	number: "cs-module--variable",
	bigNumber: "cs-module--variable",
	bigText: "cs-module--variable",
	passiveSkill: "cs-module--text",
	savingThrow: "cs-module--checkbox",
	skill: "cs-module--checkbox",
	checkbox: "cs-module--checkbox",
	checkboxRow: "cs-module--checkbox",
	columnHeader: "cs-module--header",
	text: "cs-module--text",
	textArea: "cs-module--variable",
	listText: "cs-module--list",
	itemList: "cs-module--list",
	image: "cs-module--variable",
	currency: "cs-module--currency",
	spellEntry: "cs-module--variable",
	damageHeal: "cs-module--button",
	dropdown: "cs-module--dropdown",
};

// How long the cursor has to sit over a card before its tucked-away header
// (see the showHeader layout field) drops down — see CharacterSheetCard's
// hover-reveal timer.
const HEADER_REVEAL_DELAY = 2000;

// The "Edit Layout" trigger on a card's header — a kebab rather than a
// labelled button so it costs the header as little width as possible,
// leaving more room for the title (see .cs-card-title's shrink/wrap in
// CharacterSheetStyles.css).
function KebabIcon() {
	return (
		<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
			<circle cx="12" cy="5.5" r="1.7" fill="currentColor" />
			<circle cx="12" cy="12" r="1.7" fill="currentColor" />
			<circle cx="12" cy="18.5" r="1.7" fill="currentColor" />
		</svg>
	);
}

// The six standard abilities each tint their own modules (ability tiles, saving
// throws, and the skills they govern) so a Wisdom skill reads as Wisdom at a
// glance — see the --cs-ability-* palette in CharacterSheetStyles.css. A made-up
// ability falls back to the module type's own colour.
const ABILITY_TINTS = new Set(["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]);

function moduleColorClass(module) {
	if (module.ability && ABILITY_TINTS.has(module.ability)) {
		return `cs-module--ability cs-module--${module.ability}`;
	}
	if (module.tone === "success") {
		return "cs-module--success";
	}
	if (module.tone === "danger") {
		return "cs-module--danger";
	}
	return MODULE_COLOR_CLASS[module.type] || "cs-module--text";
}

function formatSigned(value) {
	return value >= 0 ? `+${value}` : `${value}`;
}

// Computed (formula) variables display their live value; error states (missing or
// circular reference) render as a marked em dash instead of crashing.
function ComputedValue({ pieceId, signed = false, className = "" }) {
	const { pieceIndex } = useCharacterSheet();
	const resolved = getPieceNumericValue(pieceId, pieceIndex);
	if (resolved.error) {
		return (
			<span className={`cs-ref-error ${className}`} title={resolved.error}>
				—
			</span>
		);
	}
	return <span className={className}>{signed ? formatSigned(resolved.value) : resolved.value}</span>;
}

// A writable variable. `signed` is how a bonus reads ("+3"): a number input can't
// display a leading plus, so it's drawn as a prefix beside the field and hidden
// once the value goes negative, where the input shows the minus itself.
function NumberInput({ piece, signed = false, className = "cs-input-number" }) {
	const { dispatch } = useCharacterSheet();
	const input = (
		<input
			type="number"
			className={className}
			value={piece.value}
			onChange={(event) =>
				dispatch({
					type: "setVariableValue",
					pieceId: piece.id,
					value: event.target.value === "" ? 0 : Number(event.target.value),
				})
			}
		/>
	);
	if (!signed || Number(piece.value) < 0) {
		return input;
	}
	return (
		<span className="cs-signed-input">
			<span className="cs-value-sign">+</span>
			{input}
		</span>
	);
}

// A text piece is editable while it's a single plain segment (all of this build's
// standard-card text pieces are). Once it contains reference segments it renders
// as live resolved text instead.
function TextPieceView({ piece, placeholder = "", className = "cs-input-text" }) {
	const { dispatch, pieceIndex } = useCharacterSheet();
	const isPlain = piece.segments.length === 1 && piece.segments[0].type === "text";
	if (!isPlain) {
		const resolved = getPieceTextValue(piece.id, pieceIndex);
		return resolved.error ? (
			<span className="cs-ref-error" title={resolved.error}>—</span>
		) : (
			<span className="cs-text-display">{resolved.text}</span>
		);
	}
	return (
		<input
			type="text"
			className={className}
			inputMode={piece.numberLocked ? "numeric" : undefined}
			placeholder={placeholder}
			value={piece.segments[0].value}
			onChange={(event) => {
				const raw = event.target.value;
				dispatch({
					type: "setTextPlain",
					pieceId: piece.id,
					text: piece.numberLocked ? raw.replace(/[^0-9.-]/g, "") : raw,
				});
			}}
		/>
	);
}

function CheckboxPieceView({ piece }) {
	const { dispatch } = useCharacterSheet();
	return (
		<input
			type="checkbox"
			className="cs-checkbox"
			checked={piece.value}
			onChange={(event) => dispatch({ type: "setCheckboxValue", pieceId: piece.id, value: event.target.checked })}
		/>
	);
}

function ButtonPieceView({ piece, className = "" }) {
	const { dispatch } = useCharacterSheet();
	return (
		<button
			type="button"
			className={`cs-btn ${className}`}
			onClick={() => dispatch({ type: "pressButton", pieceId: piece.id })}
		>
			{piece.label}
		</button>
	);
}

function DropdownPieceView({ piece }) {
	const { dispatch } = useCharacterSheet();
	return (
		<select
			className="cs-select"
			value={piece.selectedIndex ?? ""}
			onChange={(event) =>
				dispatch({ type: "setDropdownSelection", pieceId: piece.id, selectedIndex: Number(event.target.value) })
			}
		>
			{piece.options.map((option, optionIndex) => (
				<option key={optionIndex} value={optionIndex}>
					{option}
				</option>
			))}
		</select>
	);
}

// Multi-line counterpart to TextPieceView, for modules that hold a paragraph
// (Backstory, Personality Traits, Notes…) rather than a single field.
function TextAreaPieceView({ piece, placeholder = "" }) {
	const { dispatch, pieceIndex } = useCharacterSheet();
	const isPlain = piece.segments.length === 1 && piece.segments[0].type === "text";
	if (!isPlain) {
		const resolved = getPieceTextValue(piece.id, pieceIndex);
		return resolved.error ? (
			<span className="cs-ref-error" title={resolved.error}>—</span>
		) : (
			<span className="cs-text-display">{resolved.text}</span>
		);
	}
	return (
		<textarea
			className="cs-input-textarea"
			placeholder={placeholder}
			value={piece.segments[0].value}
			onChange={(event) => dispatch({ type: "setTextPlain", pieceId: piece.id, text: event.target.value })}
		/>
	);
}

// Images are stored inline on the sheet (a pasted URL, or a data: URI from a
// local file), and the whole sheet is autosaved to localStorage — so a picked
// file is capped well under that quota rather than silently breaking saves.
const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024;

function ImagePieceView({ piece }) {
	const { dispatch } = useCharacterSheet();
	const fileInputRef = useRef(null);

	const handleFile = (file) => {
		if (!file) {
			return;
		}
		if (file.size > MAX_IMAGE_BYTES) {
			window.alert("That image is too large to store on the sheet. Please pick one under 1.5 MB, or paste a link to it instead.");
			return;
		}
		const reader = new FileReader();
		reader.onload = () => dispatch({ type: "setImageSrc", pieceId: piece.id, src: String(reader.result) });
		reader.readAsDataURL(file);
	};

	return (
		<div className="cs-image-piece">
			{piece.src ? (
				<img className="cs-image-preview" src={piece.src} alt={piece.alt || piece.label} />
			) : (
				<div className="cs-image-empty">No image yet</div>
			)}
			<div className="cs-image-controls">
				<input
					type="text"
					className="cs-input-text cs-image-url"
					placeholder="Paste an image link…"
					value={piece.src.startsWith("data:") ? "" : piece.src}
					onChange={(event) => dispatch({ type: "setImageSrc", pieceId: piece.id, src: event.target.value })}
				/>
				<button type="button" className="cs-btn cs-btn--small" onClick={() => fileInputRef.current?.click()}>
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
		</div>
	);
}

// --- Shared module chrome ---

// Most modules in the spec read the same way: a bold header bar naming the
// field, with the value sitting directly beneath it. This is that shell.
function FieldModule({ module, className = "", showLabel = true, children }) {
	return (
		<div className={`cs-module ${moduleColorClass(module)} cs-field-module ${className}`}>
			{showLabel && module.label ? <div className="cs-field-bar">{module.label}</div> : null}
			<div className="cs-field-body">{children}</div>
		</div>
	);
}

// The +/− controls on a variable-length module (list rows, checkbox counts).
// They only appear on a live card — the layout editor and the card previews
// pass no cardId, and they're display-only surfaces anyway.
function RowControls({ cardId, module }) {
	const { dispatch } = useCharacterSheet();
	if (!cardId || !getModuleRowShape(module.type)) {
		return null;
	}
	const rowCount = getModuleRowCount(module);
	return (
		<div className="cs-row-controls">
			<button
				type="button"
				className="cs-row-btn"
				title={`Remove the last ${module.label || "row"}`}
				disabled={rowCount === 0}
				onClick={() => dispatch({ type: "removeModuleRow", cardId, moduleId: module.id, rowIndex: rowCount - 1 })}
			>
				−
			</button>
			<button
				type="button"
				className="cs-row-btn"
				title={`Add another ${module.label || "row"}`}
				onClick={() => dispatch({ type: "addModuleRow", cardId, moduleId: module.id })}
			>
				+
			</button>
		</div>
	);
}

// --- Module views ---

// Ability Scores stat tile: name, auto-calculated Bonus, editable Score.
function AbilityScoreModule({ module }) {
	const [scoreId, bonusId] = module.pieceOrder;
	return (
		<div className={`cs-module ${moduleColorClass(module)} cs-ability-tile`}>
			<div className="cs-field-bar">{module.label}</div>
			<div className="cs-field-label">Bonus</div>
			<ComputedValue pieceId={bonusId} signed className="cs-ability-bonus" />
			<div className="cs-ability-score-row">
				<span className="cs-field-label">Score</span>
				<NumberInput piece={module.pieces[scoreId]} />
			</div>
		</div>
	);
}

// A labelled number field — Level, Experience, a movement speed, a to-hit bonus.
// `suffix` renders inside the field after the value ("30ft"), `signed` forces the
// leading + that a bonus reads with.
function NumberModule({ module }) {
	const pieceId = module.pieceOrder[0];
	const piece = module.pieces[pieceId];
	return (
		<FieldModule module={module} className="cs-number-tile">
			<div className="cs-value-row">
				{piece.formula ? (
					<ComputedValue pieceId={pieceId} signed={module.signed} className="cs-number-value" />
				) : (
					<NumberInput piece={piece} signed={module.signed} />
				)}
				{module.suffix ? <span className="cs-value-suffix">{module.suffix}</span> : null}
			</div>
		</FieldModule>
	);
}

// A number with no label of its own: the card's title says what it is, so the
// module is just the value at display size (Armor Class, Initiative, Proficiency).
function BigNumberModule({ module }) {
	const pieceId = module.pieceOrder[0];
	const piece = module.pieces[pieceId];
	return (
		<div className={`cs-module ${moduleColorClass(module)} cs-big-number-tile`}>
			{piece.formula ? (
				<ComputedValue pieceId={pieceId} signed={module.signed} className="cs-big-value" />
			) : (
				<NumberInput piece={piece} signed={module.signed} className="cs-input-number cs-input-big" />
			)}
		</div>
	);
}

// The Character Name card (and an attack's name): one oversized text field.
function BigTextModule({ module }) {
	return (
		<div className={`cs-module ${moduleColorClass(module)} cs-big-text-tile`}>
			<TextPieceView piece={module.pieces[module.pieceOrder[0]]} className="cs-input-text cs-input-big" />
		</div>
	);
}

// Saving throw / skill row: proficiency checkbox, live modifier, name. The two
// are the same shape by design (see createSkillModule) so they share one view.
function StatRowModule({ module }) {
	const [profId, bonusId, labelId] = module.pieceOrder;
	const { pieceIndex } = useCharacterSheet();
	const label = getPieceTextValue(labelId, pieceIndex);
	const bonusPiece = module.pieces[bonusId];
	return (
		<div className={`cs-module ${moduleColorClass(module)} cs-save-row`}>
			<CheckboxPieceView piece={module.pieces[profId]} />
			{bonusPiece.formula ? (
				<ComputedValue pieceId={bonusId} signed className="cs-save-bonus" />
			) : (
				<NumberInput piece={bonusPiece} signed className="cs-input-number cs-input-narrow" />
			)}
			<span className="cs-save-label">{label.error ? module.label : label.text}</span>
		</div>
	);
}

// The grey column strip that sits above a stack of skill/save rows. Its columns
// are sized to match .cs-save-row's so the headings line up with what's beneath.
function ColumnHeaderModule({ module }) {
	return (
		<div className={`cs-module ${moduleColorClass(module)} cs-column-header`}>
			{module.pieceOrder.map((pieceId) => (
				<TextPieceView key={pieceId} piece={module.pieces[pieceId]} className="cs-input-text cs-input-flush" />
			))}
		</div>
	);
}

// Passive score row: the score, then what it's the passive score of.
function PassiveSkillModule({ module }) {
	const [valueId, nameId] = module.pieceOrder;
	const piece = module.pieces[valueId];
	return (
		<div className={`cs-module ${moduleColorClass(module)} cs-passive-row`}>
			{piece.formula ? (
				<ComputedValue pieceId={valueId} className="cs-passive-value" />
			) : (
				<NumberInput piece={piece} className="cs-input-number cs-input-narrow" />
			)}
			<TextPieceView piece={module.pieces[nameId]} className="cs-input-text cs-passive-name" />
		</div>
	);
}

function TextModule({ module }) {
	return (
		<FieldModule module={module} className="cs-text-tile">
			<TextPieceView piece={module.pieces[module.pieceOrder[0]]} />
		</FieldModule>
	);
}

function TextAreaModule({ module }) {
	return (
		<FieldModule module={module} className="cs-textarea-tile">
			<TextAreaPieceView piece={module.pieces[module.pieceOrder[0]]} />
		</FieldModule>
	);
}

function CheckboxModule({ module }) {
	return (
		<div className={`cs-module ${moduleColorClass(module)} cs-checkbox-tile`}>
			<CheckboxPieceView piece={module.pieces[module.pieceOrder[0]]} />
			{module.label ? <span className="cs-save-label">{module.label}</span> : null}
		</div>
	);
}

// A labelled run of checkboxes — death saves, hit dice spent, an item's charges.
function CheckboxRowModule({ module, cardId }) {
	return (
		<div className={`cs-module ${moduleColorClass(module)} cs-checkbox-row`}>
			{module.label ? <span className="cs-checkbox-row-label">{module.label}</span> : null}
			<div className="cs-checkbox-row-boxes">
				{module.pieceOrder.map((pieceId) => (
					<CheckboxPieceView key={pieceId} piece={module.pieces[pieceId]} />
				))}
			</div>
			<RowControls cardId={cardId} module={module} />
		</div>
	);
}

function DropdownModule({ module }) {
	return (
		<FieldModule module={module} className="cs-dropdown-tile">
			<DropdownPieceView piece={module.pieces[module.pieceOrder[0]]} />
		</FieldModule>
	);
}

// A growable stack of plain text lines (Proficiencies and Languages). Rows
// alternate shade so a long list stays scannable.
function ListTextModule({ module, cardId }) {
	return (
		<FieldModule module={module} className="cs-list-tile">
			<div className="cs-list-rows">
				{module.pieceOrder.map((pieceId, index) => (
					<div key={pieceId} className={`cs-list-row${index % 2 ? " cs-list-row--alt" : ""}`}>
						<TextPieceView piece={module.pieces[pieceId]} className="cs-input-text cs-input-flush" />
					</div>
				))}
			</div>
			<RowControls cardId={cardId} module={module} />
		</FieldModule>
	);
}

// Equipment / Treasure: a name and quantity per row, under an Item Name | Qty
// heading. Pieces come in pairs (see the itemList row shape in sheetOps).
function ItemListModule({ module, cardId }) {
	const rows = [];
	for (let index = 0; index < module.pieceOrder.length; index += 2) {
		rows.push([module.pieceOrder[index], module.pieceOrder[index + 1]]);
	}
	return (
		<div className={`cs-module ${moduleColorClass(module)} cs-item-list`}>
			<div className="cs-item-head">
				<span className="cs-item-head-name">Item Name</span>
				<span className="cs-item-head-qty">Qty</span>
			</div>
			<div className="cs-list-rows">
				{rows.map(([nameId, qtyId], index) => (
					<div key={nameId} className={`cs-item-row${index % 2 ? " cs-list-row--alt" : ""}`}>
						<TextPieceView piece={module.pieces[nameId]} className="cs-input-text cs-input-flush" />
						{qtyId ? (
							<TextPieceView piece={module.pieces[qtyId]} className="cs-input-text cs-input-flush cs-item-qty" />
						) : null}
					</div>
				))}
			</div>
			<RowControls cardId={cardId} module={module} />
		</div>
	);
}

function ImageModule({ module }) {
	return (
		<div className={`cs-module ${moduleColorClass(module)} cs-image-tile`}>
			<ImagePieceView piece={module.pieces[module.pieceOrder[0]]} />
		</div>
	);
}

// Currency: the four coin quantities plus their live total in gold. Each row
// carries its own metal colour (see the --cs-coin-* palette).
const COIN_ROW_CLASSES = ["cs-coin--pp", "cs-coin--gp", "cs-coin--sp", "cs-coin--cp"];

function CurrencyModule({ module }) {
	const [totalId, ...coinIds] = module.pieceOrder;
	return (
		<div className={`cs-module ${moduleColorClass(module)} cs-currency-tile`}>
			<div className="cs-currency-row cs-currency-row--total">
				<span className="cs-currency-label">Total Converted to GP</span>
				<ComputedValue pieceId={totalId} className="cs-currency-value" />
			</div>
			{coinIds.map((pieceId, index) => (
				<div key={pieceId} className={`cs-currency-row ${COIN_ROW_CLASSES[index] || ""}`}>
					<span className="cs-currency-label">{module.pieces[pieceId].label}</span>
					<TextPieceView piece={module.pieces[pieceId]} className="cs-input-text cs-currency-input" />
				</div>
			))}
		</div>
	);
}

// One spell: its name, the five stat columns, then the description underneath.
const SPELL_COLUMN_LABELS = ["Level:", "Casting Time:", "School:", "Source:", "Classes:"];

function SpellEntryModule({ module }) {
	const [nameId, ...rest] = module.pieceOrder;
	const columnIds = rest.slice(0, SPELL_COLUMN_LABELS.length);
	const descriptionId = rest[SPELL_COLUMN_LABELS.length];
	return (
		<div className={`cs-module ${moduleColorClass(module)} cs-spell-tile`}>
			<TextPieceView
				piece={module.pieces[nameId]}
				placeholder="Spell name"
				className="cs-input-text cs-spell-name"
			/>
			<div className="cs-spell-columns">
				{columnIds.map((pieceId, index) => (
					<div key={pieceId} className="cs-spell-column">
						<span className="cs-spell-column-label">{SPELL_COLUMN_LABELS[index]}</span>
						<TextPieceView piece={module.pieces[pieceId]} className="cs-input-text cs-input-flush" />
					</div>
				))}
			</div>
			{descriptionId ? (
				<TextAreaPieceView piece={module.pieces[descriptionId]} placeholder="What the spell does…" />
			) : null}
		</div>
	);
}

// Health's Damage/Heal control: number-locked amount + the two wired buttons.
function DamageHealModule({ module }) {
	const [amountId, damageId, healId] = module.pieceOrder;
	return (
		<div className="cs-module cs-module--button cs-damage-heal-tile">
			<div className="cs-module-title">{module.label}</div>
			<TextPieceView piece={module.pieces[amountId]} placeholder="Amount" />
			<div className="cs-damage-heal-buttons">
				<ButtonPieceView piece={module.pieces[damageId]} className="cs-btn--damage" />
				<ButtonPieceView piece={module.pieces[healId]} className="cs-btn--heal" />
			</div>
		</div>
	);
}

// Fallback for module types without a dedicated view: renders each piece by kind.
function GenericModule({ module }) {
	return (
		<div className={`cs-module ${moduleColorClass(module)} cs-generic-tile`}>
			<div className="cs-module-title">{module.label}</div>
			{module.pieceOrder.map((pieceId) => {
				const piece = module.pieces[pieceId];
				switch (piece.kind) {
					case "variable":
						return piece.formula ? (
							<ComputedValue key={pieceId} pieceId={pieceId} />
						) : (
							<NumberInput key={pieceId} piece={piece} />
						);
					case "checkbox":
						return <CheckboxPieceView key={pieceId} piece={piece} />;
					case "text":
						return <TextPieceView key={pieceId} piece={piece} />;
					case "button":
						return <ButtonPieceView key={pieceId} piece={piece} />;
					case "dropdown":
						return <DropdownPieceView key={pieceId} piece={piece} />;
					case "image":
						return <ImagePieceView key={pieceId} piece={piece} />;
					default:
						return null;
				}
			})}
		</div>
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
	spellEntry: SpellEntryModule,
	damageHeal: DamageHealModule,
};

// Renders one module with the view matching its type. Also used by the layout
// editor and the card previews, which show the same tiles in a display-only
// context — they pass no cardId, which is what hides the row +/− controls.
export function ModuleView({ module, cardId = null }) {
	const View = MODULE_VIEWS[module.type] || GenericModule;
	return <View module={module} cardId={cardId} />;
}

// Class + inline style for a module slot: an absolutely-positioned box at
// its stored rect ({ x, y, width, height } in px, all multiples of 5 — see
// grid.js). Every module is always explicitly sized, and its content scales to
// fill the box instead of scrolling: --cs-scale (derived from the box vs the
// type's design size) drives every font/padding inside the module, so resizing
// the box grows or shrinks the content with it (see CharacterSheetStyles.css).
export function moduleSlotProps(rect, type) {
	return {
		className: "cs-module-slot",
		style: {
			position: "absolute",
			left: rect.x,
			top: rect.y,
			width: rect.width,
			height: rect.height,
			"--cs-scale": getModuleContentScale(rect, type),
		},
	};
}

// Header inline style for a card's own chosen color (falls back to the
// default navy via CSS when unset), with readable text picked to match.
export function cardHeaderStyle(card) {
	if (!card.headerColor) {
		return undefined;
	}
	return { backgroundColor: card.headerColor, color: getContrastTextColor(card.headerColor) };
}

// Class + inline var for a card's own chosen module background — see the
// .cs-card-body--custom-module-bg rule in CharacterSheetStyles.css, which
// wins over every per-type/-ability .cs-module background because it's a
// two-class selector against their one.
export function cardBodyProps(card, baseClassName) {
	if (!card.moduleBgColor) {
		return { className: baseClassName, style: undefined };
	}
	return {
		className: `${baseClassName} cs-card-body--custom-module-bg`,
		style: { "--cs-module-bg-override": card.moduleBgColor },
	};
}

// One card on the canvas: navy header + this page's arrangement of its modules,
// each an absolutely-positioned box at its stored rect. itemRef/itemStyle place
// this card on the page canvas at its own stored rect, when provided by the caller.
//
// The header is always the card's move handle (onHeaderPointerDown, supplied
// by the page canvas) and always opens Edit Layout on a plain click — the
// kebab button is just a second, more obvious way in. Both live on the same
// header specifically so there's no separate "Arrange Cards" mode: a card can
// be repositioned or resized at any time, right from the live sheet. The
// button stops the pointerdown from bubbling so pressing it never also
// starts a drag.
//
// When the layout's header is tucked away (showHeader false — see the
// layout field), none of that changes except when it's visible: instead of
// always sitting above the body in normal flow, it floats over the body
// (see .cs-card-header--floating) and only drops into view after the cursor
// rests on the card for HEADER_REVEAL_DELAY, hiding again the instant the
// cursor leaves. That's purely a hover state, never persisted — the toggle
// itself lives in the layout editor's controls (see CardLayoutEditor).
export default function CharacterSheetCard({ layout, onEditLayout, onHeaderPointerDown, itemStyle, dragging = false }) {
	const { sheet } = useCharacterSheet();
	const card = sheet.cards[layout.cardId];
	const showHeader = layout.showHeader !== false;
	const [headerRevealed, setHeaderRevealed] = useState(false);
	const revealTimerRef = useRef(null);

	useEffect(() => () => clearTimeout(revealTimerRef.current), []);

	const handlePointerEnter = () => {
		if (showHeader) {
			return;
		}
		revealTimerRef.current = setTimeout(() => setHeaderRevealed(true), HEADER_REVEAL_DELAY);
	};
	const handlePointerLeave = () => {
		clearTimeout(revealTimerRef.current);
		setHeaderRevealed(false);
	};

	const moduleIds = card
		? layout.moduleOrder.filter((moduleId) => card.modules[moduleId] && layout.moduleRects?.[moduleId])
		: [];
	if (!card) {
		return null;
	}
	const bodyProps = cardBodyProps(card, "cs-card-body");
	const floating = !showHeader;
	return (
		<section
			className={`cs-card${dragging ? " cs-card--dragging" : ""}`}
			style={itemStyle}
			onPointerEnter={handlePointerEnter}
			onPointerLeave={handlePointerLeave}
		>
			<header
				className={`cs-card-header${floating ? ` cs-card-header--floating${headerRevealed ? " cs-card-header--visible" : ""}` : ""}`}
				style={cardHeaderStyle(card)}
				onPointerDown={onHeaderPointerDown}
			>
				<span className="cs-card-title">{card.title}</span>
				<button
					type="button"
					className="cs-card-header-menu-btn"
					aria-label="Edit Layout"
					title="Edit Layout"
					onPointerDown={(event) => event.stopPropagation()}
					onClick={onEditLayout}
				>
					<KebabIcon />
				</button>
			</header>
			<div className={bodyProps.className} style={bodyProps.style}>
				{moduleIds.map((moduleId) => {
					const module = card.modules[moduleId];
					const slot = moduleSlotProps(layout.moduleRects[moduleId], module.type);
					return (
						<div key={moduleId} className={slot.className} style={slot.style}>
							<ModuleView module={module} cardId={card.id} />
						</div>
					);
				})}
			</div>
		</section>
	);
}
