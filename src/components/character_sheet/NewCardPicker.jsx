import { useEffect, useId, useMemo, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { CARD_TYPE_OPTIONS, createStandardCard } from "../../utils/character_sheet/schema";
import { useCharacterSheet, SheetPreviewProvider } from "./CharacterSheetContext";
import { CardPreview } from "./CharacterSheetCard";
import { PlusIcon, SearchIcon } from "./icons";

// The New Card button: a searchable list (ARIA combobox + listbox) that
// narrows as you type. Arrow keys move, Enter adds, Esc closes; "N" opens it
// from anywhere on the sheet, so a card is three keystrokes away ("N", a few
// letters, Enter). A standard card is added at once at the next open spot
// on the page, then selected and scrolled into view (see SheetCanvas's
// focusRequest). "(Custom)" opens the Custom Card builder, and
// "[Insert from another Page]" its own short wizard.

function matches(label, query) {
	const q = query.trim().toLowerCase();
	if (!q) {
		return true;
	}
	const text = label.toLowerCase();
	return text.includes(q) || q.split(/\s+/).every((word) => text.split(/[\s/()[\]]+/).some((part) => part.startsWith(word)));
}

function isTypingTarget(element) {
	return element && (["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName) || element.isContentEditable);
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

// "[Insert from another Page]": pick a page, pick one of its cards, confirm
// from a preview. The card is the same card, not a copy.
function InsertExistingDialog({ onClose, onInserted, getPageColumns }) {
	const { sheet, dispatch } = useCharacterSheet();
	const [step, setStep] = useState("page"); // page | card | preview
	const [selectedPageId, setSelectedPageId] = useState("");
	const [selectedCardId, setSelectedCardId] = useState("");
	const sourcePage = sheet.pages.find((page) => page.id === selectedPageId);
	const insertableCards = sourcePage ? eligibleCards(sheet, sourcePage, sheet.activePageId) : [];
	const previewCard = sheet.cards[selectedCardId];

	const handleConfirmInsert = () => {
		dispatch({ type: "insertExistingCard", pageId: sheet.activePageId, cardId: selectedCardId, maxCols: getPageColumns() });
		onInserted(selectedCardId);
		onClose();
	};

	return (
		<Dialog.Root open onOpenChange={(open) => !open && onClose()}>
			<Dialog.Portal>
				<Dialog.Overlay className="cs-modal-overlay" />
				<Dialog.Content className={`cs-modal${step === "preview" ? " cs-modal--wide" : ""}`} aria-describedby={undefined}>
					{step === "page" && (
						<>
							<Dialog.Title className="cs-modal-title">Select a Page:</Dialog.Title>
							<select
								className="cs-select cs-modal-select"
								value={selectedPageId}
								autoFocus
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
								<button type="button" className="cs-modal-button" onClick={onClose}>
									Cancel
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
							<Dialog.Title className="cs-modal-title">Select a card from {sourcePage?.name || "that page"}:</Dialog.Title>
							<select
								className="cs-select cs-modal-select"
								value={selectedCardId}
								autoFocus
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
							<Dialog.Title className="cs-modal-title">Add “{previewCard.title}” to this page?</Dialog.Title>
							<p className="cs-builder-hint">
								This is the same card, not a copy — its values stay shared everywhere it appears. Only the
								arrangement of its modules can differ per page.
							</p>
							<div className="cs-modal-preview">
								<SheetPreviewProvider sheet={sheet}>
									<CardPreview card={previewCard} />
								</SheetPreviewProvider>
							</div>
							<div className="cs-modal-actions">
								<button type="button" className="cs-modal-button" onClick={onClose}>
									Nevermind
								</button>
								<button type="button" className="cs-modal-button cs-modal-button--primary" onClick={handleConfirmInsert}>
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

export default function NewCardPicker({ onStartCustomCard, getPageColumns, onCardAdded }) {
	const { sheet, dispatch } = useCharacterSheet();
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [activeIndex, setActiveIndex] = useState(0);
	const [inserting, setInserting] = useState(false);
	const wrapRef = useRef(null);
	const buttonRef = useRef(null);
	const inputRef = useRef(null);
	const listId = useId();

	const options = useMemo(() => CARD_TYPE_OPTIONS.filter((option) => matches(option.label, query)), [query]);
	const optionId = (index) => `${listId}-option-${index}`;

	const firstAvailable = (list, from = 0, step = 1) => {
		for (let offset = 0; offset < list.length; offset += 1) {
			const index = (from + step * offset + list.length * list.length) % list.length;
			if (list[index].available) {
				return index;
			}
		}
		return -1;
	};

	// Typing re-targets the first card that can actually be added.
	useEffect(() => {
		setActiveIndex(firstAvailable(options));
	}, [options]);

	const close = ({ refocus = false } = {}) => {
		setOpen(false);
		setQuery("");
		if (refocus) {
			buttonRef.current?.focus();
		}
	};

	useEffect(() => {
		if (open) {
			inputRef.current?.focus();
		}
	}, [open]);

	// "N" opens the picker from anywhere on the sheet (never while typing).
	useEffect(() => {
		const onKey = (event) => {
			if (
				event.key.toLowerCase() === "n" &&
				!event.ctrlKey &&
				!event.metaKey &&
				!event.altKey &&
				!isTypingTarget(document.activeElement) &&
				!document.querySelector(".cs-modal, .cs-menu")
			) {
				event.preventDefault();
				setOpen(true);
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);

	useEffect(() => {
		if (!open) {
			return undefined;
		}
		const onPointerDown = (event) => {
			if (!wrapRef.current?.contains(event.target)) {
				close();
			}
		};
		document.addEventListener("pointerdown", onPointerDown, true);
		return () => document.removeEventListener("pointerdown", onPointerDown, true);
	}, [open]);

	const choose = (option) => {
		if (!option?.available) {
			return;
		}
		close();
		if (option.id === "custom") {
			onStartCustomCard();
			return;
		}
		if (option.id === "insertExisting") {
			setInserting(true);
			return;
		}
		const card = createStandardCard(option.id, sheet);
		if (card) {
			dispatch({ type: "addCardToPage", pageId: sheet.activePageId, card, maxCols: getPageColumns() });
			onCardAdded(card.id);
		}
	};

	const onKeyDown = (event) => {
		if (event.key === "ArrowDown" || event.key === "ArrowUp") {
			event.preventDefault();
			const step = event.key === "ArrowDown" ? 1 : -1;
			setActiveIndex((current) => firstAvailable(options, current + step, step));
		} else if (event.key === "Home" || event.key === "End") {
			event.preventDefault();
			setActiveIndex(event.key === "Home" ? firstAvailable(options) : firstAvailable(options, options.length - 1, -1));
		} else if (event.key === "Enter") {
			event.preventDefault();
			choose(options[activeIndex]);
		} else if (event.key === "Escape") {
			event.preventDefault();
			close({ refocus: true });
		}
		event.stopPropagation();
	};

	useEffect(() => {
		document.getElementById(optionId(activeIndex))?.scrollIntoView({ block: "nearest" });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [activeIndex]);

	return (
		<div className="cs-newcard" ref={wrapRef}>
			<button
				ref={buttonRef}
				type="button"
				className="cs-topbar-button cs-topbar-button--primary cs-topbar-button--icon-text"
				aria-haspopup="listbox"
				aria-expanded={open}
				title="New Card (N)"
				onClick={() => (open ? close() : setOpen(true))}
			>
				<PlusIcon />
				New Card
			</button>
			{open ? (
				<div className="cs-newcard-popover">
					<div className="cs-newcard-search">
						<SearchIcon />
						<input
							ref={inputRef}
							type="text"
							role="combobox"
							aria-label="Search card types"
							aria-expanded="true"
							aria-controls={listId}
							aria-autocomplete="list"
							aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
							placeholder="Search cards…"
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							onKeyDown={onKeyDown}
						/>
					</div>
					<ul id={listId} role="listbox" aria-label="Card types" className="cs-newcard-list">
						{options.map((option, index) => (
							<li
								key={option.id}
								id={optionId(index)}
								role="option"
								aria-selected={index === activeIndex}
								aria-disabled={option.available ? undefined : "true"}
								className={`cs-newcard-option${index === activeIndex ? " cs-newcard-option--active" : ""}${
									option.available ? "" : " cs-newcard-option--disabled"
								}`}
								onPointerDown={(event) => event.preventDefault()}
								onPointerEnter={() => option.available && setActiveIndex(index)}
								onClick={() => choose(option)}
							>
								{option.label}
								{option.available ? null : <span className="cs-newcard-soon">coming soon</span>}
							</li>
						))}
					</ul>
					{options.length === 0 ? <p className="cs-newcard-empty">No card types match “{query}”.</p> : null}
				</div>
			) : null}
			{inserting ? (
				<InsertExistingDialog onClose={() => setInserting(false)} onInserted={onCardAdded} getPageColumns={getPageColumns} />
			) : null}
		</div>
	);
}
