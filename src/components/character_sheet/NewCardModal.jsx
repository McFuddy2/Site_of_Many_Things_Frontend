import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
	CARD_TYPE_OPTIONS,
	createAbilityScoresCard,
	createHealthCard,
	createSavingThrowsCard,
	getAbilityBonusPieceIds,
} from "../../utils/character_sheet/schema";
import { useCharacterSheet } from "./CharacterSheetContext";
import { ModuleView } from "./CharacterSheetCard";

function buildCard(typeId, sheet) {
	switch (typeId) {
		case "abilityScores":
			return createAbilityScoresCard();
		case "health":
			return createHealthCard();
		case "savingThrows": {
			// Wire saves to the sheet's Ability Scores card when one exists, so the
			// save bonus live-references the matching ability's Bonus variable.
			const abilityCard = Object.values(sheet.cards).find((card) => card.type === "abilityScores");
			return createSavingThrowsCard(
				abilityCard ? { abilityBonusPieceIds: getAbilityBonusPieceIds(abilityCard) } : {}
			);
		}
		default:
			return null;
	}
}

// Unique cards placed on a page, excluding any already shown on the target page —
// inserting an existing card adds a new layout entry (shared data), so offering
// cards already present would only create same-page duplicates.
function eligibleCards(sheet, sourcePage, targetPageId) {
	const targetPage = sheet.pages.find((page) => page.id === targetPageId);
	const alreadyOnTarget = new Set((targetPage?.cardLayouts || []).map((layout) => layout.cardId));
	const seen = new Set();
	const cards = [];
	for (const layout of sourcePage.cardLayouts) {
		if (seen.has(layout.cardId) || alreadyOnTarget.has(layout.cardId)) {
			continue;
		}
		seen.add(layout.cardId);
		const card = sheet.cards[layout.cardId];
		if (card) {
			cards.push(card);
		}
	}
	return cards;
}

export default function NewCardModal({ onStartCustomCard }) {
	const { sheet, dispatch } = useCharacterSheet();
	const [open, setOpen] = useState(false);
	const [step, setStep] = useState("type"); // type | page | card | preview
	const [selectedType, setSelectedType] = useState("");
	const [selectedPageId, setSelectedPageId] = useState("");
	const [selectedCardId, setSelectedCardId] = useState("");

	const resetState = () => {
		setStep("type");
		setSelectedType("");
		setSelectedPageId("");
		setSelectedCardId("");
	};

	const handleAdd = () => {
		if (selectedType === "insertExisting") {
			setStep("page");
			return;
		}
		if (selectedType === "custom") {
			setOpen(false);
			onStartCustomCard();
			return;
		}
		const card = buildCard(selectedType, sheet);
		if (!card) {
			return;
		}
		dispatch({ type: "addCardToPage", pageId: sheet.activePageId, card });
		setOpen(false);
	};

	const handleConfirmInsert = () => {
		dispatch({ type: "insertExistingCard", pageId: sheet.activePageId, cardId: selectedCardId });
		setOpen(false);
	};

	const sourcePage = sheet.pages.find((page) => page.id === selectedPageId);
	const insertableCards = sourcePage ? eligibleCards(sheet, sourcePage, sheet.activePageId) : [];
	const previewCard = sheet.cards[selectedCardId];

	return (
		<Dialog.Root
			open={open}
			onOpenChange={(nextOpen) => {
				setOpen(nextOpen);
				if (nextOpen) {
					resetState();
				}
			}}
		>
			<Dialog.Trigger asChild>
				<button type="button" className="cs-topbar-button cs-topbar-button--primary">
					New Card
				</button>
			</Dialog.Trigger>

			<Dialog.Portal>
				<Dialog.Overlay className="cs-modal-overlay" />
				<Dialog.Content
					className={`cs-modal${step === "preview" ? " cs-modal--wide" : ""}`}
					aria-describedby={undefined}
				>
					{step === "type" && (
						<>
							<Dialog.Title className="cs-modal-title">Choose a Type of Card to Add:</Dialog.Title>
							<select
								className="cs-select cs-modal-select"
								value={selectedType}
								onChange={(event) => setSelectedType(event.target.value)}
							>
								<option value="" disabled>
									Select a card type…
								</option>
								{CARD_TYPE_OPTIONS.map((option) => (
									<option key={option.id} value={option.id} disabled={!option.available}>
										{option.label}
										{option.available ? "" : " (coming soon)"}
									</option>
								))}
							</select>
							<div className="cs-modal-actions">
								<Dialog.Close asChild>
									<button type="button" className="cs-modal-button">
										Close
									</button>
								</Dialog.Close>
								<button
									type="button"
									className="cs-modal-button cs-modal-button--primary"
									onClick={handleAdd}
									disabled={!selectedType}
								>
									{selectedType === "insertExisting" ? "Next" : "Add Card"}
								</button>
							</div>
						</>
					)}

					{step === "page" && (
						<>
							<Dialog.Title className="cs-modal-title">Select a Page:</Dialog.Title>
							<select
								className="cs-select cs-modal-select"
								value={selectedPageId}
								onChange={(event) => {
									setSelectedPageId(event.target.value);
									setSelectedCardId("");
								}}
							>
								<option value="" disabled>
									Page Selection…
								</option>
								{sheet.pages.map((page) => (
									<option key={page.id} value={page.id}>
										{page.name}
										{page.id === sheet.activePageId ? " (current)" : ""}
									</option>
								))}
							</select>
							<div className="cs-modal-actions">
								<button type="button" className="cs-modal-button" onClick={() => setStep("type")}>
									Go Back
								</button>
								<button
									type="button"
									className="cs-modal-button cs-modal-button--primary"
									onClick={() => setStep("card")}
									disabled={!selectedPageId}
								>
									Next
								</button>
							</div>
						</>
					)}

					{step === "card" && (
						<>
							<Dialog.Title className="cs-modal-title">
								Select a card from {sourcePage?.name || "that page"}:
							</Dialog.Title>
							<select
								className="cs-select cs-modal-select"
								value={selectedCardId}
								onChange={(event) => setSelectedCardId(event.target.value)}
							>
								<option value="" disabled>
									{insertableCards.length ? "Select a Card…" : "No cards available on this page"}
								</option>
								{insertableCards.map((card) => (
									<option key={card.id} value={card.id}>
										{card.title}
									</option>
								))}
							</select>
							<div className="cs-modal-actions">
								<button type="button" className="cs-modal-button" onClick={() => setStep("page")}>
									Go Back
								</button>
								<button
									type="button"
									className="cs-modal-button cs-modal-button--primary"
									onClick={() => setStep("preview")}
									disabled={!selectedCardId}
								>
									Next
								</button>
							</div>
						</>
					)}

					{step === "preview" && previewCard && (
						<>
							<Dialog.Title className="cs-modal-title">
								Add “{previewCard.title}” to this page?
							</Dialog.Title>
							<p className="cs-builder-hint">
								This is the same card, not a copy — its values stay shared everywhere it appears.
								Only the arrangement of its modules can differ per page.
							</p>
							<div className="cs-modal-preview">
								<section className="cs-card">
									<header className="cs-card-header">{previewCard.title}</header>
									<div className="cs-card-body">
										{previewCard.moduleOrder.map((moduleId) =>
											previewCard.modules[moduleId] ? (
												<ModuleView key={moduleId} module={previewCard.modules[moduleId]} />
											) : null
										)}
									</div>
								</section>
							</div>
							<div className="cs-modal-actions">
								<Dialog.Close asChild>
									<button type="button" className="cs-modal-button">
										Nevermind
									</button>
								</Dialog.Close>
								<button
									type="button"
									className="cs-modal-button cs-modal-button--primary"
									onClick={handleConfirmInsert}
								>
									Confirm Selection
								</button>
							</div>
						</>
					)}
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
