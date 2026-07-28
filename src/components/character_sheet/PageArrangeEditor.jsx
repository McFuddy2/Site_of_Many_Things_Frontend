import { useCallback } from "react";
import { ModuleView, moduleSlotProps } from "./CharacterSheetCard";
import { useCharacterSheet } from "./CharacterSheetContext";
import useLayoutCanvas from "./canvas/useLayoutCanvas";
import LayoutCanvas from "./canvas/LayoutCanvas";
import PrecisionPanel from "./canvas/PrecisionPanel";
import { boundingHeight } from "../../utils/character_sheet/grid";
import { fitCardToModules } from "../../utils/character_sheet/sheetOps";
import {
	CARD_MIN_WIDTH,
	CARD_MIN_HEIGHT,
	CARD_HEADER_WRAPPED_LINE_HEIGHT,
	getMinHeaderWidth,
} from "../../utils/character_sheet/layoutConstants";

// Page-level "Arrange Cards" mode: select, move, and resize whole cards
// anywhere on the page canvas. Cards may overlap freely (z-order decides what
// reads on top) — alignment guides and snapping are what keep the page tidy,
// not a collision rule. All of the interaction lives in useLayoutCanvas; this
// file only decides what a card looks like and what Confirm commits.
// Card values are display-only while arranging.

// Keeps some empty canvas below the cards so there's always somewhere to start
// a marquee selection.
const MIN_CANVAS_HEIGHT = 420;

function ArrangeCardFace({ layout, card }) {
	const moduleIds = layout.moduleOrder.filter((moduleId) => card.modules[moduleId] && layout.moduleRects?.[moduleId]);
	return (
		<section className="cs-card cs-arrange-card">
			<header className="cs-card-header">
				<span>{card.title}</span>
				<span className="cs-card-header-note">Drag to move</span>
			</header>
			<div className="cs-card-body cs-arrange-card-body">
				{moduleIds.map((moduleId) => {
					const slot = moduleSlotProps(layout.moduleRects[moduleId], card.modules[moduleId].type);
					return (
						<div key={moduleId} className={slot.className} style={slot.style}>
							<ModuleView module={card.modules[moduleId]} />
						</div>
					);
				})}
			</div>
		</section>
	);
}

export default function PageArrangeEditor({ page, onClose, showGrid }) {
	const { sheet, dispatch } = useCharacterSheet();

	// Never let a card be resized smaller than the modules it's showing — the
	// other half of "modules are always visible without scrolling" (the first
	// half being the card growing to fit them on save; see
	// setCardLayoutArrangement). candidateWidth is the width the in-progress
	// resize/edit is heading towards (see useLayoutCanvas) — once that's
	// narrower than the title's safe width, the header is about to wrap to a
	// second line, so the height floor grows to match instead of leaving that
	// line to eat into the body as a scrollbar.
	const minSizeFor = useCallback(
		(layoutId, candidateWidth) => {
			const layout = page.cardLayouts.find((existing) => existing.id === layoutId);
			const card = layout && sheet.cards[layout.cardId];
			if (!card) {
				return { width: CARD_MIN_WIDTH, height: CARD_MIN_HEIGHT };
			}
			const fit = fitCardToModules(card, layout.moduleRects || {});
			const width = Math.max(CARD_MIN_WIDTH, fit.width);
			const effectiveWidth = candidateWidth ?? layout.rect.width;
			const headerWraps = effectiveWidth < getMinHeaderWidth(card.title);
			const height = Math.max(CARD_MIN_HEIGHT, fit.height) + (headerWraps ? CARD_HEADER_WRAPPED_LINE_HEIGHT : 0);
			return { width, height };
		},
		[page, sheet]
	);

	const canvas = useLayoutCanvas({
		initialRects: Object.fromEntries(page.cardLayouts.map((layout) => [layout.id, layout.rect])),
		minSize: minSizeFor,
	});

	const handleConfirm = () => {
		dispatch({ type: "setPageArrangement", pageId: page.id, rects: canvas.rects });
		onClose();
	};

	const canvasHeight = Math.max(MIN_CANVAS_HEIGHT, boundingHeight(Object.values(canvas.rects), 40));

	return (
		<div className="cs-arrange">
			<div className="cs-arrange-controls">
				<div className="cs-layout-controls-group">
					<span className="cs-arrange-title">Arranging {page.name}</span>
					<button type="button" className="cs-layout-btn" onClick={canvas.undo} disabled={!canvas.canUndo}>
						Undo
					</button>
					<button type="button" className="cs-layout-btn" onClick={canvas.redo} disabled={!canvas.canRedo}>
						Redo
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
			</div>

			<PrecisionPanel canvas={canvas} label="Card" />

			<div className="cs-arrange-body">
				{page.cardLayouts.length === 0 ? (
					<p className="cs-empty">This page has no cards to arrange.</p>
				) : (
					<LayoutCanvas
						canvas={canvas}
						items={page.cardLayouts.map((layout) => layout.id)}
						className={showGrid ? "cs-canvas--grid" : ""}
						style={{ minHeight: canvasHeight }}
						itemClassName="cs-arrange-card-wrap"
						renderItem={(layoutId) => {
							const layout = page.cardLayouts.find((existing) => existing.id === layoutId);
							const card = layout && sheet.cards[layout.cardId];
							return card ? <ArrangeCardFace layout={layout} card={card} /> : null;
						}}
					/>
				)}
			</div>
		</div>
	);
}
