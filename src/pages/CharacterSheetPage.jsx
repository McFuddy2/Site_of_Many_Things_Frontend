import { useCallback, useEffect, useRef, useState } from "react";
import { CharacterSheetProvider, useCharacterSheet } from "../components/character_sheet/CharacterSheetContext";
import SheetCanvas from "../components/character_sheet/SheetCanvas";
import CustomCardBuilder from "../components/character_sheet/CustomCardBuilder";
import NewCardModal from "../components/character_sheet/NewCardModal";
import { GRID_UNIT, tokenCssVars } from "../utils/character_sheet/layoutConstants";
import { getContrastTextColor } from "../utils/character_sheet/colors";
import "../CharacterSheetStyles.css";

function KebabIcon() {
	return (
		<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
			<circle cx="12" cy="5.5" r="1.7" fill="currentColor" />
			<circle cx="12" cy="12" r="1.7" fill="currentColor" />
			<circle cx="12" cy="18.5" r="1.7" fill="currentColor" />
		</svg>
	);
}

// One page tab: its name button, a kebab menu button, and the popover the
// kebab opens (rename + tab-color picker). The wrap carries the tab's
// border/background so the two buttons read as one pill.
function PageTab({ page, isActive, dispatch }) {
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
			<button
				type="button"
				className="cs-page-tab-menu-btn"
				aria-label={`${page.name} page options`}
				onClick={(event) => {
					event.stopPropagation();
					setMenuOpen((open) => !open);
				}}
			>
				<KebabIcon />
			</button>
			{menuOpen && (
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

function TopBar({ onStartCustomCard, showGrid, onToggleGrid, getPageColumns }) {
	const { sheet, dispatch } = useCharacterSheet();
	return (
		<div className="cs-topbar">
			<div className="cs-topbar-group">
				<NewCardModal onStartCustomCard={onStartCustomCard} getPageColumns={getPageColumns} />
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
					<PageTab key={page.id} page={page} isActive={page.id === sheet.activePageId} dispatch={dispatch} />
				))}
				<button type="button" className="cs-topbar-button" onClick={() => dispatch({ type: "addPage" })}>
					New Page
				</button>
			</div>
		</div>
	);
}

function Canvas({ buildingCustom, onCloseBuilder, showGrid, getPageColumns }) {
	return (
		<>
			{buildingCustom && <CustomCardBuilder onClose={onCloseBuilder} getPageColumns={getPageColumns} />}
			<SheetCanvas showGrid={showGrid} getPageColumns={getPageColumns} />
		</>
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
	const [buildingCustom, setBuildingCustom] = useState(false);
	const [showGrid, setShowGrid] = useState(false);
	const bodyRef = useRef(null);
	const getPageColumns = usePageColumns(bodyRef);
	return (
		<div className="cs-page" style={tokenCssVars()}>
			<TopBar
				onStartCustomCard={() => setBuildingCustom(true)}
				showGrid={showGrid}
				onToggleGrid={() => setShowGrid((current) => !current)}
				getPageColumns={getPageColumns}
			/>
			<div className="cs-body" ref={bodyRef}>
				<Canvas
					buildingCustom={buildingCustom}
					onCloseBuilder={() => setBuildingCustom(false)}
					showGrid={showGrid}
					getPageColumns={getPageColumns}
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
