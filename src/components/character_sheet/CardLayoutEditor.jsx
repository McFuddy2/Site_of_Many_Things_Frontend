import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ModuleView, cardHeaderStyle } from "./CharacterSheetCard";
import { useCharacterSheet } from "./CharacterSheetContext";
import useLayoutCanvas from "./canvas/useLayoutCanvas";
import LayoutCanvas from "./canvas/LayoutCanvas";
import PrecisionPanel from "./canvas/PrecisionPanel";
import { canDeleteCard } from "../../utils/character_sheet/references";
import { countCardPlacements } from "../../utils/character_sheet/sheetOps";
import { rectToPx, fitCardSize } from "../../utils/character_sheet/grid";
import { getModuleSizing } from "../../utils/character_sheet/moduleTypes";
import { GRID_UNIT, CARD_CHROME_W, CARD_CHROME_H } from "../../utils/character_sheet/layoutConstants";
import { RESIZE_HANDLES, resizeRect } from "../../utils/character_sheet/snapping";

// Per-card layout editing (the "Edit Layout" flow, opened from a card's
// header or its ⋮). Modules get direct manipulation — select, move, resize
// from 8 handles, multi-select, align/distribute, alignment guides — via the
// shared useLayoutCanvas hook, which works in px: the editor hands it each
// module's grid cells scaled to px (unit * GRID_UNIT) and rounds back to
// whole units on Confirm, so everything still lands on the grid.
//
// The card's own handles resize the card itself (never below its modules'
// bounding box); modules keep their size. All changes happen on a draft;
// Confirm commits through the reducer, Exit without Saving drops it.

const unitToPxRect = (rect) => ({
	x: rect.x * GRID_UNIT,
	y: rect.y * GRID_UNIT,
	width: rect.w * GRID_UNIT,
	height: rect.h * GRID_UNIT,
});

const pxToUnitRect = (rect) => {
	const x = Math.max(0, Math.round(rect.x / GRID_UNIT));
	const y = Math.max(0, Math.round(rect.y / GRID_UNIT));
	return {
		x,
		y,
		w: Math.max(1, Math.round((rect.x + rect.width) / GRID_UNIT) - x),
		h: Math.max(1, Math.round((rect.y + rect.height) / GRID_UNIT) - y),
	};
};

export default function CardLayoutEditor({ pageId, layout, card, onClose, showGrid, onNavigateToCard }) {
	const { sheet, dispatch } = useCharacterSheet();

	// A module can't be dragged below its type's minimum (see moduleTypes.js).
	const minSizeFor = useCallback(
		(moduleId, candidateWidth) => {
			const module = card.modules[moduleId];
			const w = candidateWidth ? Math.max(1, Math.round(candidateWidth / GRID_UNIT)) : undefined;
			const sizing = getModuleSizing(module, w);
			return { width: sizing.minW * GRID_UNIT, height: getModuleSizing(module, Math.max(w || 0, sizing.minW)).minH * GRID_UNIT };
		},
		[card]
	);

	const initialRects = useMemo(
		() => Object.fromEntries(Object.entries(layout.moduleRects || {}).map(([id, rect]) => [id, unitToPxRect(rect)])),
		[layout.moduleRects]
	);

	// A module is part of this layout exactly when it has a rect, so removing
	// one is just dropping its rect — which keeps removals on the canvas's own
	// undo stack.
	const canvas = useLayoutCanvas({ initialRects, minSize: minSizeFor, gridSize: GRID_UNIT });

	const moduleIds = useMemo(
		() => layout.moduleOrder.filter((moduleId) => card.modules[moduleId] && canvas.rects[moduleId]),
		[layout.moduleOrder, card.modules, canvas.rects]
	);

	const unitModuleRects = useMemo(
		() => Object.fromEntries(moduleIds.map((moduleId) => [moduleId, pxToUnitRect(canvas.rects[moduleId])])),
		[moduleIds, canvas.rects]
	);

	// The card's draft rect (units): its own position/size, grown live to fit
	// whatever the modules currently need.
	const [cardDraft, setCardDraft] = useState({ x: layout.x, y: layout.y, w: layout.w, h: layout.h });
	const fit = fitCardSize(card.title, unitModuleRects);
	const cardRect = { ...cardDraft, w: Math.max(cardDraft.w, fit.w), h: Math.max(cardDraft.h, fit.h) };
	const cardBox = rectToPx(cardRect);
	const gridWidth = (cardRect.w - CARD_CHROME_W) * GRID_UNIT;
	const gridHeight = (cardRect.h - CARD_CHROME_H) * GRID_UNIT;

	// null | "confirm" | "blocked" | "confirmRemove" — which delete dialog (if any) is open.
	const [deleteDialog, setDeleteDialog] = useState(null);
	const [colorPanelOpen, setColorPanelOpen] = useState(false);
	// More than one page layout points at this card's data, so "Delete" here
	// should only ever detach this one placement.
	const hasOtherCopies = countCardPlacements(sheet, card.id) > 1;

	// Which side of the card the floating toolbar docks to: whichever side has
	// more room in the viewport.
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
	}, [cardBox.left, cardBox.width]);

	const handleRemove = (moduleId) => {
		const { [moduleId]: removed, ...rest } = canvas.rects;
		canvas.commitRects(rest);
	};

	// The card's own resize handles: change the card's cells (snapped to whole
	// units, never below its modules' fit), leaving the modules alone.
	const beginCardResize = useCallback(
		(handle) => (event) => {
			if (event.button !== 0) {
				return;
			}
			event.preventDefault();
			event.stopPropagation();
			const target = event.currentTarget;
			const pointerId = event.pointerId;
			try {
				target.setPointerCapture(pointerId);
			} catch {
				// Pointer already released; nothing to capture.
			}
			const start = { x: event.clientX, y: event.clientY };
			const startRect = unitToPxRect(cardRect);
			const minPx = { minWidth: fit.w * GRID_UNIT, minHeight: fit.h * GRID_UNIT };

			const resolve = (moveEvent) => {
				const next = resizeRect(startRect, handle, { dx: moveEvent.clientX - start.x, dy: moveEvent.clientY - start.y }, minPx);
				return pxToUnitRect(next);
			};
			const handleMove = (moveEvent) => setCardDraft(resolve(moveEvent));
			const handleUp = (upEvent) => {
				target.removeEventListener("pointermove", handleMove);
				target.removeEventListener("pointerup", handleUp);
				try {
					target.releasePointerCapture(pointerId);
				} catch {
					// Already released.
				}
				setCardDraft(resolve(upEvent));
			};
			target.addEventListener("pointermove", handleMove);
			target.addEventListener("pointerup", handleUp);
		},
		[cardRect, fit.w, fit.h]
	);

	const handleConfirm = () => {
		dispatch({
			type: "setCardArrangement",
			pageId,
			layoutId: layout.id,
			moduleOrder: moduleIds,
			moduleRects: unitModuleRects,
			cardRect,
		});
		onClose();
	};

	const referencedBy = deleteDialog === "blocked" ? canDeleteCard(sheet, card.id).referencedBy : [];

	const handleDeleteClick = () => {
		if (hasOtherCopies) {
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

	const moduleColor = card.moduleOrder.map((id) => card.modules[id]?.color).find(Boolean) || null;

	return (
		<div
			className="cs-layout-editor-wrap"
			style={{ position: "absolute", left: cardBox.left, top: cardBox.top, width: cardBox.width, height: cardBox.height }}
			ref={wrapRef}
		>
			<section className="cs-card cs-card--editing">
				<header className="cs-card-header" style={cardHeaderStyle(card)}>
					<span className="cs-card-title" title={card.title}>
						{card.title}
					</span>
				</header>
				<div className="cs-card-body">
					<LayoutCanvas
						canvas={canvas}
						items={moduleIds}
						className={`cs-module-grid cs-canvas--flush${showGrid ? " cs-canvas--grid" : ""}`}
						style={{ width: gridWidth, height: gridHeight }}
						itemClassName="cs-layout-module-wrap"
						renderItem={(moduleId) => (
							<div className="cs-layout-module-content">
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
				</div>
				{moduleIds.length === 0 && (
					<p className="cs-empty">Every module is removed from this layout. Undo to bring them back.</p>
				)}
			</section>

			{/* The card's own resize handles — on the wrap rather than inside
			    .cs-card, whose overflow: hidden would clip them. */}
			{RESIZE_HANDLES.map((handle) => (
				<div
					key={handle.id}
					className={`cs-handle cs-card-resize-handle cs-handle--${handle.id}`}
					aria-hidden="true"
					style={{ cursor: handle.cursor }}
					onPointerDown={beginCardResize(handle)}
				/>
			))}

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
					<button type="button" className="cs-layout-btn" onClick={() => setColorPanelOpen((open) => !open)}>
						{colorPanelOpen ? "Hide Card Colors" : "Card Colors"}
					</button>
					{colorPanelOpen && (
						<div className="cs-card-color-panel">
							<label className="cs-color-field">
								<span>Header Color</span>
								<input
									type="color"
									className="cs-color-swatch-input"
									value={card.headerColor || "#22385c"}
									onChange={(event) =>
										dispatch({ type: "setCardHeaderColor", cardId: card.id, color: event.target.value })
									}
									aria-label="Card header color"
								/>
							</label>
							{card.headerColor && (
								<button
									type="button"
									className="cs-color-field-reset"
									onClick={() => dispatch({ type: "setCardHeaderColor", cardId: card.id, color: null })}
								>
									Reset Header Color
								</button>
							)}
							<label className="cs-color-field">
								<span>Module Color</span>
								<input
									type="color"
									className="cs-color-swatch-input"
									value={moduleColor || "#5b9bd5"}
									onChange={(event) =>
										dispatch({ type: "setCardModulesColor", cardId: card.id, color: event.target.value })
									}
									aria-label="Module color"
								/>
							</label>
							{moduleColor && (
								<button
									type="button"
									className="cs-color-field-reset"
									onClick={() => dispatch({ type: "setCardModulesColor", cardId: card.id, color: null })}
								>
									Reset Module Colors
								</button>
							)}
						</div>
					)}
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
