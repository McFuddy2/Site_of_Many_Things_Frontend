import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ModuleView } from "./CharacterSheetCard";
import { useCharacterSheet } from "./CharacterSheetContext";
import useLayoutCanvas from "./canvas/useLayoutCanvas";
import LayoutCanvas from "./canvas/LayoutCanvas";
import PrecisionPanel from "./canvas/PrecisionPanel";
import { canDeleteCard } from "../../utils/character_sheet/references";
import { countCardPlacements } from "../../utils/character_sheet/sheetOps";
import { boundingHeight, boundingWidth, GRID_SIZE } from "../../utils/character_sheet/grid";
import { getModuleContentScale, getModuleMinSize, CARD_BORDER_WIDTH } from "../../utils/character_sheet/layoutConstants";

// Per-card layout editing (the mockup's "Edit Layout" flow). Modules get the
// same direct-manipulation model as cards do in Arrange Cards mode — select,
// move, resize from 8 handles, multi-select, align/distribute, alignment
// guides — via the shared useLayoutCanvas hook.
//
// Modules may be dragged past the card's current edges: the card grows to fit
// them (live here, and for real on Confirm — see setCardLayoutArrangement), so
// rearranging a layout never leaves part of it behind a scrollbar.
//
// All changes happen on a draft; card data is never touched. Confirm commits
// through the reducer, Exit without Saving drops it.

export default function CardLayoutEditor({ pageId, layout, card, onClose, itemStyle, showGrid, onNavigateToCard }) {
	const { sheet, dispatch } = useCharacterSheet();

	// Each module's resize floor depends on its type (see getModuleMinSize): a
	// module can't be dragged below the size at which its content — which scales
	// with the box — is still readable and interactive.
	const minSizeFor = useCallback(
		(moduleId) => getModuleMinSize(card.modules[moduleId]?.type),
		[card]
	);

	// A module is part of this layout exactly when it has a rect, so removing
	// one is just dropping its rect. That keeps membership and geometry in a
	// single piece of state, which in turn means the canvas's undo stack
	// covers removals too — Undo after a remove brings the module back where it
	// was, with no second history to keep in sync.
	const canvas = useLayoutCanvas({
		initialRects: layout.moduleRects || {},
		minSize: minSizeFor,
	});

	const moduleIds = useMemo(
		() => layout.moduleOrder.filter((moduleId) => card.modules[moduleId] && canvas.rects[moduleId]),
		[layout.moduleOrder, card.modules, canvas.rects]
	);

	// null | "confirm" | "blocked" | "confirmRemove" — which delete dialog (if any) is open.
	const [deleteDialog, setDeleteDialog] = useState(null);
	// More than one page layout points at this card's data, so "Delete" here
	// should only ever detach this one placement — the card's data and its
	// other copies are never touched (see countCardPlacements).
	const hasOtherCopies = countCardPlacements(sheet, card.id) > 1;

	// Which side of the card the floating toolbar docks to: whichever side has
	// more room in the viewport, so it reads on-screen instead of running off
	// the edge — a card sitting in the right half of the page gets its
	// toolbar on the left, and vice versa.
	const wrapRef = useRef(null);
	const [toolbarSide, setToolbarSide] = useState("right");
	useLayoutEffect(() => {
		const updateSide = () => {
			const el = wrapRef.current;
			if (!el) {
				return;
			}
			const rect = el.getBoundingClientRect();
			setToolbarSide(rect.left + rect.width / 2 > window.innerWidth / 2 ? "left" : "right");
		};
		updateSide();
		window.addEventListener("resize", updateSide);
		return () => window.removeEventListener("resize", updateSide);
	}, [itemStyle.left, itemStyle.width]);

	const handleRemove = (moduleId) => {
		const { [moduleId]: removed, ...rest } = canvas.rects;
		canvas.commitRects(rest);
	};

	const handleConfirm = () => {
		dispatch({
			type: "setCardArrangement",
			pageId,
			layoutId: layout.id,
			moduleOrder: moduleIds,
			moduleRects: canvas.rects,
		});
		onClose();
	};

	const referencedBy = deleteDialog === "blocked" ? canDeleteCard(sheet, card.id).referencedBy : [];

	const handleDeleteClick = () => {
		if (hasOtherCopies) {
			// Data isn't being touched, just this one placement, so the
			// cross-card reference guard doesn't apply here.
			setDeleteDialog("confirmRemove");
			return;
		}
		setDeleteDialog(canDeleteCard(sheet, card.id).ok ? "confirm" : "blocked");
	};

	const handleConfirmDelete = () => {
		dispatch({ type: "deleteCard", cardId: card.id });
		setDeleteDialog(null);
		onClose();
	};

	const handleConfirmRemove = () => {
		dispatch({ type: "removeCardFromPage", pageId, layoutId: layout.id });
		setDeleteDialog(null);
		onClose();
	};

	// The editing card previews the size it will be saved at: it grows with the
	// modules (never below the width it already has) so what you arrange is
	// exactly what you get after Confirm.
	const placedRects = moduleIds.map((moduleId) => canvas.rects[moduleId]);
	const bodyHeight = boundingHeight(placedRects, GRID_SIZE);
	const bodyWidth = Math.max(
		(itemStyle.width || 0) - CARD_BORDER_WIDTH,
		boundingWidth(placedRects, GRID_SIZE)
	);

	return (
		<div className="cs-layout-editor-wrap" style={{ ...itemStyle, width: bodyWidth + CARD_BORDER_WIDTH }} ref={wrapRef}>
			<section className="cs-card cs-card--editing">
				<header className="cs-card-header">
					<span>{card.title}</span>
					<span className="cs-card-header-note">Editing Layout</span>
				</header>
				<LayoutCanvas
					canvas={canvas}
					items={moduleIds}
					className={`cs-card-body cs-canvas--flush${showGrid ? " cs-canvas--grid" : ""}`}
					style={{ height: bodyHeight, width: bodyWidth }}
					itemClassName="cs-layout-module-wrap cs-module-slot"
					renderItem={(moduleId, { rect }) => (
						<div
							className="cs-layout-module-content"
							style={{ "--cs-scale": getModuleContentScale(rect, card.modules[moduleId].type) }}
						>
							<ModuleView module={card.modules[moduleId]} />
						</div>
					)}
					renderItemOverlay={(moduleId) => (
						<button
							type="button"
							className="cs-layout-remove-x"
							aria-label={`Remove ${card.modules[moduleId].label} from this layout`}
							onClick={() => handleRemove(moduleId)}
						>
							x
						</button>
					)}
				/>
				{moduleIds.length === 0 && (
					<p className="cs-empty">Every module is removed from this layout. Undo to bring them back.</p>
				)}
			</section>

			{/* Docked outside the card's own box (see .cs-layout-editor-wrap) so these
			    controls never affect the card's internal layout, with a z-index high
			    enough to sit on top of a neighboring card if there's no room beside it.
			    Docks to whichever side of the viewport has more room — see toolbarSide. */}
			<footer className={`cs-layout-controls cs-layout-controls--${toolbarSide}`}>
				<PrecisionPanel canvas={canvas} label="Module" />
				<div className="cs-layout-controls-group">
					<button type="button" className="cs-layout-btn" onClick={canvas.undo} disabled={!canvas.canUndo}>
						Undo
					</button>
					<button type="button" className="cs-layout-btn" onClick={canvas.redo} disabled={!canvas.canRedo}>
						Redo
					</button>
					<button type="button" className="cs-layout-btn cs-layout-btn--delete" onClick={handleDeleteClick}>
						{hasOtherCopies ? "Remove from Page" : "Delete Card"}
					</button>
				</div>
				<div className="cs-layout-controls-group">
					<button type="button" className="cs-layout-btn cs-layout-btn--confirm" onClick={handleConfirm}>
						Confirm Layout
					</button>
					<button type="button" className="cs-layout-btn cs-layout-btn--exit" onClick={onClose}>
						Exit without Saving
					</button>
				</div>
			</footer>

			<Dialog.Root open={deleteDialog !== null} onOpenChange={(open) => !open && setDeleteDialog(null)}>
				<Dialog.Portal>
					<Dialog.Overlay className="cs-modal-overlay" />
					<Dialog.Content className="cs-modal" aria-describedby={undefined}>
						{deleteDialog === "confirm" && (
							<>
								<Dialog.Title className="cs-modal-title">Delete “{card.title}”?</Dialog.Title>
								<p className="cs-builder-hint">This permanently deletes the card and its data. This cannot be undone.</p>
								<div className="cs-modal-actions">
									<button type="button" className="cs-modal-button" onClick={() => setDeleteDialog(null)}>
										Cancel
									</button>
									<button
										type="button"
										className="cs-modal-button cs-modal-button--danger"
										onClick={handleConfirmDelete}
									>
										Delete Card
									</button>
								</div>
							</>
						)}
						{deleteDialog === "confirmRemove" && (
							<>
								<Dialog.Title className="cs-modal-title">Remove “{card.title}” From This Page?</Dialog.Title>
								<p className="cs-builder-hint">
									This card also appears elsewhere. Removing it here only removes this copy — its data and
									other placements are unaffected.
								</p>
								<div className="cs-modal-actions">
									<button type="button" className="cs-modal-button" onClick={() => setDeleteDialog(null)}>
										Cancel
									</button>
									<button
										type="button"
										className="cs-modal-button cs-modal-button--danger"
										onClick={handleConfirmRemove}
									>
										Remove from Page
									</button>
								</div>
							</>
						)}
						{deleteDialog === "blocked" && (
							<>
								<Dialog.Title className="cs-modal-title">Can’t Delete “{card.title}” Yet</Dialog.Title>
								<p className="cs-builder-hint">
									Other cards still reference its values. Remove those references first — click a card
									below to open its layout editor.
								</p>
								<ul className="cs-delete-blocked-list">
									{referencedBy.map((entry) => (
										<li key={entry.cardId}>
											<button
												type="button"
												className="cs-modal-button"
												onClick={() => {
													setDeleteDialog(null);
													onNavigateToCard(entry.cardId);
												}}
											>
												{entry.cardTitle}
											</button>
										</li>
									))}
								</ul>
								<div className="cs-modal-actions">
									<button type="button" className="cs-modal-button" onClick={() => setDeleteDialog(null)}>
										Close
									</button>
								</div>
							</>
						)}
					</Dialog.Content>
				</Dialog.Portal>
			</Dialog.Root>
		</div>
	);
}
