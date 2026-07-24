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

// Card types that exist in the engine but whose creation flow arrives in a later
// build step still show in the picker, just disabled — same as "coming soon" types.
const NOT_YET_WIRED = new Set(["custom", "insertExisting"]);

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

export default function NewCardModal() {
	const { sheet, dispatch } = useCharacterSheet();
	const [open, setOpen] = useState(false);
	const [selectedType, setSelectedType] = useState("");

	const handleAdd = () => {
		const card = buildCard(selectedType, sheet);
		if (!card) {
			return;
		}
		dispatch({ type: "addCardToPage", pageId: sheet.activePageId, card });
		setOpen(false);
	};

	return (
		<Dialog.Root
			open={open}
			onOpenChange={(nextOpen) => {
				setOpen(nextOpen);
				if (nextOpen) {
					setSelectedType("");
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
				<Dialog.Content className="cs-modal" aria-describedby={undefined}>
					<Dialog.Title className="cs-modal-title">Choose a Type of Card to Add:</Dialog.Title>

					<select
						className="cs-select cs-modal-select"
						value={selectedType}
						onChange={(event) => setSelectedType(event.target.value)}
					>
						<option value="" disabled>
							Select a card type…
						</option>
						{CARD_TYPE_OPTIONS.map((option) => {
							const wired = option.available && !NOT_YET_WIRED.has(option.id);
							return (
								<option key={option.id} value={option.id} disabled={!wired}>
									{option.label}
									{wired ? "" : " (coming soon)"}
								</option>
							);
						})}
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
							Add Card
						</button>
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
