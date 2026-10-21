import { useLayoutEffect, useRef, useState } from "react";
import { CardFace } from "./CharacterSheetCard";
import { useCharacterSheet } from "./CharacterSheetContext";
import { rectToPx, boundingSize } from "../../utils/character_sheet/grid";
import { GRID_UNIT } from "../../utils/character_sheet/layoutConstants";

// The sheet below desktop width (see useViewMode): view and play only. Every
// value works — typing, checkboxes, +/−, Damage/Heal — but there are no
// handles, toolbar, menus or paint mode, and nothing can be moved.
//
//   tablet  the desktop layout exactly as designed, scaled down to fit the
//           width — but never below TABLET_MIN_SCALE, so text stays
//           legible; past that, the sheet scrolls sideways instead.
//   phone   one column of full-width cards in reading order (by y, then x),
//           each card's modules reflowed into wrapping rows (see FlowModules).

const TABLET_MIN_SCALE = 0.75;

const readingOrder = (a, b) => a.y - b.y || a.x - b.x;

function ScaledSheet({ sheet, layouts }) {
	const wrapRef = useRef(null);
	const [width, setWidth] = useState(0);

	useLayoutEffect(() => {
		const wrap = wrapRef.current;
		if (!wrap) {
			return undefined;
		}
		setWidth(wrap.clientWidth);
		const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
		observer.observe(wrap);
		return () => observer.disconnect();
	}, []);

	const { cols, rows } = boundingSize(layouts);
	const contentWidth = cols * GRID_UNIT;
	const contentHeight = rows * GRID_UNIT;
	const scale = width && contentWidth ? Math.min(1, Math.max(TABLET_MIN_SCALE, width / contentWidth)) : 1;

	return (
		<div ref={wrapRef} className="cs-scaled-wrap">
			<div style={{ position: "relative", width: contentWidth * scale, height: contentHeight * scale }}>
				<div
					className="cs-scaled-sheet"
					style={{ width: contentWidth, height: contentHeight, transform: `scale(${scale})` }}
				>
					{layouts.map((layout) => {
						const card = sheet.cards[layout.cardId];
						if (!card) {
							return null;
						}
						const box = rectToPx(layout);
						return (
							<CardFace
								key={layout.id}
								card={card}
								layout={layout}
								cardId={card.id}
								style={{ position: "absolute", left: box.left, top: box.top, width: box.width, height: box.height }}
							/>
						);
					})}
				</div>
			</div>
		</div>
	);
}

export default function SheetViewer({ mode }) {
	const { sheet } = useCharacterSheet();
	const page = sheet.pages.find((existing) => existing.id === sheet.activePageId) || sheet.pages[0];
	const layouts = page.cardLayouts;

	if (!layouts.length) {
		return <p className="cs-empty">This page is empty. Cards are added and arranged on a computer.</p>;
	}
	if (mode === "phone") {
		return (
			<div className="cs-flow-sheet">
				{[...layouts].sort(readingOrder).map((layout) => {
					const card = sheet.cards[layout.cardId];
					return card ? (
						<CardFace key={layout.id} card={card} layout={layout} cardId={card.id} className="cs-card--flow" flow />
					) : null;
				})}
			</div>
		);
	}
	return <ScaledSheet sheet={sheet} layouts={layouts} />;
}
