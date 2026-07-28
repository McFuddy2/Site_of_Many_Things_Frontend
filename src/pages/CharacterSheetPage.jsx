import { useState } from "react";
import { CharacterSheetProvider, useCharacterSheet } from "../components/character_sheet/CharacterSheetContext";
import CharacterSheetCard from "../components/character_sheet/CharacterSheetCard";
import CardLayoutEditor from "../components/character_sheet/CardLayoutEditor";
import CustomCardBuilder from "../components/character_sheet/CustomCardBuilder";
import PageArrangeEditor from "../components/character_sheet/PageArrangeEditor";
import NewCardModal from "../components/character_sheet/NewCardModal";
import { boundingHeight } from "../utils/character_sheet/grid";
import "../CharacterSheetStyles.css";

function TopBar({ onStartCustomCard, onArrangeCards, showGrid, onToggleGrid }) {
	const { sheet, dispatch } = useCharacterSheet();
	return (
		<div className="cs-topbar">
			<div className="cs-topbar-group">
				<NewCardModal onStartCustomCard={onStartCustomCard} />
				<button type="button" className="cs-topbar-button" onClick={onArrangeCards}>
					Arrange Cards
				</button>
				<button type="button" className="cs-topbar-button" onClick={onToggleGrid}>
					{showGrid ? "Hide Grid" : "Show Grid"}
				</button>
				{/* Present per the mockup; recharge behavior isn't built yet. */}
				<button type="button" className="cs-topbar-button" title="Coming soon">
					Short Rest
				</button>
				<button type="button" className="cs-topbar-button" title="Coming soon">
					Long Rest
				</button>
			</div>
			<div className="cs-topbar-group">
				{sheet.pages.map((page) => (
					<button
						key={page.id}
						type="button"
						className={`cs-page-tab${page.id === sheet.activePageId ? " cs-page-tab--active" : ""}`}
						onClick={() => dispatch({ type: "setActivePage", pageId: page.id })}
					>
						{page.name}
					</button>
				))}
				<button type="button" className="cs-topbar-button" onClick={() => dispatch({ type: "addPage" })}>
					New Page
				</button>
			</div>
		</div>
	);
}

function Canvas({ buildingCustom, onCloseBuilder, arrangingCards, onCloseArrange, showGrid }) {
	const { sheet, dispatch } = useCharacterSheet();
	// Only one card's layout is editable at a time. Switching pages unmounts an
	// open editor, which discards its draft (same as Exit without Saving).
	const [editingLayoutId, setEditingLayoutId] = useState(null);
	const activePage = sheet.pages.find((page) => page.id === sheet.activePageId) || sheet.pages[0];

	// Jumps to and opens the layout editor for another card — used by the
	// delete-blocked dialog's clickable referencing-card list. Picks whichever
	// page that card first appears on, switching pages if needed.
	const handleNavigateToCard = (cardId) => {
		for (const page of sheet.pages) {
			const layout = page.cardLayouts.find((existing) => existing.cardId === cardId);
			if (layout) {
				if (page.id !== sheet.activePageId) {
					dispatch({ type: "setActivePage", pageId: page.id });
				}
				setEditingLayoutId(layout.id);
				return;
			}
		}
	};

	if (arrangingCards) {
		return <PageArrangeEditor key={activePage.id} page={activePage} onClose={onCloseArrange} showGrid={showGrid} />;
	}
	return (
		<>
			{buildingCustom && <CustomCardBuilder onClose={onCloseBuilder} />}
			{activePage.cardLayouts.length === 0 ? (
				<p className="cs-empty">This page is empty — use “New Card” to add your first card.</p>
			) : (
				<div
					className={`cs-canvas${showGrid ? " cs-canvas--grid" : ""}`}
					style={{ minHeight: boundingHeight(activePage.cardLayouts.map((layout) => layout.rect), 40) }}
				>
					{activePage.cardLayouts.map((layout) =>
						layout.id === editingLayoutId ? (
							<CardLayoutEditor
								key={layout.id}
								pageId={activePage.id}
								layout={layout}
								card={sheet.cards[layout.cardId]}
								onClose={() => setEditingLayoutId(null)}
								itemStyle={{ position: "absolute", left: layout.rect.x, top: layout.rect.y, width: layout.rect.width }}
								showGrid={showGrid}
								onNavigateToCard={handleNavigateToCard}
							/>
						) : (
							<CharacterSheetCard
								key={layout.id}
								layout={layout}
								onEditLayout={() => setEditingLayoutId(layout.id)}
								itemStyle={{
									position: "absolute",
									left: layout.rect.x,
									top: layout.rect.y,
									width: layout.rect.width,
									height: layout.rect.height,
								}}
							/>
						)
					)}
				</div>
			)}
		</>
	);
}

function CharacterSheetContent() {
	const [buildingCustom, setBuildingCustom] = useState(false);
	const [arrangingCards, setArrangingCards] = useState(false);
	const [showGrid, setShowGrid] = useState(false);
	return (
		<div className="cs-page">
			<TopBar
				onStartCustomCard={() => setBuildingCustom(true)}
				onArrangeCards={() => setArrangingCards(true)}
				showGrid={showGrid}
				onToggleGrid={() => setShowGrid((current) => !current)}
			/>
			<div className="cs-body">
				<Canvas
					buildingCustom={buildingCustom}
					onCloseBuilder={() => setBuildingCustom(false)}
					arrangingCards={arrangingCards}
					onCloseArrange={() => setArrangingCards(false)}
					showGrid={showGrid}
				/>
			</div>
		</div>
	);
}

export default function CharacterSheetPage() {
	return (
		<CharacterSheetProvider>
			<CharacterSheetContent />
		</CharacterSheetProvider>
	);
}
