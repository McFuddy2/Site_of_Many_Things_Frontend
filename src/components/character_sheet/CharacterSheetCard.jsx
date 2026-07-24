import { getPieceNumericValue, getPieceTextValue } from "../../utils/character_sheet/references";
import { useCharacterSheet } from "./CharacterSheetContext";

// Pastel color-coding by module type (mockup convention): variable-based modules
// read differently from checkbox-, text-, button-, and dropdown-based ones.
const MODULE_COLOR_CLASS = {
	abilityScore: "cs-module--variable",
	number: "cs-module--variable",
	savingThrow: "cs-module--checkbox",
	checkbox: "cs-module--checkbox",
	text: "cs-module--text",
	damageHeal: "cs-module--button",
	dropdown: "cs-module--dropdown",
};

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

function NumberInput({ piece }) {
	const { dispatch } = useCharacterSheet();
	return (
		<input
			type="number"
			className="cs-input-number"
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
}

// A text piece is editable while it's a single plain segment (all of this build's
// standard-card text pieces are). Once it contains reference segments it renders
// as live resolved text instead.
function TextPieceView({ piece, placeholder = "" }) {
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
			className="cs-input-text"
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

// --- Module views ---

// Ability Scores stat tile: name, auto-calculated Bonus, editable Score.
function AbilityScoreModule({ module }) {
	const [scoreId, bonusId] = module.pieceOrder;
	return (
		<div className="cs-module cs-module--variable cs-ability-tile">
			<div className="cs-module-title">{module.label}</div>
			<div className="cs-field-label">Bonus</div>
			<ComputedValue pieceId={bonusId} signed className="cs-ability-bonus" />
			<div className="cs-field-label">Score</div>
			<NumberInput piece={module.pieces[scoreId]} />
		</div>
	);
}

function NumberModule({ module }) {
	const pieceId = module.pieceOrder[0];
	const piece = module.pieces[pieceId];
	return (
		<div className="cs-module cs-module--variable cs-number-tile">
			<div className="cs-module-title">{module.label}</div>
			{piece.formula ? <ComputedValue pieceId={pieceId} className="cs-number-value" /> : <NumberInput piece={piece} />}
		</div>
	);
}

// Saving throw row: proficiency checkbox, live save bonus, ability label.
function SavingThrowModule({ module }) {
	const [profId, bonusId, labelId] = module.pieceOrder;
	const { pieceIndex } = useCharacterSheet();
	const label = getPieceTextValue(labelId, pieceIndex);
	const bonusPiece = module.pieces[bonusId];
	return (
		<div className="cs-module cs-module--checkbox cs-save-row">
			<CheckboxPieceView piece={module.pieces[profId]} />
			{bonusPiece.formula ? (
				<ComputedValue pieceId={bonusId} signed className="cs-save-bonus" />
			) : (
				<NumberInput piece={bonusPiece} />
			)}
			<span className="cs-save-label">{label.error ? module.label : label.text}</span>
		</div>
	);
}

function TextModule({ module }) {
	const piece = module.pieces[module.pieceOrder[0]];
	return (
		<div className="cs-module cs-module--text cs-text-tile">
			<div className="cs-module-title">{module.label}</div>
			<TextPieceView piece={piece} />
		</div>
	);
}

function CheckboxModule({ module }) {
	return (
		<div className="cs-module cs-module--checkbox cs-checkbox-tile">
			<CheckboxPieceView piece={module.pieces[module.pieceOrder[0]]} />
			<span className="cs-save-label">{module.label}</span>
		</div>
	);
}

function DropdownModule({ module }) {
	return (
		<div className="cs-module cs-module--dropdown cs-dropdown-tile">
			<div className="cs-module-title">{module.label}</div>
			<DropdownPieceView piece={module.pieces[module.pieceOrder[0]]} />
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
	const colorClass = MODULE_COLOR_CLASS[module.type] || "cs-module--text";
	return (
		<div className={`cs-module ${colorClass} cs-generic-tile`}>
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
	savingThrow: SavingThrowModule,
	text: TextModule,
	checkbox: CheckboxModule,
	dropdown: DropdownModule,
	damageHeal: DamageHealModule,
};

// Renders one module with the view matching its type. Also used by the layout
// editor, which shows the same tiles in a drag-and-drop context.
export function ModuleView({ module }) {
	const View = MODULE_VIEWS[module.type] || GenericModule;
	return <View module={module} />;
}

// One card on the canvas: navy header + this page's arrangement of its modules.
export default function CharacterSheetCard({ layout, onEditLayout }) {
	const { sheet } = useCharacterSheet();
	const card = sheet.cards[layout.cardId];
	if (!card) {
		return null;
	}
	return (
		<section className="cs-card">
			<header className="cs-card-header">
				<span>{card.title}</span>
				<button type="button" className="cs-card-header-edit" onClick={onEditLayout}>
					Edit Layout
				</button>
			</header>
			<div className="cs-card-body">
				{layout.moduleOrder.map((moduleId) => {
					const module = card.modules[moduleId];
					return module ? <ModuleView key={moduleId} module={module} /> : null;
				})}
			</div>
		</section>
	);
}
