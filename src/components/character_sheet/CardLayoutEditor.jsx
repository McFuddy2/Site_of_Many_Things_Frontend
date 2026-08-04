import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ModuleView, cardHeaderStyle, cardBodyProps } from "./CharacterSheetCard";
import { useCharacterSheet } from "./CharacterSheetContext";
import useLayoutCanvas from "./canvas/useLayoutCanvas";
import LayoutCanvas from "./canvas/LayoutCanvas";
import PrecisionPanel from "./canvas/PrecisionPanel";
import { canDeleteCard } from "../../utils/character_sheet/references";
import { countCardPlacements, fitCardSize, scaleModulesToContent } from "../../utils/character_sheet/sheetOps";
import { GRID_SIZE, snap } from "../../utils/character_sheet/grid";
import { RESIZE_HANDLES, resizeRect } from "../../utils/character_sheet/snapping";
import {
	getModuleContentScale,
	getModuleMinSize,
	getMinHeaderWidth,
	CARD_MIN_HEIGHT,
	CARD_HEADER_HEIGHT,
	CARD_BORDER_WIDTH,
} from "../../utils/character_sheet/layoutConstants";

// Per-card layout editing (the mockup's "Edit Layout" flow, reached either by
// clicking the card's header or its "Edit Layout" button — see
// CharacterSheetCard). Modules get the same direct-manipulation model as
// before — select, move, resize from 8 handles, multi-select, align/
// distribute, alignment guides — via the shared useLayoutCanvas hook.
//
// The card itself is also directly resizable now, from its own 8 handles
// (beginCardResize below, outside useLayoutCanvas since the card isn't one of
// its tracked items): dragging one rescales every module to fill the new
// size, keeping their relative layout (see scaleModulesToContent). Whichever
// direction it goes — the user resizing the card, or the user rearranging
// modules until the group's bounding box changes — the card is always
// refitted live to exactly GRID_SIZE of margin around its modules (see
// fitCardSize), growing or shrinking as needed. There's no independent
// "manual card size" to fall out of sync with: the card's size *is* the fit.
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

	const activeModuleRects = useMemo(
		() => Object.fromEntries(moduleIds.map((moduleId) => [moduleId, canvas.rects[moduleId]])),
		[moduleIds, canvas.rects]
	);

	// The card's own size is never stored independently — it's always exactly
	// this fit (see fitCardSize), whether that's because modules were dragged
	// bigger/smaller or the card's own handles were (see beginCardResize,
	// which rescales the modules to match instead of the other way around).
	const cardFit = fitCardSize(card, activeModuleRects);
	const bodyWidth = cardFit.width - CARD_BORDER_WIDTH;
	const bodyHeight = cardFit.height - CARD_HEADER_HEIGHT - CARD_BORDER_WIDTH;

	// null | "confirm" | "blocked" | "confirmRemove" — which delete dialog (if any) is open.
	const [deleteDialog, setDeleteDialog] = useState(null);
	const [colorPanelOpen, setColorPanelOpen] = useState(false);
	// More than one page layout points at this card's data, so "Delete" here
	// should only ever detach this one placement — the card's data and its
	// other copies are never touched (see countCardPlacements).
	const hasOtherCopies = countCardPlacements(sheet, card.id) > 1;

	// Dragging the card's own nw/n/w/… handles can shift its origin as well as
	// its size (see resizeRect) — this is that shift, relative to the layout's
	// stored rect. Purely a draft value: Confirm folds it into the stored rect
	// via rectOffset, Exit without Saving just lets it evaporate.
	const [cardOffset, setCardOffset] = useState({ x: 0, y: 0 });
	const cardOffsetRef = useRef(cardOffset);
	cardOffsetRef.current = cardOffset;

	const wrapLeft = (itemStyle.left || 0) + cardOffset.x;
	const wrapTop = (itemStyle.top || 0) + cardOffset.y;

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
	}, [wrapLeft, cardFit.width]);

	const handleRemove = (moduleId) => {
		const { [moduleId]: removed, ...rest } = canvas.rects;
		canvas.commitRects(rest);
	};

	// Dragging one of the card's own resize handles: rescales every module to
	// fill the resulting content box (see scaleModulesToContent), so the card
	// following your gesture is exactly what "resizing the card" needs to mean
	// once its size can no longer be set independently of its modules.
	// Rescales from the gesture's *starting* rects every frame (not the
	// previous frame's result), so repeated scaling never compounds rounding
	// drift the way accumulating deltas would.
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

			const startModuleRects = activeModuleRects;
			const startOffset = cardOffsetRef.current;
			const startCardRect = { x: 0, y: 0, width: cardFit.width, height: cardFit.height };
			const start = { x: event.clientX, y: event.clientY };
			const minWidth = snap(getMinHeaderWidth(card.title));
			const minHeight = CARD_MIN_HEIGHT;

			const resolve = (dx, dy) => {
				const nextCardRect = resizeRect(startCardRect, handle, { dx, dy }, { minWidth, minHeight });
				const targetWidth = nextCardRect.width - CARD_BORDER_WIDTH - GRID_SIZE * 2;
				const targetHeight = nextCardRect.height - CARD_HEADER_HEIGHT - CARD_BORDER_WIDTH - GRID_SIZE * 2;
				const scaled = scaleModulesToContent(startModuleRects, card.modules, targetWidth, targetHeight);
				const pageX = Math.max(0, (itemStyle.left || 0) + startOffset.x + nextCardRect.x);
				const pageY = Math.max(0, (itemStyle.top || 0) + startOffset.y + nextCardRect.y);
				const offset = { x: pageX - (itemStyle.left || 0), y: pageY - (itemStyle.top || 0) };
				return { scaled, offset };
			};

			const handleMove = (moveEvent) => {
				const { scaled, offset } = resolve(moveEvent.clientX - start.x, moveEvent.clientY - start.y);
				canvas.setRects(scaled);
				setCardOffset(offset);
			};

			const handleUp = (upEvent) => {
				target.removeEventListener("pointermove", handleMove);
				target.removeEventListener("pointerup", handleUp);
				try {
					target.releasePointerCapture(pointerId);
				} catch {
					// Already released.
				}
				const { scaled, offset } = resolve(upEvent.clientX - start.x, upEvent.clientY - start.y);
				// commitRectsFrom (not commitRects): by now canvas.rects is the
				// last live-preview frame, not the state from before this resize
				// started — the snapshot Undo actually needs to land on.
				canvas.commitRectsFrom(startModuleRects, scaled);
				setCardOffset(offset);
			};

			target.addEventListener("pointermove", handleMove);
			target.addEventListener("pointerup", handleUp);
		},
		[activeModuleRects, cardFit.width, cardFit.height, card, canvas, itemStyle.left, itemStyle.top]
	);

	const handleConfirm = () => {
		dispatch({
			type: "setCardArrangement",
			pageId,
			layoutId: layout.id,
			moduleOrder: moduleIds,
			moduleRects: canvas.rects,
			rectOffset: cardOffset,
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

	const bodyProps = cardBodyProps(card, `cs-card-body cs-canvas--flush${showGrid ? " cs-canvas--grid" : ""}`);

	return (
		<div
			className="cs-layout-editor-wrap"
			style={{ position: "absolute", left: wrapLeft, top: wrapTop, width: cardFit.width }}
			ref={wrapRef}
		>
			<section className="cs-card cs-card--editing">
				<header className="cs-card-header" style={cardHeaderStyle(card)}>
					<span>{card.title}</span>
					<span className="cs-card-header-note">Editing Layout</span>
				</header>
				<LayoutCanvas
					canvas={canvas}
					items={moduleIds}
					className={bodyProps.className}
					style={{ height: bodyHeight, width: bodyWidth, ...bodyProps.style }}
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

			{/* The card's own resize handles — sit on the wrap (which is sized to
			    match the card exactly, see the width/height above) rather than
			    inside .cs-card, whose overflow:hidden would clip them. */}
			{RESIZE_HANDLES.map((handle) => (
				<div
					key={handle.id}
					className={`cs-handle cs-card-resize-handle cs-handle--${handle.id}`}
					aria-hidden="true"
					style={{ cursor: handle.cursor }}
					onPointerDown={beginCardResize(handle)}
				/>
			))}

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
								<span>Module Background</span>
								<input
									type="color"
									className="cs-color-swatch-input"
									value={card.moduleBgColor || "#d7e6f7"}
									onChange={(event) =>
										dispatch({ type: "setCardModuleColor", cardId: card.id, color: event.target.value })
									}
									aria-label="Module background color"
								/>
							</label>
							{card.moduleBgColor && (
								<button
									type="button"
									className="cs-color-field-reset"
									onClick={() => dispatch({ type: "setCardModuleColor", cardId: card.id, color: null })}
								>
									Reset Module Background
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
