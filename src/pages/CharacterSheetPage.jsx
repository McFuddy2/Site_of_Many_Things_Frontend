import { useState } from "react";
import { CharacterSheetProvider, useCharacterSheet } from "../components/character_sheet/CharacterSheetContext";
import CharacterSheetCard from "../components/character_sheet/CharacterSheetCard";
import CardLayoutEditor from "../components/character_sheet/CardLayoutEditor";
import NewCardModal from "../components/character_sheet/NewCardModal";
import "../CharacterSheetStyles.css";

function TopBar() {
	const { sheet, dispatch } = useCharacterSheet();
	return (
		<div className="cs-topbar">
			<div className="cs-topbar-group">
				<NewCardModal />
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

function Canvas() {
	const { sheet } = useCharacterSheet();
	// Only one card's layout is editable at a time. Switching pages unmounts an
	// open editor, which discards its draft (same as Exit without Saving).
	const [editingLayoutId, setEditingLayoutId] = useState(null);
	const activePage = sheet.pages.find((page) => page.id === sheet.activePageId) || sheet.pages[0];
	return (
		<div className="cs-canvas">
			{activePage.cardLayouts.length === 0 ? (
				<p className="cs-empty">This page is empty — use “New Card” to add your first card.</p>
			) : (
				activePage.cardLayouts.map((layout) =>
					layout.id === editingLayoutId ? (
						<CardLayoutEditor
							key={layout.id}
							pageId={activePage.id}
							layout={layout}
							card={sheet.cards[layout.cardId]}
							onClose={() => setEditingLayoutId(null)}
						/>
					) : (
						<CharacterSheetCard
							key={layout.id}
							layout={layout}
							onEditLayout={() => setEditingLayoutId(layout.id)}
						/>
					)
				)
			)}
		</div>
	);
}

export default function CharacterSheetPage() {
	return (
		<CharacterSheetProvider>
			<div className="cs-page">
				<TopBar />
				<Canvas />
			</div>
		</CharacterSheetProvider>
	);
}
