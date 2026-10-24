import { useMemo, useReducer, useRef, useState } from "react";
import {
	createSheet,
	createCustomCard,
	createTextModule,
	createNumberModule,
	createChipSegment,
	createRule,
	cloneCard,
} from "../utils/character_sheet/schema";
import { createStandardCard } from "../utils/character_sheet/cardDefinitions";
import { addCardToPage, addModuleToCard, setReference, setModuleRules, DEFAULT_PAGE_COLUMNS } from "../utils/character_sheet/sheetOps";
import { historyReducer } from "../utils/character_sheet/sheetReducer";
import { createHistoryState } from "../utils/character_sheet/history";
import { createEngine, moduleReferences, moduleLockState, nodeIds } from "../utils/character_sheet/engine/engine";
import { pieceSrc, roleSrc } from "../utils/character_sheet/engine/expression";
import { describeExpression, describeLocation, pieceName } from "../utils/character_sheet/engine/describe";
import { checkDeletion } from "../utils/character_sheet/references";
import "../CharacterSheetStyles.css";

// DEV-ONLY (routed only when import.meta.env.DEV — see AppRouter). A bench
// for the reference engine with no chip UI: every reference on a small
// sheet, its state and value, and buttons for the moves that matter —
// adding a source card late (pending → linked), deleting one anyway
// (→ missing), duplicating, undo. Typed values are edited in the table.

function findCard(sheet, type) {
	return Object.values(sheet.cards).find((card) => card.type === type) || null;
}

function buildSandboxSheet() {
	let sheet = createSheet("Reference sandbox");
	const pageId = sheet.pages[0].id;
	const add = (card) => {
		sheet = addCardToPage(sheet, pageId, card, { maxCols: DEFAULT_PAGE_COLUMNS });
		return card;
	};
	// Skills and saves first, with no Ability Scores card yet: they start pending.
	add(createStandardCard("skills"));
	add(createStandardCard("savingThrows"));
	const basics = add(createStandardCard("basicInfo"));
	const hitDice = add(createStandardCard("hitDice"));
	const notes = add(createCustomCard("Feature"));
	const levelId = basics.modules[basics.moduleOrder[1]].pieceOrder[0];

	sheet = addModuleToCard(
		sheet,
		notes.id,
		createTextModule("Description", {
			segments: [
				{ type: "text", value: "Gain " },
				createChipSegment(roleSrc("proficiency.bonus"), { origin: "default" }),
				{ type: "text", value: " Temp HP." },
			],
		})
	);
	const gated = createNumberModule("Unlocks at Level 5", 3);
	sheet = addModuleToCard(sheet, notes.id, gated);
	sheet = setModuleRules(sheet, gated.id, [createRule({ left: pieceSrc(levelId), cmp: "<", right: { num: 5 }, effect: "locked" })]);

	const [, totalModule, usedModule] = hitDice.moduleOrder;
	sheet = setReference(sheet, { kind: "capacity", moduleId: usedModule }, pieceSrc(hitDice.modules[totalModule].pieceOrder[0]));
	return sheet;
}

const STATE_CLASS = { linked: "ok", pending: "warn", missing: "bad", unlinked: "muted" };

function show(value) {
	if (value === null || value === undefined) {
		return "—";
	}
	return typeof value === "boolean" ? (value ? "✓" : "✗") : String(value);
}

export default function CharacterSheetReferenceSandboxPage() {
	const [state, dispatch] = useReducer(historyReducer, null, () => createHistoryState(buildSandboxSheet()));
	const { sheet } = state;
	const previous = useRef(null);
	const engine = useMemo(() => {
		previous.current = createEngine(sheet, previous.current);
		return previous.current;
	}, [sheet]);
	const [cardFilter, setCardFilter] = useState("");
	const pageId = sheet.pages[0].id;

	const abilities = findCard(sheet, "abilityScores");
	const addCard = (type) => dispatch({ type: "addCardToPage", pageId, card: createStandardCard(type), maxCols: DEFAULT_PAGE_COLUMNS });

	const references = [];
	for (const card of Object.values(sheet.cards)) {
		for (const moduleId of card.moduleOrder) {
			const module = card.modules[moduleId];
			for (const holder of moduleReferences(module)) {
				references.push({ holder, cardId: card.id, entry: engine.values.get(holder.node) || {} });
			}
			for (const rule of module.rules || []) {
				references.push({ rule, module, cardId: card.id });
			}
		}
	}
	const shown = references.filter((row) => !cardFilter || row.cardId === cardFilter);

	const valuePieces = [];
	for (const card of Object.values(sheet.cards)) {
		if (cardFilter && card.id !== cardFilter) {
			continue;
		}
		for (const moduleId of card.moduleOrder) {
			const module = card.modules[moduleId];
			for (const pieceId of module.pieceOrder) {
				const piece = module.pieces[pieceId];
				if (["variable", "checkbox", "tristate"].includes(piece?.kind)) {
					valuePieces.push({ card, module, piece, entry: engine.values.get(nodeIds.piece(pieceId)) || {} });
				}
			}
		}
	}

	const deleteAbilities = () => {
		const check = checkDeletion(sheet, { cardIds: [abilities.id] });
		const ok = window.confirm(
			check.ok ? "Delete Ability Scores?" : `These use it:\n${check.dependents.map((d) => `• ${d.label}`).join("\n")}\n\nDelete anyway?`
		);
		if (ok) {
			dispatch({ type: "deleteCard", cardId: abilities.id, force: true });
		}
	};

	return (
		<div className="cs-page cs-gallery cs-sandbox">
			<header className="cs-gallery-head">
				<h1>Reference engine sandbox (dev only)</h1>
				<p>
					{engine.nodes.size} values in the graph · last change recomputed {engine.recomputed.length}
					{engine.cyclic.size ? ` · ${engine.cyclic.size} in a cycle` : ""}
				</p>
			</header>
			<div className="cs-sandbox-actions">
				<button type="button" className="cs-modal-button" onClick={() => addCard("abilityScores")}>
					Add Ability Scores
				</button>
				<button type="button" className="cs-modal-button" onClick={() => addCard("proficiencyBonus")}>
					Add Proficiency Bonus
				</button>
				<button
					type="button"
					className="cs-modal-button"
					disabled={!abilities}
					onClick={() => {
						const layout = sheet.pages[0].cardLayouts.find((each) => each.cardId === abilities.id);
						dispatch({ type: "duplicateCards", pageId, entries: [{ sourceLayoutId: layout.id, card: cloneCard(abilities) }] });
					}}
				>
					Duplicate Ability Scores
				</button>
				<button type="button" className="cs-modal-button cs-modal-button--danger" disabled={!abilities} onClick={deleteAbilities}>
					Delete Ability Scores…
				</button>
				<button type="button" className="cs-modal-button" disabled={!state.past.length} onClick={() => dispatch({ type: "undo" })}>
					Undo
				</button>
				<button type="button" className="cs-modal-button" disabled={!state.future.length} onClick={() => dispatch({ type: "redo" })}>
					Redo
				</button>
				<select className="cs-select" value={cardFilter} onChange={(event) => setCardFilter(event.target.value)} aria-label="Show card">
					<option value="">All cards</option>
					{Object.values(sheet.cards).map((card) => (
						<option key={card.id} value={card.id}>
							{card.title}
						</option>
					))}
				</select>
			</div>

			<h2 className="cs-gallery-section">References ({shown.length})</h2>
			<table className="cs-sandbox-table">
				<thead>
					<tr>
						<th>Where</th>
						<th>Kind</th>
						<th>State</th>
						<th>Value</th>
						<th>Expression</th>
					</tr>
				</thead>
				<tbody>
					{shown.map((row) =>
						row.rule ? (
							<tr key={row.rule.id}>
								<td>{describeLocation(engine, { moduleId: row.module.id }).path}</td>
								<td>rule → {row.rule.effect}</td>
								<td className={`cs-sandbox-state--${moduleLockState(engine, row.module.id) === "none" ? "ok" : "warn"}`}>
									{moduleLockState(engine, row.module.id)}
								</td>
								<td />
								<td>
									when {describeExpression(engine, row.rule.left)} {row.rule.cmp} {describeExpression(engine, row.rule.right)}
								</td>
							</tr>
						) : (
							<tr key={row.holder.node}>
								<td>{describeLocation(engine, row.holder).path}</td>
								<td>
									{row.holder.kind}
									{row.holder.ref.origin === "default" ? " (default)" : ""}
								</td>
								<td className={`cs-sandbox-state--${STATE_CLASS[row.entry.state] || "muted"}`}>
									{row.entry.state}
									{row.entry.partial ? " (needs more data)" : ""}
								</td>
								<td title={row.entry.error || undefined}>{row.entry.error ? `? ${row.entry.error}` : show(row.entry.value)}</td>
								<td>{describeExpression(engine, row.holder.ref.expr)}</td>
							</tr>
						)
					)}
				</tbody>
			</table>

			<h2 className="cs-gallery-section">Values ({valuePieces.length})</h2>
			<table className="cs-sandbox-table">
				<tbody>
					{valuePieces.map(({ card, module, piece, entry }) => (
						<tr key={piece.id}>
							<td>
								{card.title} › {pieceName(module, piece)}
							</td>
							<td>
								{piece.kind === "checkbox" ? (
									<input
										type="checkbox"
										checked={Boolean(piece.value)}
										onChange={(event) => dispatch({ type: "setPieceValue", pieceId: piece.id, value: event.target.checked })}
									/>
								) : entry.computed ? (
									<span className={`cs-sandbox-state--${STATE_CLASS[entry.state] || "ok"}`}>
										{entry.error ? `? ${entry.error}` : show(entry.value)} ({entry.state})
									</span>
								) : (
									<input
										type="number"
										className="cs-input-number"
										value={piece.value ?? 0}
										onChange={(event) =>
											dispatch({ type: "setPieceValue", pieceId: piece.id, value: event.target.value === "" ? 0 : Number(event.target.value) })
										}
									/>
								)}
							</td>
							<td>{entry.state === "pending" ? "pending — typing here unlinks it" : entry.state === "unlinked" ? "unlinked" : ""}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
