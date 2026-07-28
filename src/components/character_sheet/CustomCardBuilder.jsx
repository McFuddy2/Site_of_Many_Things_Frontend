import { useMemo, useRef, useState } from "react";
import {
	MODULE_TYPE_OPTIONS,
	ABILITY_NAMES,
	createCustomCard,
	createModuleForType,
	createTextModule,
} from "../../utils/character_sheet/schema";
import {
	refTokenFor,
	textToSegments,
	resolveSegmentsPreview,
	referenceablePieces,
} from "../../utils/character_sheet/refTokens";
import { useCharacterSheet, SheetPreviewProvider } from "./CharacterSheetContext";
import { ModuleView } from "./CharacterSheetCard";

// Custom Card creation flow (mockup: name the card, then repeatedly pick a
// module type, configure it, and "Add Another" until "Finish and Submit").
// The card is a local draft the whole time — it only reaches the sheet (and
// localStorage) when submitted, and "Nevermind" throws it away.

const CONFIGURE_INSTRUCTIONS = {
	abilityScore: "Set up your new stat:",
	number: "Provide the number for this module:",
	bigNumber: "Provide the starting value for this stat:",
	text: "Provide the text for this module:",
	bigText: "Provide the heading text for this module:",
	textArea: "Provide the description for this module:",
	dropdown: "Provide the options for this list (one per line):",
	checkbox: "Set up your checkbox:",
	checkboxRow: "Set up this row of checkboxes:",
	skill: "Set up this skill:",
	passiveSkill: "Set up this passive score:",
	columnHeader: "Provide the column headings (one per line):",
	listText: "Provide the starting lines (one per line):",
	itemList: "Provide the starting items (one per line, as “Name, Qty”):",
	image: "Add an image:",
	currency: "Name this currency tracker:",
	spellEntry: "Name this spell — the rest is filled in on the card:",
};

const DEFAULT_LABELS = {
	abilityScore: "New Stat",
	number: "Number",
	bigNumber: "Value",
	text: "Text Field",
	bigText: "Name",
	textArea: "Description",
	dropdown: "Drop Down",
	checkbox: "Checkbox",
	checkboxRow: "Uses",
	skill: "Skill",
	passiveSkill: "Passive Skill",
	columnHeader: "Column Headers",
	listText: "List",
	itemList: "Items",
	image: "Image",
	currency: "Currency",
	spellEntry: "Spell",
};

// Which extra inputs a module type's form needs beyond its name. Types not
// listed here (currency, spellEntry) are fully configured by their name alone —
// everything else about them is filled in directly on the card afterwards.
const NEEDS_NUMBER = new Set(["abilityScore", "number", "bigNumber", "passiveSkill"]);
const NEEDS_LINES = new Set(["dropdown", "columnHeader", "listText", "itemList"]);

const LINES_PLACEHOLDER = {
	dropdown: "First option\nSecond option",
	columnHeader: "Proficient?\nModifier\nStat",
	listText: "Light Armor\nShields\nElvish",
	itemList: "Backpack, 1\nFlask of Oil, 10",
};

// "Backpack, 1" -> { name: "Backpack", qty: "1" }. Only the last comma splits, so
// an item name may contain commas of its own; a line with no comma is quantity 1.
function parseItemLine(line) {
	const splitAt = line.lastIndexOf(",");
	if (splitAt === -1) {
		return { name: line, qty: "1" };
	}
	return { name: line.slice(0, splitAt).trim(), qty: line.slice(splitAt + 1).trim() || "1" };
}

function ConfigureModuleForm({ typeId, onAdd, onBack }) {
	const { sheet, pieceIndex } = useCharacterSheet();
	const [label, setLabel] = useState(DEFAULT_LABELS[typeId] || "");
	const [numberValue, setNumberValue] = useState(typeId === "abilityScore" ? 10 : 0);
	const [text, setText] = useState("");
	const [optionsText, setOptionsText] = useState("");
	const [checked, setChecked] = useState(false);
	const [count, setCount] = useState(3);
	const [ability, setAbility] = useState("wisdom");
	const [imageSrc, setImageSrc] = useState("");

	// Reference picker (Description modules only)
	const cards = Object.values(sheet.cards);
	const [refCardId, setRefCardId] = useState(cards[0]?.id || "");
	const refPieces = useMemo(
		() => (sheet.cards[refCardId] ? referenceablePieces(sheet.cards[refCardId]) : []),
		[sheet, refCardId]
	);
	const [refPieceId, setRefPieceId] = useState("");
	const textareaRef = useRef(null);

	const insertReference = () => {
		const pieceId = refPieceId || refPieces[0]?.id;
		if (!pieceId) {
			return;
		}
		const token = refTokenFor(pieceId, pieceIndex);
		const textarea = textareaRef.current;
		const start = textarea ? textarea.selectionStart : text.length;
		const end = textarea ? textarea.selectionEnd : text.length;
		setText(text.slice(0, start) + token + text.slice(end));
	};

	const lines = optionsText
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean);

	const handleAdd = () => {
		const finalLabel = label.trim() || DEFAULT_LABELS[typeId] || "Module";

		// Text Field modules keep their own path: they're the one type that can
		// carry live reference segments (see the picker below), which the plain
		// createModuleForType config can't express.
		if (typeId === "text") {
			return onAdd(createTextModule(finalLabel, { segments: textToSegments(text, pieceIndex) }));
		}

		const module = createModuleForType(typeId, {
			label: finalLabel,
			score: Number(numberValue) || 0,
			value: typeId === "checkbox" ? checked : Number(numberValue) || 0,
			text,
			options: lines,
			labels: lines,
			items: typeId === "itemList" ? lines.map(parseItemLine) : lines,
			count: Math.max(1, Number(count) || 1),
			ability,
			src: imageSrc,
		});
		return module ? onAdd(module) : undefined;
	};

	const preview =
		typeId === "text" ? resolveSegmentsPreview(textToSegments(text, pieceIndex), pieceIndex) : null;

	return (
		<>
			<label className="cs-builder-field">
				<span>Name</span>
				<input
					type="text"
					className="cs-input-text cs-builder-input"
					value={label}
					onChange={(event) => setLabel(event.target.value)}
				/>
			</label>

			{NEEDS_NUMBER.has(typeId) && (
				<label className="cs-builder-field">
					<span>{typeId === "abilityScore" ? "Starting Score" : "Starting Value"}</span>
					<input
						type="number"
						className="cs-input-number"
						value={numberValue}
						onChange={(event) => setNumberValue(event.target.value)}
					/>
				</label>
			)}

			{typeId === "skill" && (
				<label className="cs-builder-field">
					<span>Governed by</span>
					<select className="cs-select" value={ability} onChange={(event) => setAbility(event.target.value)}>
						{ABILITY_NAMES.map((name) => (
							<option key={name} value={name.toLowerCase()}>
								{name}
							</option>
						))}
					</select>
				</label>
			)}

			{typeId === "checkboxRow" && (
				<label className="cs-builder-field">
					<span>How many checkboxes</span>
					<input
						type="number"
						min="1"
						className="cs-input-number"
						value={count}
						onChange={(event) => setCount(event.target.value)}
					/>
				</label>
			)}

			{typeId === "image" && (
				<label className="cs-builder-field">
					<span>Image link (or add one on the card later)</span>
					<input
						type="text"
						className="cs-input-text cs-builder-input"
						placeholder="https://…"
						value={imageSrc}
						onChange={(event) => setImageSrc(event.target.value)}
					/>
				</label>
			)}

			{(typeId === "bigText" || typeId === "textArea") && (
				<textarea
					className="cs-builder-textarea"
					rows={typeId === "textArea" ? 5 : 2}
					placeholder="Starting text…"
					value={text}
					onChange={(event) => setText(event.target.value)}
				/>
			)}

			{typeId === "text" && (
				<>
					<textarea
						ref={textareaRef}
						className="cs-builder-textarea"
						rows={5}
						placeholder="Description…"
						value={text}
						onChange={(event) => setText(event.target.value)}
					/>
					<div className="cs-ref-picker">
						<select
							className="cs-select"
							value={refCardId}
							onChange={(event) => {
								setRefCardId(event.target.value);
								setRefPieceId("");
							}}
						>
							{cards.length === 0 && <option value="">No cards to reference</option>}
							{cards.map((card) => (
								<option key={card.id} value={card.id}>
									{card.title}
								</option>
							))}
						</select>
						<select
							className="cs-select"
							value={refPieceId || refPieces[0]?.id || ""}
							onChange={(event) => setRefPieceId(event.target.value)}
						>
							{refPieces.length === 0 && <option value="">Nothing referenceable</option>}
							{refPieces.map((piece) => (
								<option key={piece.id} value={piece.id}>
									{piece.label}
								</option>
							))}
						</select>
						<button
							type="button"
							className="cs-layout-btn"
							onClick={insertReference}
							disabled={!refPieces.length}
						>
							Insert Reference
						</button>
					</div>
					<p className="cs-builder-hint">
						Inserted references pull live info from another card — if that card changes, this text updates too.
					</p>
					{text && (
						<div className="cs-builder-preview-text">
							<span className="cs-field-label">Preview</span>
							<p>{preview}</p>
						</div>
					)}
				</>
			)}

			{NEEDS_LINES.has(typeId) && (
				<textarea
					className="cs-builder-textarea"
					rows={4}
					placeholder={LINES_PLACEHOLDER[typeId]}
					value={optionsText}
					onChange={(event) => setOptionsText(event.target.value)}
				/>
			)}

			{typeId === "checkbox" && (
				<label className="cs-builder-field cs-builder-field--inline">
					<input
						type="checkbox"
						className="cs-checkbox"
						checked={checked}
						onChange={(event) => setChecked(event.target.checked)}
					/>
					<span>Checked to start</span>
				</label>
			)}

			<div className="cs-builder-actions">
				<button type="button" className="cs-layout-btn cs-layout-btn--confirm" onClick={handleAdd}>
					Add Another
				</button>
				<button type="button" className="cs-layout-btn" onClick={onBack}>
					Go Back
				</button>
			</div>
		</>
	);
}

export default function CustomCardBuilder({ onClose }) {
	const { sheet, dispatch } = useCharacterSheet();
	const [draft, setDraft] = useState(() => createCustomCard(""));
	const [step, setStep] = useState("name"); // name | pick | configure
	const [nameInput, setNameInput] = useState("");
	const [pendingType, setPendingType] = useState("");

	// The preview resolves formulas/references against the real sheet plus the
	// draft card, so e.g. a draft stat's Bonus calculates before the card exists.
	const previewSheet = useMemo(
		() => ({ ...sheet, cards: { ...sheet.cards, [draft.id]: draft } }),
		[sheet, draft]
	);

	const addModuleToDraft = (module) => {
		setDraft((current) => ({
			...current,
			modules: { ...current.modules, [module.id]: module },
			moduleOrder: [...current.moduleOrder, module.id],
		}));
		setStep("pick");
		setPendingType("");
	};

	const handleConfirmTitle = () => {
		setDraft((current) => ({ ...current, title: nameInput.trim() || "Unnamed" }));
		setStep("pick");
	};

	const handleFinish = () => {
		dispatch({ type: "addCardToPage", pageId: sheet.activePageId, card: draft });
		onClose();
	};

	return (
		<div className="cs-builder">
			<SheetPreviewProvider sheet={previewSheet}>
				<section className="cs-card cs-builder-preview-card">
					<header className="cs-card-header">
						<span>{draft.title || "Unnamed"}</span>
						<span className="cs-card-header-note">New Card</span>
					</header>
					<div className="cs-card-body cs-builder-preview-body">
						{draft.moduleOrder.length === 0 ? (
							<p className="cs-empty">No modules yet.</p>
						) : (
							draft.moduleOrder.map((moduleId) => (
								<ModuleView key={moduleId} module={draft.modules[moduleId]} />
							))
						)}
					</div>
				</section>
			</SheetPreviewProvider>

			<div className="cs-builder-panel">
				{step === "name" && (
					<>
						<p className="cs-builder-instructions">Name your new card</p>
						<input
							type="text"
							className="cs-input-text cs-builder-input"
							placeholder="Unnamed"
							value={nameInput}
							onChange={(event) => setNameInput(event.target.value)}
							autoFocus
						/>
						<div className="cs-builder-actions">
							<button type="button" className="cs-layout-btn cs-layout-btn--confirm" onClick={handleConfirmTitle}>
								Confirm Title
							</button>
							<button type="button" className="cs-layout-btn cs-layout-btn--exit" onClick={onClose}>
								Nevermind
							</button>
						</div>
					</>
				)}

				{step === "pick" && (
					<>
						<p className="cs-builder-instructions">Select the next module to include on this card:</p>
						<select
							className="cs-select cs-builder-input"
							value={pendingType}
							onChange={(event) => setPendingType(event.target.value)}
						>
							<option value="" disabled>
								Module type…
							</option>
							{MODULE_TYPE_OPTIONS.map((option) => (
								<option key={option.id} value={option.id} disabled={!option.available}>
									{option.label}
									{option.available ? "" : " (coming soon)"}
								</option>
							))}
						</select>
						<div className="cs-builder-actions">
							<button
								type="button"
								className="cs-layout-btn cs-layout-btn--confirm"
								onClick={() => setStep("configure")}
								disabled={!pendingType}
							>
								Next
							</button>
							<button
								type="button"
								className="cs-layout-btn"
								onClick={() => {
									setNameInput(draft.title === "Unnamed" ? "" : draft.title);
									setStep("name");
								}}
							>
								Edit Card Title
							</button>
						</div>
						<div className="cs-builder-actions">
							<button type="button" className="cs-layout-btn cs-layout-btn--confirm" onClick={handleFinish}>
								Finish and Submit
							</button>
							<button type="button" className="cs-layout-btn cs-layout-btn--exit" onClick={onClose}>
								Nevermind
							</button>
						</div>
					</>
				)}

				{step === "configure" && (
					<>
						<p className="cs-builder-instructions">
							{CONFIGURE_INSTRUCTIONS[pendingType] || "Configure this module:"}
						</p>
						<ConfigureModuleForm
							key={pendingType}
							typeId={pendingType}
							onAdd={addModuleToDraft}
							onBack={() => setStep("pick")}
						/>
					</>
				)}
			</div>
		</div>
	);
}
