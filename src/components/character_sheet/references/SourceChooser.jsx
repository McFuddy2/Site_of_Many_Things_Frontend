import { useEffect, useId, useMemo, useRef, useState } from "react";
import { checkSource, cardsInReadingOrder, VALUE_KINDS, nodeIds } from "../../../utils/character_sheet/engine/engine";
import { pageOfCard } from "../../../utils/character_sheet/engine/describe";
import { isValuePiece } from "../../../utils/character_sheet/moduleTypes";
import { chipText } from "./chips";

// "Choose source": every value on the sheet in one searchable list (an ARIA
// combobox), so a source can be picked without scrolling or hunting — or
// without a mouse. Entries read "Skills › Acrobatics › Modifier", with the
// page first when it isn't this one. Values that can't be used here are
// listed but disabled, with the reason.

function sourceOptions(engine, sheet, targetNode) {
	const options = [];
	for (const cardId of cardsInReadingOrder(sheet)) {
		const card = sheet.cards[cardId];
		const page = pageOfCard(sheet, cardId);
		const prefix = page && page.id !== sheet.activePageId ? `${page.name} › ` : "";
		for (const moduleId of card.moduleOrder) {
			const module = card.modules[moduleId];
			if (!module) {
				continue;
			}
			const moduleLabel = module.label || "Untitled";
			const add = (key, src, tail, value) =>
				options.push({ key, src, label: `${prefix}${card.title} › ${moduleLabel}${tail}`, value, reason: checkSource(engine, targetNode, src) });
			for (const pieceId of module.pieceOrder) {
				const piece = module.pieces[pieceId];
				if (!piece || !VALUE_KINDS.has(piece.kind) || !isValuePiece(module, piece)) {
					continue;
				}
				const tail = piece.label && piece.label !== moduleLabel ? ` › ${piece.label}` : "";
				add(pieceId, { piece: pieceId }, tail, chipText(engine.values.get(nodeIds.piece(pieceId))));
			}
			if (module.type === "checkboxRow") {
				add(`${moduleId}:checked`, { module: moduleId, field: "checked" }, " › Checked", chipText(engine.values.get(nodeIds.checked(moduleId))));
			}
		}
	}
	return options;
}

function matches(label, query) {
	const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
	const text = label.toLowerCase();
	return words.every((word) => text.includes(word));
}

export default function SourceChooser({ engine, sheet, targetNode, onChoose, onClose }) {
	const listId = useId();
	const inputRef = useRef(null);
	const listRef = useRef(null);
	const [query, setQuery] = useState("");
	const [active, setActive] = useState(0);
	const options = useMemo(() => sourceOptions(engine, sheet, targetNode), [engine, sheet, targetNode]);
	const shown = options.filter((option) => matches(option.label, query));
	const current = shown[Math.min(active, shown.length - 1)];

	useEffect(() => inputRef.current?.focus(), []);
	useEffect(() => {
		listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
	}, [active, query]);

	const choose = (option) => {
		if (option && !option.reason) {
			onChoose(option.src);
		}
	};

	return (
		<div className="cs-ref-chooser">
			<input
				ref={inputRef}
				type="text"
				className="cs-ref-chooser-input"
				role="combobox"
				aria-expanded="true"
				aria-controls={listId}
				aria-activedescendant={current ? `${listId}-${current.key}` : undefined}
				aria-label="Search the sheet for a source"
				placeholder="Search: Dexterity, Acrobatics, Level…"
				value={query}
				onChange={(event) => {
					setQuery(event.target.value);
					setActive(0);
				}}
				onKeyDown={(event) => {
					if (event.key === "ArrowDown") {
						event.preventDefault();
						setActive((index) => Math.min(index + 1, shown.length - 1));
					} else if (event.key === "ArrowUp") {
						event.preventDefault();
						setActive((index) => Math.max(index - 1, 0));
					} else if (event.key === "Enter") {
						event.preventDefault();
						choose(current);
					} else if (event.key === "Escape") {
						event.preventDefault();
						event.stopPropagation();
						onClose();
					}
				}}
			/>
			<ul ref={listRef} id={listId} className="cs-ref-chooser-list" role="listbox" aria-label="Sources">
				{shown.length === 0 ? <li className="cs-ref-chooser-empty">Nothing on the sheet matches.</li> : null}
				{shown.map((option, index) => (
					<li
						key={option.key}
						id={`${listId}-${option.key}`}
						role="option"
						aria-selected={option === current}
						aria-disabled={option.reason ? "true" : undefined}
						className={`cs-ref-chooser-option${option === current ? " cs-ref-chooser-option--active" : ""}`}
						title={option.reason || undefined}
						onMouseEnter={() => setActive(index)}
						onMouseDown={(event) => event.preventDefault()}
						onClick={() => choose(option)}
					>
						<span className="cs-ref-chooser-label">{option.label}</span>
						<span className="cs-ref-chooser-value">{option.reason ? option.reason : option.value}</span>
					</li>
				))}
			</ul>
		</div>
	);
}
