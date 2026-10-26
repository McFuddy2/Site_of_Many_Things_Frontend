import * as Dialog from "@radix-ui/react-dialog";
import { useCharacterSheet } from "../CharacterSheetContext";
import { useReferenceUI } from "./useReferenceUI";
import { chipText, chipState } from "./chips";
import { LinkIcon } from "../icons";
import { getTargetReference, targetNode } from "../../../utils/character_sheet/sheetOps";
import { collectSources } from "../../../utils/character_sheet/engine/expression";
import { describeExpression, describeLocation, describeRole } from "../../../utils/character_sheet/engine/describe";
import { tokenCssVars } from "../../../utils/character_sheet/layoutConstants";

// The reference info modal: what a linked value is made of and where each
// part comes from (page, card, module and piece), with Go to source for
// each. On desktop it's also where a link is changed — Edit reference,
// Unlink (keep the current value as a plain one you can then type over) or
// Remove (clear it and its value). Below desktop it's read-only. Esc cancels.

function uniqueSources(expr) {
	const seen = new Set();
	return collectSources(expr).filter((src) => {
		const key = JSON.stringify(src);
		if (seen.has(key)) {
			return false;
		}
		seen.add(key);
		return true;
	});
}

export default function ReferenceInfoDialog({ target, onClose }) {
	const { sheet, engine, dispatch } = useCharacterSheet();
	const ui = useReferenceUI();
	const ref = getTargetReference(sheet, target);
	const entry = engine.values.get(targetNode(target)) || null;
	const host = describeLocation(engine, { pieceId: target.pieceId ?? null, moduleId: target.moduleId ?? null });
	const signed = Boolean(target.pieceId && engine.index.modules[engine.index.pieces[target.pieceId]?.moduleId]?.module.signed);

	if (!ref || !host) {
		return null;
	}
	const sources = uniqueSources(ref.expr);
	const state = chipState(entry);
	const hostElement = () => (target.pieceId ? document.querySelector(`[data-piece-id="${target.pieceId}"]`) : null);
	const act = (type) => {
		dispatch({ type, target });
		onClose();
	};

	return (
		<Dialog.Root open onOpenChange={(open) => !open && onClose()}>
			<Dialog.Portal>
				<Dialog.Overlay className="cs-modal-overlay" />
				<Dialog.Content className="cs-modal cs-modal--wide cs-theme cs-ref-info" style={tokenCssVars()} aria-describedby={undefined} data-ref-ui>
					<Dialog.Title className="cs-modal-title">
						{ref.nickname || "Linked value"} <span className="cs-ref-info-where">in {host.path}</span>
					</Dialog.Title>

					<div className="cs-ref-info-value">
						<span className={`cs-chip cs-chip--big${state ? ` cs-chip--${state}` : ""}`}>
							<LinkIcon />
							<span className="cs-chip-text">{chipText(entry, { signed })}</span>
						</span>
						<span className="cs-ref-info-expr">= {describeExpression(engine, ref.expr)}</span>
					</div>

					{entry?.state === "missing" ? (
						<p className="cs-ref-info-note cs-ref-info-note--bad">
							Its source was deleted, so this shows its last known value. Edit it to link it to something else, or
							Unlink it to type your own.
						</p>
					) : null}
					{entry?.partial ? (
						<p className="cs-ref-info-note cs-ref-info-note--warn">
							Waiting for {(entry.missingRoles || []).map(describeRole).join(", ")} — add the card that has it and this
							fills in by itself.
						</p>
					) : null}
					{entry?.error && !entry.partial ? <p className="cs-ref-info-note cs-ref-info-note--bad">Problem: {entry.error}</p> : null}

					{sources.length ? (
						<div>
							<div className="cs-ref-info-heading">{sources.length === 1 ? "Source" : "Sources"}</div>
							<ul className="cs-ref-info-sources">
								{sources.map((src) => {
									const resolved = engine.resolve(src);
									const where = resolved ? describeLocation(engine, { ...resolved, field: src.field || null }) : null;
									const value = resolved
										? engine.values.get(resolved.pieceId || `${resolved.moduleId}:checked`)
										: null;
									return (
										<li key={JSON.stringify(src)} className="cs-ref-info-source">
											<div className="cs-ref-info-source-text">
												{where ? (
													<>
														<strong>{where.name}</strong>
														<span>
															{where.pageName ? `Page “${where.pageName}” · ` : ""}Card “{where.cardTitle}”
														</span>
													</>
												) : (
													<>
														<strong>{src.role ? describeRole(src.role) : "Missing"}</strong>
														<span>{src.role ? "No card on the sheet has this yet" : "Its source was deleted"}</span>
													</>
												)}
											</div>
											{value ? <span className="cs-ref-info-source-value">{chipText(value)}</span> : null}
											{where ? (
												<button type="button" className="cs-modal-button" onClick={() => ui.goToSource(resolved)}>
													Go to source
												</button>
											) : null}
										</li>
									);
								})}
							</ul>
						</div>
					) : null}

					<div className="cs-modal-actions">
						{ui.editable ? (
							<>
								<button type="button" className="cs-modal-button cs-modal-button--danger" onClick={() => act("removeReference")}>
									Remove
								</button>
								<button type="button" className="cs-modal-button" onClick={() => act("unlinkReference")}>
									Unlink
								</button>
								<span className="cs-modal-actions-spacer" />
								<button type="button" className="cs-modal-button" onClick={onClose}>
									Cancel
								</button>
								<button type="button" className="cs-modal-button cs-modal-button--primary" onClick={() => ui.openEditor(target, hostElement())}>
									Edit reference
								</button>
							</>
						) : (
							<button type="button" className="cs-modal-button cs-modal-button--primary" onClick={onClose}>
								Close
							</button>
						)}
					</div>
					{ui.editable ? null : (
						<p className="cs-popover-hint">Linked values are edited on a desktop or laptop computer.</p>
					)}
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
