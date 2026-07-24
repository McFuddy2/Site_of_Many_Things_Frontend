import { useMemo, useRef, useState } from "react";
import {
	MODULE_TYPE_OPTIONS,
	createCustomCard,
	createAbilityScoreModule,
	createNumberModule,
	createTextModule,
	createDropdownModule,
	createCheckboxModule,
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
	text: "Provide the description for this module:",
	dropdown: "Provide the options for this list (one per line):",
	checkbox: "Set up your checkbox:",
};

const DEFAULT_LABELS = {
	abilityScore: "New Stat",
	number: "Number",
	text: "Description",
	dropdown: "Drop Down",
	checkbox: "Checkbox",
};

function ConfigureModuleForm({ typeId, onAdd, onBack }) {
	const { sheet, pieceIndex } = useCharacterSheet();
	const [label, setLabel] = useState(DEFAULT_LABELS[typeId] || "");
	const [numberValue, setNumberValue] = useState(typeId === "abilityScore" ? 10 : 0);
	const [text, setText] = useState("");
	const [optionsText, setOptionsText] = useState("");
	const [checked, setChecked] = useState(false);

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

	const handleAdd = () => {
		const finalLabel = label.trim() || DEFAULT_LABELS[typeId] || "Module";
		switch (typeId) {
			case "abilityScore":
				return onAdd(createAbilityScoreModule(finalLabel, Number(numberValue) || 0));
			case "number":
				return onAdd(createNumberModule(finalLabel, Number(numberValue) || 0));
			case "text":
				return onAdd(createTextModule(finalLabel, { segments: textToSegments(text, pieceIndex) }));
			case "dropdown": {
				const options = optionsText
					.split("\n")
					.map((line) => line.trim())
					.filter(Boolean);
				return onAdd(createDropdownModule(finalLabel, options));
			}
			case "checkbox":
				return onAdd(createCheckboxModule(finalLabel, checked));
			default:
				return undefined;
		}
	};

	const preview = typeId === "text" ? resolveSegmentsPreview(textToSegments(text, pieceIndex), pieceIndex) : null;

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

			{(typeId === "abilityScore" || typeId === "number") && (
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

			{typeId === "dropdown" && (
				<textarea
					className="cs-builder-textarea"
					rows={4}
					placeholder={"First option\nSecond option"}
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
