import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../TheLibraryStyles.css";
import ToolPageFooter from "../components/ToolPageFooter";
import SpellbookModal from "../components/SpellbookModal";
import { setMetaDescription, setCanonical } from "../utils/seo";
import { getSavedSpellbooks } from "../utils/spellbookStorage";
import bookSpinesImage from "../media/book-spines.png";

const HELP_STORAGE_KEY = "the_library_help_hidden_v1";
const SPINE_TEXT_MAX_FONT_SIZE = 22;
const SPINE_TEXT_MIN_FONT_SIZE = 8;
const LIBRARY_GRID_COLUMNS = 8;
const LIBRARY_GRID_MAX_ROWS = 3;
const SPINE_OPEN_ANIMATION_MS = 560;

function prefersReducedMotion() {
	return (
		typeof window !== "undefined" &&
		typeof window.matchMedia === "function" &&
		window.matchMedia("(prefers-reduced-motion: reduce)").matches
	);
}

function SpellbookSpine({ spellbook, onOpen }) {
	const spineRef = useRef(null);
	const spineTextRef = useRef(null);
	const [fontSize, setFontSize] = useState(SPINE_TEXT_MAX_FONT_SIZE);
	const [isOpening, setIsOpening] = useState(false);

	useEffect(() => {
		const containerEl = spineRef.current;
		const textEl = spineTextRef.current;
		if (!containerEl || !textEl) {
			return;
		}

		let fittedFontSize = SPINE_TEXT_MAX_FONT_SIZE;
		textEl.style.fontSize = `${fittedFontSize}px`;

		while (
			fittedFontSize > SPINE_TEXT_MIN_FONT_SIZE &&
			(textEl.scrollWidth > containerEl.clientWidth || textEl.scrollHeight > containerEl.clientHeight)
		) {
			fittedFontSize -= 1;
			textEl.style.fontSize = `${fittedFontSize}px`;
		}

		setFontSize(fittedFontSize);
	}, [spellbook.name]);

	useEffect(() => {
		if (!isOpening) return undefined;
		const timeoutId = setTimeout(() => {
			onOpen(spellbook);
			setIsOpening(false);
		}, SPINE_OPEN_ANIMATION_MS);
		return () => clearTimeout(timeoutId);
	}, [isOpening]);

	const activateSpine = () => {
		if (isOpening) return;
		if (prefersReducedMotion()) {
			onOpen(spellbook);
			return;
		}
		setIsOpening(true);
	};

	const spellCount = Array.isArray(spellbook.spells) ? spellbook.spells.length : 0;

	return (
		<div
			className={`library-spine${isOpening ? " is-opening" : ""}`}
			ref={spineRef}
			style={{ backgroundColor: spellbook.spineColor }}
			title={`${spellbook.name} (${spellCount} spell${spellCount === 1 ? "" : "s"})`}
			role="button"
			tabIndex={0}
			onClick={activateSpine}
			onKeyDown={(event) => {
				if (event.key === "Enter" || event.key === " ") {
					event.preventDefault();
					activateSpine();
				}
			}}
		>
			<span
				ref={spineTextRef}
				className="library-spine-text"
				style={{ color: spellbook.fontColor, fontSize: `${fontSize}px` }}
			>
				{spellbook.name}
			</span>
		</div>
	);
}

export default function TheLibrary() {
	const location = useLocation();
	const navigate = useNavigate();
	const [helpHidden, setHelpHidden] = useState(() => {
		const saved = localStorage.getItem(HELP_STORAGE_KEY);
		return saved === "true";
	});
	const [learnMoreOpen, setLearnMoreOpen] = useState(true);
	const [savedSpellbooks, setSavedSpellbooks] = useState(() => getSavedSpellbooks());
	const [openSpellbookId, setOpenSpellbookId] = useState(() => location.state?.openSpellbookId ?? null);
	const openSpellbook = savedSpellbooks.find((book) => book.id === openSpellbookId) ?? null;

	useEffect(() => {
		setMetaDescription(
			"The Library: view and manage your saved D&D 5e spellbooks. Free, fast, and no login required."
		);
		setCanonical("https://thesiteofmanythings.com/library");
	}, []);

	useEffect(() => {
		if (location.state?.openSpellbookId) {
			setSavedSpellbooks(getSavedSpellbooks());
			setOpenSpellbookId(location.state.openSpellbookId);
			navigate(location.pathname, { replace: true, state: {} });
		}
	}, [location.state, location.pathname, navigate]);

	const showHelp = () => {
		setHelpHidden(false);
		setLearnMoreOpen(true);
		localStorage.setItem(HELP_STORAGE_KEY, "false");
	};

	const handleSpellbookUpdated = (updatedSpellbook) => {
		setSavedSpellbooks((previous) =>
			previous.map((book) => (book.id === updatedSpellbook.id ? updatedSpellbook : book)),
		);
	};

	const handleSpellbookDeleted = (deletedSpellbookId) => {
		setSavedSpellbooks((previous) => previous.filter((book) => book.id !== deletedSpellbookId));
		setOpenSpellbookId(null);
	};

	return (
		<div className="library-page-root">
			<div className="library-page-scroll">
				<div className="library-page-container">
					<div className="library-page">
						<Link to="/spell-search" className="library-back-button">
							<span className="library-back-button-arrow">&larr;</span>
							Back to Spellsearcher
						</Link>
						<div className="library-page-panel">
							{savedSpellbooks.length === 0 ? (
								<div className="library-empty-state">
									<img src={bookSpinesImage} alt="" className="library-empty-state-image" />
									<p className="library-page-placeholder-text">
										You haven&apos;t saved any spellbooks yet. Head back to the Spell Searcher, select some spells, and save them as a spellbook to see them here!
									</p>
								</div>
							) : (
								<div
									className="library-shelf-grid"
									style={{
										gridTemplateRows: `repeat(${Math.min(
											LIBRARY_GRID_MAX_ROWS,
											Math.ceil(savedSpellbooks.length / LIBRARY_GRID_COLUMNS),
										)}, 1fr)`,
									}}
								>
									{savedSpellbooks.map((spellbook) => (
										<SpellbookSpine
											key={spellbook.id}
											spellbook={spellbook}
											onOpen={(book) => setOpenSpellbookId(book.id)}
										/>
									))}
								</div>
							)}
						</div>
					</div>
				</div>

				<ToolPageFooter
					helpHidden={helpHidden}
					showHelp={showHelp}
					learnMoreOpen={learnMoreOpen}
					setLearnMoreOpen={setLearnMoreOpen}
					contentKey="theLibrary"
					hideAd
				/>
			</div>

			{openSpellbook ? (
				<SpellbookModal
					spellbook={openSpellbook}
					onClose={() => setOpenSpellbookId(null)}
					onSpellbookUpdated={handleSpellbookUpdated}
					onSpellbookDeleted={handleSpellbookDeleted}
				/>
			) : null}
		</div>
	);
}
