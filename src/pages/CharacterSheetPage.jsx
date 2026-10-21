import { useCallback, useEffect, useRef, useState } from "react";
import { CharacterSheetProvider, useCharacterSheet } from "../components/character_sheet/CharacterSheetContext";
import CharacterSheetCard from "../components/character_sheet/CharacterSheetCard";
import CardLayoutEditor from "../components/character_sheet/CardLayoutEditor";
import CustomCardBuilder from "../components/character_sheet/CustomCardBuilder";
import NewCardModal from "../components/character_sheet/NewCardModal";
import { boundingSize } from "../utils/character_sheet/grid";
import { GRID_UNIT, tokenCssVars } from "../utils/character_sheet/layoutConstants";
import { getContrastTextColor } from "../utils/character_sheet/colors";
import "../CharacterSheetStyles.css";

const CARD_DRAG_THRESHOLD = 3;

// Cards move by dragging their header — always on, no separate "Arrange
// Cards" step (see CharacterSheetCard's header). A plain click (the pointer
// never crosses CARD_DRAG_THRESHOLD) is treated as "open Edit Layout"
// instead of a move, so the same header press does both jobs depending on
// whether the pointer actually travels. Position snaps to whole grid units
// and commits straight to the sheet on release.
function useCardDrag(pageId, dispatch) {
	const [dragging, setDragging] = useState(null); // { layoutId, rect (units) } | null

	const startDrag = useCallback(
		(layout, onClick) => (event) => {
			if (event.button !== 0) {
				return;
			}
			event.preventDefault();
			const target = event.currentTarget;
			const pointerId = event.pointerId;
			try {
				target.setPointerCapture(pointerId);
			} catch {
				// Pointer already released; nothing to capture.
			}
			const start = { x: event.clientX, y: event.clientY };
			const startRect = { x: layout.x, y: layout.y, w: layout.w, h: layout.h };
			let moved = false;
			const snapped = (moveEvent) => ({
				...startRect,
				x: Math.max(0, startRect.x + Math.round((moveEvent.clientX - start.x) / GRID_UNIT)),
				y: Math.max(0, startRect.y + Math.round((moveEvent.clientY - start.y) / GRID_UNIT)),
			});

			const handleMove = (moveEvent) => {
				const dx = moveEvent.clientX - start.x;
				const dy = moveEvent.clientY - start.y;
				if (!moved && (Math.abs(dx) > CARD_DRAG_THRESHOLD || Math.abs(dy) > CARD_DRAG_THRESHOLD)) {
					moved = true;
				}
				if (moved) {
					setDragging({ layoutId: layout.id, rect: snapped(moveEvent) });
				}
			};

			const handleUp = (upEvent) => {
				target.removeEventListener("pointermove", handleMove);
				target.removeEventListener("pointerup", handleUp);
				try {
					target.releasePointerCapture(pointerId);
				} catch {
					// Already released.
				}
				if (!moved) {
					setDragging(null);
					onClick();
					return;
				}
				const rect = snapped(upEvent);
				setDragging(null);
				dispatch({ type: "setPageArrangement", pageId, rects: { [layout.id]: rect } });
			};

			target.addEventListener("pointermove", handleMove);
			target.addEventListener("pointerup", handleUp);
		},
		[dispatch, pageId]
	);

	return { dragging, startDrag };
}

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
	const { sheet, dispatch } = useCharacterSheet();
	// Only one card's layout is editable at a time. Switching pages unmounts an
	// open editor, which discards its draft (same as Exit without Saving).
	const [editingLayoutId, setEditingLayoutId] = useState(null);
	const activePage = sheet.pages.find((page) => page.id === sheet.activePageId) || sheet.pages[0];
	const { dragging, startDrag } = useCardDrag(activePage.id, dispatch);

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

	return (
		<>
			{buildingCustom && <CustomCardBuilder onClose={onCloseBuilder} getPageColumns={getPageColumns} />}
			{activePage.cardLayouts.length === 0 ? (
				<p className="cs-empty">This page is empty — use “New Card” to add your first card.</p>
			) : (
				<div
					className={`cs-canvas${showGrid ? " cs-canvas--grid" : ""}`}
					style={{ minHeight: (boundingSize(activePage.cardLayouts).rows + 2) * GRID_UNIT }}
				>
					{activePage.cardLayouts.map((layout) => {
						if (layout.id === editingLayoutId) {
							return (
								<CardLayoutEditor
									key={layout.id}
									pageId={activePage.id}
									layout={layout}
									card={sheet.cards[layout.cardId]}
									onClose={() => setEditingLayoutId(null)}
									showGrid={showGrid}
									onNavigateToCard={handleNavigateToCard}
								/>
							);
						}
						return (
							<CharacterSheetCard
								key={layout.id}
								layout={layout}
								rect={dragging?.layoutId === layout.id ? dragging.rect : null}
								onEditLayout={() => setEditingLayoutId(layout.id)}
								onHeaderPointerDown={startDrag(layout, () => setEditingLayoutId(layout.id))}
								dragging={dragging?.layoutId === layout.id}
								showGrid={showGrid}
							/>
						);
					})}
				</div>
			)}
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
