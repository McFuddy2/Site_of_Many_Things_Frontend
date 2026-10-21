import { useCallback, useEffect, useRef, useState } from "react";
import { CharacterSheetProvider, useCharacterSheet } from "../components/character_sheet/CharacterSheetContext";
import SheetCanvas from "../components/character_sheet/SheetCanvas";
import SheetViewer from "../components/character_sheet/SheetViewer";
import useViewMode from "../components/character_sheet/useViewMode";
import CustomCardBuilder from "../components/character_sheet/CustomCardBuilder";
import NewCardPicker from "../components/character_sheet/NewCardPicker";
import { KebabIcon, UndoIcon, RedoIcon, InfoIcon } from "../components/character_sheet/icons";
import { GRID_UNIT, tokenCssVars } from "../utils/character_sheet/layoutConstants";
import { getContrastTextColor } from "../utils/character_sheet/colors";
import "../CharacterSheetStyles.css";

// One page tab: its name button, a kebab menu button, and the popover the
// kebab opens (rename + tab-color picker). The wrap carries the tab's
// border/background so the two buttons read as one pill. Below desktop only
// the name button shows — switching pages, but no renaming or recolouring.
function PageTab({ page, isActive, dispatch, editable }) {
	const [menuOpen, setMenuOpen] = useState(false);
	const [nameDraft, setNameDraft] = useState(page.name);
	const wrapRef = useRef(null);

	useEffect(() => setNameDraft(page.name), [page.name]);

	useEffect(() => {
		if (!menuOpen) {
			return undefined;
		}
		const handleOutsideClick = (event) => {
			if (wrapRef.current && !wrapRef.current.contains(event.target)) {
				setMenuOpen(false);
			}
		};
		document.addEventListener("mousedown", handleOutsideClick);
		return () => document.removeEventListener("mousedown", handleOutsideClick);
	}, [menuOpen]);

	const commitName = () => {
		const trimmed = nameDraft.trim();
		if (trimmed && trimmed !== page.name) {
			dispatch({ type: "setPageName", pageId: page.id, name: trimmed });
		} else {
			setNameDraft(page.name);
		}
	};

	const textColor = page.color ? getContrastTextColor(page.color) : null;
	const wrapStyle = page.color
		? {
				borderColor: page.color,
				backgroundColor: isActive ? page.color : "#ffffff",
				color: isActive ? textColor : page.color,
		  }
		: undefined;

	return (
		<div
			ref={wrapRef}
			className={`cs-page-tab-wrap${isActive ? " cs-page-tab-wrap--active" : ""}`}
			style={wrapStyle}
		>
			<button
				type="button"
				className="cs-page-tab"
				onClick={() => dispatch({ type: "setActivePage", pageId: page.id })}
			>
				{page.name}
			</button>
			{editable ? (
				<button
					type="button"
					className="cs-page-tab-menu-btn"
					aria-label={`${page.name} page options`}
					onClick={(event) => {
						event.stopPropagation();
						setMenuOpen((open) => !open);
					}}
				>
					<KebabIcon size={14} />
				</button>
			) : null}
			{editable && menuOpen && (
				<div className="cs-page-tab-menu" onClick={(event) => event.stopPropagation()}>
					<label className="cs-menu-name-field">
						<span>Page Name</span>
						<input
							type="text"
							value={nameDraft}
							onChange={(event) => setNameDraft(event.target.value)}
							onBlur={commitName}
							onKeyDown={(event) => {
								if (event.key === "Enter") {
									event.currentTarget.blur();
								}
							}}
						/>
					</label>
					<label className="cs-color-field">
						<span>Tab Color</span>
						<input
							type="color"
							className="cs-color-swatch-input"
							value={page.color || "#22385c"}
							onChange={(event) => dispatch({ type: "setPageColor", pageId: page.id, color: event.target.value })}
							aria-label="Page tab color"
						/>
					</label>
					{page.color && (
						<button
							type="button"
							className="cs-color-field-reset"
							onClick={() => dispatch({ type: "setPageColor", pageId: page.id, color: null })}
						>
							Reset Color
						</button>
					)}
				</div>
			)}
		</div>
	);
}

// Everything that adds, arranges or restyles is desktop-only (`editable`);
// the rest (Short/Long Rest, switching pages) is everywhere.
function TopBar({ onStartCustomCard, showGrid, onToggleGrid, getPageColumns, onCardAdded, editable }) {
	const { sheet, dispatch, canUndo, canRedo } = useCharacterSheet();
	return (
		<div className="cs-topbar">
			<div className="cs-topbar-group">
				{editable ? (
					<>
						<NewCardPicker onStartCustomCard={onStartCustomCard} getPageColumns={getPageColumns} onCardAdded={onCardAdded} />
						<div className="cs-topbar-icons" role="group" aria-label="History">
							<button
								type="button"
								className="cs-topbar-icon-button"
								aria-label="Undo"
								title="Undo (Ctrl+Z)"
								disabled={!canUndo}
								onClick={() => dispatch({ type: "undo" })}
							>
								<UndoIcon />
							</button>
							<button
								type="button"
								className="cs-topbar-icon-button"
								aria-label="Redo"
								title="Redo (Ctrl+Y)"
								disabled={!canRedo}
								onClick={() => dispatch({ type: "redo" })}
							>
								<RedoIcon />
							</button>
						</div>
						<button type="button" className="cs-topbar-button" onClick={onToggleGrid}>
							{showGrid ? "Hide Grid" : "Show Grid"}
						</button>
					</>
				) : null}
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
					<PageTab
						key={page.id}
						page={page}
						isActive={page.id === sheet.activePageId}
						dispatch={dispatch}
						editable={editable}
					/>
				))}
				{editable ? (
					<button type="button" className="cs-topbar-button" onClick={() => dispatch({ type: "addPage" })}>
						New Page
					</button>
				) : null}
			</div>
		</div>
	);
}

function Canvas({ buildingCustom, onCloseBuilder, showGrid, getPageColumns, focusRequest, onCardAdded, mode }) {
	if (mode !== "desktop") {
		return <SheetViewer mode={mode} />;
	}
	return (
		<>
			{buildingCustom && (
				<CustomCardBuilder onClose={onCloseBuilder} getPageColumns={getPageColumns} onCardAdded={onCardAdded} />
			)}
			<SheetCanvas showGrid={showGrid} getPageColumns={getPageColumns} focusRequest={focusRequest} />
		</>
	);
}

// Shown on tablets and phones, where the sheet is view-and-play only (see
// useViewMode): says what can still be done here and where the rest lives.
function ViewOnlyNote() {
	return (
		<p className="cs-view-note" role="note">
			<span className="cs-view-note-icon">
				<InfoIcon />
			</span>
			<span>
				You can fill in and use your sheet here. To change the layout, position, size or color of cards, open the
				sheet on a desktop or laptop computer.
			</span>
		</p>
	);
}

// How many grid columns are visible on the page right now — new cards are
// placed within this width so they land on-screen.
function usePageColumns(bodyRef) {
	return useCallback(() => {
		const width = bodyRef.current?.clientWidth || 0;
		return Math.max(1, Math.floor(width / GRID_UNIT));
	}, [bodyRef]);
}

function CharacterSheetContent() {
	const mode = useViewMode();
	const editable = mode === "desktop";
	const [buildingCustom, setBuildingCustom] = useState(false);
	const [showGrid, setShowGrid] = useState(false);
	const bodyRef = useRef(null);
	const getPageColumns = usePageColumns(bodyRef);
	// A card just added (New Card, Custom Card, Insert) — the canvas selects
	// it and scrolls it into view. A fresh object each time, so adding the
	// same card again still triggers.
	const [focusRequest, setFocusRequest] = useState(null);
	const onCardAdded = useCallback((cardId) => setFocusRequest({ cardId }), []);
	return (
		<div className={`cs-page cs-page--${mode}`} style={tokenCssVars({ touch: mode === "phone" })}>
			<TopBar
				onStartCustomCard={() => setBuildingCustom(true)}
				showGrid={showGrid}
				onToggleGrid={() => setShowGrid((current) => !current)}
				getPageColumns={getPageColumns}
				onCardAdded={onCardAdded}
				editable={editable}
			/>
			{editable ? null : <ViewOnlyNote />}
			<div className="cs-body" ref={bodyRef}>
				<Canvas
					buildingCustom={buildingCustom}
					onCloseBuilder={() => setBuildingCustom(false)}
					showGrid={showGrid}
					getPageColumns={getPageColumns}
					focusRequest={focusRequest}
					onCardAdded={onCardAdded}
					mode={mode}
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
