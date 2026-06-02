import { useEffect, useRef, useState } from "react";
import "../SpellSearchMainStyles.css";
import "../SpellSearchSpellList.css";
import "../SpellSearchColumnViewModal.css";
import "../SpellSearchFilter.css";
import quillInk from "../media/quill-n-ink.png";
import bookStack from "../media/book-stack.png";
import circleXDeleteIcon from "../media/Circle_X_Delete_Icon.png";
import copyScrollIcon from "../media/copy-scroll.png";
import { getSpells, getSpell, queryAdvancedSpells } from "../API/spell_search/spells";
import ToolPageFooter from "../components/ToolPageFooter";
import { setMetaDescription, setCanonical } from "../utils/seo";

const RANGE_SLIDER_VALUES = ["Emanation", "5ft", "10ft", "15ft", "20ft", "30ft", "60ft", "120ft", "300ft", "1mile", ">1mile"];
const RANGE_SLIDER_MAX = RANGE_SLIDER_VALUES.length - 1;
const emptySpellMessage = "No spells match your current filters.";
const loadSpellErrorMessage = "Unable to load spells right now. Please try again.";

export default function SpellSearchPage() {
	const filterFieldOptions = [
		"Key Word",
		"Level",
		"School",
		"Class",
		"Casting Time",
		"Range",
		"Duration",
		"Components",
		"Ritual",
		"Concentration",
	];
	const [isColumnViewOpen, setIsColumnViewOpen] = useState(false);
	const [visibleColumns, setVisibleColumns] = useState({
		level: true,
		school: true,
		castingTime: true,
		range: true,
		duration: true,
		components: true,
		ritual: true,
		classes: true,
	});
	const [sortBy, setSortBy] = useState("level");
	const isAlphabetical = sortBy === "alphabetical";
	const [sortDirection, setSortDirection] = useState("ascending");
	const isDescending = sortDirection === "descending";
		const [filterView, setFilterView] = useState("basic");
		const isAdvancedView = filterView === "advanced";
	const [includeFilterField, setIncludeFilterField] = useState("");
	const [excludeFilterField, setExcludeFilterField] = useState("");
	const [includeFilterValue, setIncludeFilterValue] = useState("");
	const [excludeFilterValue, setExcludeFilterValue] = useState("");
	const [includeSelections, setIncludeSelections] = useState([]);
	const [excludeSelections, setExcludeSelections] = useState([]);
	const [advancedFilterField, setAdvancedFilterField] = useState("");
	const [advancedFilterValue, setAdvancedFilterValue] = useState("");
	const [includeRangeLow, setIncludeRangeLow] = useState(0);
	const [includeRangeHigh, setIncludeRangeHigh] = useState(RANGE_SLIDER_MAX);
	const [excludeRangeLow, setExcludeRangeLow] = useState(0);
	const [excludeRangeHigh, setExcludeRangeHigh] = useState(RANGE_SLIDER_MAX);
	const [openSecondaryMenu, setOpenSecondaryMenu] = useState(null);
	const [pendingIncludeSecondaryValues, setPendingIncludeSecondaryValues] = useState([]);
	const [pendingExcludeSecondaryValues, setPendingExcludeSecondaryValues] = useState([]);
	const [pendingAdvancedSecondaryValues, setPendingAdvancedSecondaryValues] = useState([]);
	const [advancedRangeLow, setAdvancedRangeLow] = useState(0);
	const [advancedRangeHigh, setAdvancedRangeHigh] = useState(RANGE_SLIDER_MAX);
	const [activeRangeThumb, setActiveRangeThumb] = useState(null);
	const [rangeOverlapStartValue, setRangeOverlapStartValue] = useState(null);
	const [advancedBubbles, setAdvancedBubbles] = useState([]);
	const [displayTableBubbles, setDisplayTableBubbles] = useState([]);
	const [isAdvancedSubmitErrorVisible, setIsAdvancedSubmitErrorVisible] = useState(false);
	const [draggingBubble, setDraggingBubble] = useState(null);
	const [sourceDropPreviewIndex, setSourceDropPreviewIndex] = useState(null);
	const [displayDropPreviewIndex, setDisplayDropPreviewIndex] = useState(null);
	const [isOutsideDeleteZone, setIsOutsideDeleteZone] = useState(false);
	const [expandedSpellId, setExpandedSpellId] = useState(null);
	const [copiedSpellInfoId, setCopiedSpellInfoId] = useState(null);
	const [copiedSpellId, setCopiedSpellId] = useState(null);
	const [isMobileFiltersModalOpen, setIsMobileFiltersModalOpen] = useState(false);
	const [mobileFilterMode, setMobileFilterMode] = useState("include");
	const [hasMobileSavedFilters, setHasMobileSavedFilters] = useState(false);
	const [mobileSavedIncludeSelections, setMobileSavedIncludeSelections] = useState([]);
	const [mobileSavedExcludeSelections, setMobileSavedExcludeSelections] = useState([]);
	const [mobileWorkingIncludeSelections, setMobileWorkingIncludeSelections] = useState([]);
	const [mobileWorkingExcludeSelections, setMobileWorkingExcludeSelections] = useState([]);
	const [mobileIncludeFilterField, setMobileIncludeFilterField] = useState("");
	const [mobileExcludeFilterField, setMobileExcludeFilterField] = useState("");
	const [mobileIncludeFilterValue, setMobileIncludeFilterValue] = useState("");
	const [mobileExcludeFilterValue, setMobileExcludeFilterValue] = useState("");
	const [mobilePendingIncludeSecondaryValues, setMobilePendingIncludeSecondaryValues] = useState([]);
	const [mobilePendingExcludeSecondaryValues, setMobilePendingExcludeSecondaryValues] = useState([]);
	const [mobileIncludeRangeLow, setMobileIncludeRangeLow] = useState(0);
	const [mobileIncludeRangeHigh, setMobileIncludeRangeHigh] = useState(RANGE_SLIDER_MAX);
	const [mobileExcludeRangeLow, setMobileExcludeRangeLow] = useState(0);
	const [mobileExcludeRangeHigh, setMobileExcludeRangeHigh] = useState(RANGE_SLIDER_MAX);
	const [isLoading, setIsLoading] = useState(true);
	const [spells, setSpells] = useState({ items: [], total: 0, page_size: 20 });
	const [loadError, setLoadError] = useState("");
	const [currentSpellDescription, setCurrentSpellDescription] = useState("");
	const [currentPage, setCurrentPage] = useState(1);
	const [totalPages, setTotalPages] = useState(10);
	const [secretCode, setSecretCode] = useState("");
	const [ownerKey, setOwnerKey] = useState("");
	const [deleteBoxBounds, setDeleteBoxBounds] = useState({ top: 0, left: 0, width: 0, height: 0 });

	// Refs must be declared before useEffects that use them
	const spellFilterWrapperRef = useRef(null);
	const spellListWrapperRef = useRef(null);
	const filterBubbleDeleteBoxRef = useRef(null);
	const dynamicBubblesContainerRef = useRef(null);
	const displayTableBubblesRef = useRef(null);
	const includeSecondaryDropdownRef = useRef(null);
	const excludeSecondaryDropdownRef = useRef(null);
	const advancedSecondaryDropdownRef = useRef(null);
	const dynamicBubbleRefs = useRef(new Map());
	const displayBubbleRefs = useRef(new Map());
	const displayBubbleIdCounterRef = useRef(1);
	const dragReleaseHandledRef = useRef(false);
	const draggingBubbleRef = useRef(null);
	const skipBasicToAdvancedSyncRef = useRef(false);
	const tutorialStateSnapshotRef = useRef(null);

	useEffect(() => {
		const description =
			"Free Spell Search for DMs and players. Track spells, filter by category, and save spellbooks for future use. Fast and no login required.";
		const title = "Spell Searcher | Site of Many Things";
		const image = "https://thesiteofmanythings.com/images/spell-search-preview.png";

		document.title = title;
		setMetaDescription(description);
		setCanonical("https://thesiteofmanythings.com/spell-search");

		let metaDescription = document.querySelector('meta[name="description"]');
		let metaOgTitle = document.querySelector('meta[property="og:title"]');
		let metaOgDescription = document.querySelector('meta[property="og:description"]');
		let metaOgImage = document.querySelector('meta[property="og:image"]');

		if (!metaDescription) {
			metaDescription = document.createElement('meta');
			metaDescription.setAttribute('name', 'description');
			document.head.appendChild(metaDescription);
		}
		metaDescription.setAttribute('content', description);

		if (!metaOgTitle) {
			metaOgTitle = document.createElement('meta');
			metaOgTitle.setAttribute('property', 'og:title');
			document.head.appendChild(metaOgTitle);
		}
		metaOgTitle.setAttribute('content', title);

		if (!metaOgDescription) {
			metaOgDescription = document.createElement('meta');
			metaOgDescription.setAttribute('property', 'og:description');
			document.head.appendChild(metaOgDescription);
		}
		metaOgDescription.setAttribute('content', description);

		if (!metaOgImage) {
			metaOgImage = document.createElement('meta');
			metaOgImage.setAttribute('property', 'og:image');
			document.head.appendChild(metaOgImage);
		}
		metaOgImage.setAttribute('content', image);

		const existingJsonLd = document.getElementById('spell-search-jsonld');
		if (existingJsonLd) {
			existingJsonLd.remove();
		}

		const jsonLd = {
			"@context": "https://schema.org",
			"@type": "SoftwareApplication",
			name: "Free Spell Search",
			applicationCategory: "GameApplication",
			operatingSystem: "Web",
			description,
			offers: {
				"@type": "Offer",
				price: "0",
				priceCurrency: "USD"
			}
		};

		const script = document.createElement('script');
		script.type = 'application/ld+json';
		script.id = 'spell-search-jsonld';
		script.text = JSON.stringify(jsonLd);
		document.head.appendChild(script);

		return () => {
			if (script.parentNode) {
				script.parentNode.removeChild(script);
			}
		};
	}, []);

	useEffect(() => {
		const updateDeleteBoxBounds = () => {
			if (spellListWrapperRef.current) {
				const bounds = spellListWrapperRef.current.getBoundingClientRect();
				setDeleteBoxBounds({
					top: bounds.top,
					left: bounds.left,
					width: bounds.width,
					height: bounds.height,
				});
			}
		};

		updateDeleteBoxBounds();
		window.addEventListener("resize", updateDeleteBoxBounds);
		return () => window.removeEventListener("resize", updateDeleteBoxBounds);
	}, []);

	useEffect(() => {
		if (draggingBubble && spellListWrapperRef.current) {
			const bounds = spellListWrapperRef.current.getBoundingClientRect();
			setDeleteBoxBounds({
				top: bounds.top,
				left: bounds.left,
				width: bounds.width,
				height: bounds.height,
			});
		}
	}, [draggingBubble]);

	useEffect(() => {
		const storedKey = sessionStorage.getItem("owner-key");
		if (storedKey) {
			setOwnerKey(storedKey);
		}
	}, []);

	useEffect(() => {
		fetchAdvancedSpells();
	}, [sortBy, sortDirection, includeSelections, excludeSelections, currentPage]);

	const fetchAdvancedSpells = async () => {
		try {
			setLoadError("");
			const query = advancedQueryBuilder();
			const response = await queryAdvancedSpells(query);
			const items = Array.isArray(response?.items) ? response.items : [];
			const total = Number.isFinite(response?.total) ? response.total : items.length;
			const pageSize = Number.isFinite(response?.page_size) && response.page_size > 0 ? response.page_size : 20;
			setSpells({ ...response, items, total, page_size: pageSize });
			setTotalPages(Math.max(1, Math.ceil(total / pageSize)));
		} catch (error) {
			console.error("Failed to fetch advanced spells:", error);
			setLoadError(loadSpellErrorMessage);
			setSpells({ items: [], total: 0, page_size: 20 });
			setTotalPages(1);
		} finally {
			setIsLoading(false);
		}
	}

	const advancedQueryBuilder = (stateInfo) => {
		let includeKeywords = [],
			includeLevels = [],
			includeSchools = [],
			includeClasses = [],
			includeCastingTimes = [],
			includeRanges = [],
			includeDurations = [],
			includeComponents = [],
			includeRituals = [],
			includeConcentrations = [],
			excludeKeywords = [],
			excludeLevels = [],
			excludeSchools = [],
			excludeClasses = [],
			excludeCastingTimes = [],
			excludeRanges = [],
			excludeDurations = [],
			excludeComponents = [],
			excludeRituals = [],
			excludeConcentrations = [];

		if (includeSelections.length > 0) {
			includeKeywords = includeSelections
				.filter((entry) => entry.field === "Key Word")
				.filter((entry) => entry.value !== "ALL")
				.map((entry) => entry.value);
			includeLevels = includeSelections
				.filter((entry) => entry.field === "Level")
				.filter((entry) => entry.value !== "ALL")
				.map((entry) => entry.value);
			includeSchools = includeSelections
				.filter((entry) => entry.field === "School")
				.filter((entry) => entry.value !== "ALL")
				.map((entry) => entry.value);
			includeClasses = includeSelections
				.filter((entry) => entry.field === "Class")
				.filter((entry) => entry.value !== "ALL")
				.map((entry) => entry.value);
			includeCastingTimes = includeSelections
				.filter((entry) => entry.field === "Casting Time")
				.filter((entry) => entry.value !== "ALL")
				.map((entry) => entry.value);
			includeRanges = includeSelections
				.filter((entry) => entry.field === "Range")
				.filter((entry) => entry.value !== "ALL")
				.map((entry) => entry.value);
			includeDurations = includeSelections
				.filter((entry) => entry.field === "Duration")
				.filter((entry) => entry.value !== "ALL")
				.map((entry) => entry.value);
			includeComponents = includeSelections
				.filter((entry) => entry.field === "Components")
				.filter((entry) => entry.value !== "ALL")
				.map((entry) => entry.value);
			includeRituals = includeSelections
				.filter((entry) => entry.field === "Ritual")
				.filter((entry) => entry.value !== "ALL")
				.map((entry) => entry.value);
			includeConcentrations = includeSelections
				.filter((entry) => entry.field === "Concentration")
				.filter((entry) => entry.value !== "ALL")
				.map((entry) => entry.value);
		}

		if (excludeSelections.length > 0) {
			excludeKeywords = excludeSelections
				.filter((entry) => entry.field === "Key Word")
				.filter((entry) => entry.value !== "ALL")
				.map((entry) => entry.value);
			excludeLevels = excludeSelections
				.filter((entry) => entry.field === "Level")
				.filter((entry) => entry.value !== "ALL")
				.map((entry) => entry.value);
			excludeSchools = excludeSelections
				.filter((entry) => entry.field === "School")
				.filter((entry) => entry.value !== "ALL")
				.map((entry) => entry.value);
			excludeClasses = excludeSelections
				.filter((entry) => entry.field === "Class")
				.filter((entry) => entry.value !== "ALL")
				.map((entry) => entry.value);
			excludeCastingTimes = excludeSelections
				.filter((entry) => entry.field === "Casting Time")
				.filter((entry) => entry.value !== "ALL")
				.map((entry) => entry.value);
			excludeRanges = excludeSelections
				.filter((entry) => entry.field === "Range")
				.filter((entry) => entry.value !== "ALL")
				.map((entry) => entry.value);
			excludeDurations = excludeSelections
				.filter((entry) => entry.field === "Duration")
				.filter((entry) => entry.value !== "ALL")
				.map((entry) => entry.value);
			excludeComponents = excludeSelections
				.filter((entry) => entry.field === "Components")
				.filter((entry) => entry.value !== "ALL")
				.map((entry) => entry.value);
			excludeRituals = excludeSelections
				.filter((entry) => entry.field === "Ritual")
				.filter((entry) => entry.value !== "ALL")
				.map((entry) => entry.value);
			excludeConcentrations = excludeSelections
				.filter((entry) => entry.field === "Concentration")
				.filter((entry) => entry.value !== "ALL")
				.map((entry) => entry.value);
		}

		let filterArgs = [];
		const pushIncludeGroup = (argsForField) => {
			if (argsForField.length === 0) {
				return;
			}

			if (argsForField.length === 1) {
				filterArgs.push(argsForField[0]);
				return;
			}

			filterArgs.push({ op: "OR", args: argsForField });
		};
		const pushExcludeGroup = (argsForField) => {
			if (argsForField.length === 0) {
				return;
			}

			if (argsForField.length === 1) {
				filterArgs.push({ op: "NOT", arg: argsForField[0] });
				return;
			}

			filterArgs.push({ op: "NOT", arg: { op: "OR", args: argsForField } });
		};

		if (includeKeywords.length > 0) {
			pushIncludeGroup(
				includeKeywords.map((keyword) => ({
					term: { field: "name", value: keyword }
				})),
			);
		}
		if (includeLevels.length > 0) {
			pushIncludeGroup(
				includeLevels.map((level) => ({
					term: { field: "level", value: level === "Cantrip" ? 0 : level }
				})),
			);
		}
		if (includeSchools.length > 0) {
			pushIncludeGroup(
				includeSchools.map((school) => ({
					term: { field: "school", value: school }
				})),
			);
		}
		if (includeClasses.length > 0) {
			pushIncludeGroup(
				includeClasses.map((cls) => ({
					term: { field: "class", value: cls }
				})),
			);
		}
		if (includeCastingTimes.length > 0) {
			pushIncludeGroup(
				includeCastingTimes.map((castingTime) => ({
					term: { field: "casting_time", value: castingTime }
				})),
			);
		}
		if (includeRanges.length > 0) {
			const [firstLabel, secondLabel] = includeRanges[0].split(" - ");
			const lowLabel = firstLabel;
			const highLabel = secondLabel ?? firstLabel;
			filterArgs.push({ range_between: { field: "range", low: lowLabel, high: highLabel } });
		}
		if (includeDurations.length > 0) {
			pushIncludeGroup(
				includeDurations.map((durationValue) => ({
					term: { field: "duration", value: durationValue }
				})),
			);
		}
		if (includeComponents.length > 0) {
			pushIncludeGroup(
				includeComponents.map((componentsValue) => ({
					term: { field: "components", value: componentsValue }
				})),
			);
		}
		if (includeRituals.length > 0) {
			pushIncludeGroup(
				includeRituals.map((ritualValue) => ({
					term: { field: "ritual", value: ritualValue }
				})),
			);
		}
		if (includeConcentrations.length > 0) {
			pushIncludeGroup(
				includeConcentrations.map((concentrationValue) => ({
					term: { field: "concentration", value: concentrationValue }
				})),
			);
		}

		if (excludeKeywords.length > 0) {
			pushExcludeGroup(
				excludeKeywords.map((keyword) => ({
					term: { field: "name", value: keyword }
				})),
			);
		}
		if (excludeLevels.length > 0) {
			pushExcludeGroup(
				excludeLevels.map((level) => ({
					term: { field: "level", value: level === "Cantrip" ? 0 : level }
				})),
			);
		}
		if (excludeSchools.length > 0) {
			pushExcludeGroup(
				excludeSchools.map((school) => ({
					term: { field: "school", value: school }
				})),
			);
		}
		if (excludeClasses.length > 0) {
			pushExcludeGroup(
				excludeClasses.map((cls) => ({
					term: { field: "class", value: cls }
				})),
			);
		}
		if (excludeCastingTimes.length > 0) {
			pushExcludeGroup(
				excludeCastingTimes.map((castingTime) => ({
					term: { field: "casting_time", value: castingTime }
				})),
			);
		}
		if (excludeRanges.length > 0) {
			const [firstLabel, secondLabel] = excludeRanges[0].split(" - ");
			const lowLabel = firstLabel;
			const highLabel = secondLabel ?? firstLabel;
			filterArgs.push({ op: "NOT", arg: { range_between: { field: "range", low: lowLabel, high: highLabel } } });
		}
		if (excludeDurations.length > 0) {
			pushExcludeGroup(
				excludeDurations.map((durationValue) => ({
					term: { field: "duration", value: durationValue }
				})),
			);
		}
		if (excludeComponents.length > 0) {
			pushExcludeGroup(
				excludeComponents.map((componentsValue) => ({
					term: { field: "components", value: componentsValue }
				})),
			);
		}
		if (excludeRituals.length > 0) {
			pushExcludeGroup(
				excludeRituals.map((ritualValue) => ({
					term: { field: "ritual", value: ritualValue }
				})),
			);
		}
		if (excludeConcentrations.length > 0) {
			pushExcludeGroup(
				excludeConcentrations.map((concentrationValue) => ({
					term: { field: "concentration", value: concentrationValue }
				})),
			);
		}

		let filter;
		if (filterArgs.length === 0) {
			filter = { term: { field: "name", value: "" } };
		} else if (filterArgs.length === 1) {
			filter = filterArgs[0];
		} else {
			filter = { op: "AND", args: filterArgs };
		}

		return {
			filter: filter,
			page: currentPage,
			page_size: 20,
			sort: sortBy === "alphabetical" ? "name" : "level",
			order: sortDirection === "descending" ? "desc" : "asc",
		};
	}

	// Help section state
	const HELP_STORAGE_KEY = "spell_searcher_help_hidden_v1";
	const [helpHidden, setHelpHidden] = useState(() => {
		const saved = localStorage.getItem(HELP_STORAGE_KEY);
		return saved === "true";
	});
	const [learnMoreOpen, setLearnMoreOpen] = useState(true);
	const [isGuidedTutorialModalOpen, setIsGuidedTutorialModalOpen] = useState(false);
	const [guidedTutorialStep, setGuidedTutorialStep] = useState(1);
	const [guidedTutorialSpotlights, setGuidedTutorialSpotlights] = useState([]);

	const guidedTutorialSteps = [
		(
			<>
				Welcome to the guided tutorial!
				<br /><br />
				Let&apos;s walk through some of the great features you&apos;ll find in our Spell Searcher.
				<br /><br />
				Click &quot;Next&quot; to continue the tutorial. You can click on the &quot;X&quot; in the top right corner to end the tutorial at any time.
			</>
		),
		(
			<>
				On the left side of the page, we have the list of spells and some quick-reference information about them.
				<br /><br />
				Clicking on this column icon will open a box where you can select which of these quick-reference sections you would like to be displayed.
			</>
		),
		(
			<>
				You can sort these spells using our simple sort options. You can choose Level or Alphabetical and then Ascending or Descending.
				<br /><br />
				Whichever is highlighted pink with the white text is the effect that is currently active.
			</>
		),
		(
			<>
				20 spells are displayed on the page at a time. You can click on the pink arrow to the right of this book icon to go to the next page. Then you can click on the pink arrow to the left of this book icon to go back to a previous page.
			</>
		),
		(
			<>
				The right side of the page presents filter options to help narrow down exactly what kind of spells you&apos;re looking for.
				<br /><br />
				At the top of this area, you&apos;ll see we have a &quot;Basic&quot; and an &quot;Advanced&quot; filter option. We&apos;ll cover the &quot;Basic&quot; option first.
			</>
		),
		(
			<>
				To add a filter, first select one of the drop down options that says &quot;Select a Filter Category&quot; to open the drop down menu.
				<br /><br />
				After a category has been selected, the secondary drop down will become available and will offer options within that category.
				<br /><br />
				When a selection is made, it will apear in a list below the drop down menus. To remove that filter, simply click on the word in the list.
			</>
		),
		(
			<>
				Our Spell Searcher is unique in that you can add filters not only for what spells you want to see, but also which spells you DON&apos;T want to see.
				<br /><br />
				The functionality is the same with the category drop down and the secondary drop down menus.
			</>
		),
		(
			<>
				In future versions of the Spell Searcher, you&apos;ll be able to click on the check boxes to the left of the spells in the list and click the quill pen and ink icon to save the selected spells as a spellbook. Then, you&apos;ll be able to click on the stack of books icon to view all spellbooks that you&apos;ve saved. FEATURE COMING SOON!
				<br /><br />
				The &quot;secret code&quot; section is just for the developers, so you can ignore that for now.
			</>
		),
		(
			<>
				The Advanced Filters section starts off functionally the same. We have the same category drop down and secondary drop down options.
				<br /><br />
				Rather than going into a list like in the Basic Filters, these will be presented as &quot;bubbles&quot;. There are already bubbles here: &quot;(&quot;, &quot;)&quot;, &quot;AND&quot;, &quot;OR&quot;, and &quot;NOT&quot; that are always there. Your newly added bubbles will appear below these.
			</>
		),
		(
			<>
				You can click and drag the bubbles from the bottom section into this white box to create your own custom formula.
				<br /><br />
				When you have completed your formula, you can click &quot;Submit&quot;. An error will pop up if the formula you&apos;ve created is not feasible.
			</>
		),
		(
			<>
				To get rid of a bubble, simple drag and drop it over to the left. You&apos;ll see a dark purple box that has an icon of a circle and an x to show that you&apos;re dragging it to the right spot to delete the bubble.
			</>
		),
	];

	const cloneSelectionEntries = (entries) => entries.map((entry) => ({ ...entry }));
	const cloneDisplayBubbleEntries = (entries) => entries.map((entry) => ({ ...entry }));

	const restoreTutorialState = () => {
		const snapshot = tutorialStateSnapshotRef.current;
		if (!snapshot) {
			return;
		}

		skipBasicToAdvancedSyncRef.current = true;
		setFilterView(snapshot.filterView);
		setIncludeSelections(cloneSelectionEntries(snapshot.includeSelections));
		setExcludeSelections(cloneSelectionEntries(snapshot.excludeSelections));
		setIncludeFilterField(snapshot.includeFilterField);
		setExcludeFilterField(snapshot.excludeFilterField);
		setIncludeFilterValue(snapshot.includeFilterValue);
		setExcludeFilterValue(snapshot.excludeFilterValue);
		setPendingIncludeSecondaryValues([...snapshot.pendingIncludeSecondaryValues]);
		setPendingExcludeSecondaryValues([...snapshot.pendingExcludeSecondaryValues]);
		setAdvancedFilterField(snapshot.advancedFilterField);
		setAdvancedFilterValue(snapshot.advancedFilterValue);
		setPendingAdvancedSecondaryValues([...snapshot.pendingAdvancedSecondaryValues]);
		setAdvancedBubbles(cloneSelectionEntries(snapshot.advancedBubbles));
		setDisplayTableBubbles(cloneDisplayBubbleEntries(snapshot.displayTableBubbles));
		setOpenSecondaryMenu(snapshot.openSecondaryMenu);
		tutorialStateSnapshotRef.current = null;
	};

	const closeGuidedTutorial = () => {
		setGuidedTutorialSpotlights([]);
		setIsGuidedTutorialModalOpen(false);
		restoreTutorialState();
	};

	const showHelp = () => {
		setHelpHidden(false);
		setLearnMoreOpen(true);
		localStorage.setItem(HELP_STORAGE_KEY, "false");
	};

	const hideHelp = () => {
		setHelpHidden(true);
		localStorage.setItem(HELP_STORAGE_KEY, "true");
	};

	const staticAdvancedBubbleLabels = ["(", ")", "AND", "OR", "NOT"];
	const isOnFirstPage = currentPage === 1;
	const isOnLastPage = currentPage === totalPages;
	const spellItems = Array.isArray(spells?.items) ? spells.items : [];

	const formatClassList = (classesValue) => {
		if (Array.isArray(classesValue)) {
			return classesValue.join(", ");
		}

		if (typeof classesValue === "string") {
			return classesValue;
		}

		return "";
	};

	const getDurationDisplayValue = (spell) => {
		const rawDuration = typeof spell?.duration === "string" ? spell.duration.trim() : "";
		const rawDescription = typeof spell?.description === "string" ? spell.description.trim() : "";
		const normalizedDuration = rawDuration.replace(/\s+/g, " ").trim();

		// Guard against bad payloads where description is copied into duration.
		if (rawDuration && rawDescription && rawDuration === rawDescription) {
			return "";
		}

		if (!normalizedDuration) {
			return "";
		}

		const canonicalDurationPatterns = [
			/^(Concentration,\s*up to\s+\d+\s+(?:round|rounds|minute|minutes|hour|hours|day|days))\b/i,
			/^(Up to\s+\d+\s+(?:round|rounds|minute|minutes|hour|hours|day|days))\b/i,
			/^(\d+\s+(?:round|rounds|minute|minutes|hour|hours|day|days))\b/i,
			/^(Instantaneous|Permanent|Until dispelled|Special)\b/i,
		];

		for (const pattern of canonicalDurationPatterns) {
			const match = normalizedDuration.match(pattern);
			if (match) {
				return match[1];
			}
		}

		return normalizedDuration;
	};

	const columnChoices = [
		{ key: "level", label: "Level" },
		{ key: "school", label: "School" },
		{ key: "castingTime", label: "Casting Time" },
		{ key: "range", label: "Range" },
		{ key: "duration", label: "Duration" },
		{ key: "components", label: "Components" },
		{ key: "ritual", label: "Ritual" },
		{ key: "classes", label: "Classes" },
	];

	const toggleColumnVisibility = (columnKey) => {
		setVisibleColumns((previous) => ({
			...previous,
			[columnKey]: !previous[columnKey],
		}));
	};

	const getSecondaryFilterOptions = (field) => {
		switch (field) {
			case "Casting Time":
				return ["Action", "Bonus Action", "Reaction", "1 Minute", "10 Minutes", "1 Hour", ">1 Hour"];
			case "Duration":
				return ["Instantaneous", "1 Round", "1 Minute", "10 Minutes", "1 Hour", ">1 Hour"];
			case "Components":
				return ["Verbal", "Somatic", "Component", "Cost Component"];
			case "Level":
				return ["Cantrip", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
			case "School":
				return ["Abjuration", "Conjuration", "Divination", "Enchantment", "Evocation", "Illusion", "Necromancy", "Transmutation"];
			case "Class":
				return ["Artificer", "Barbarian", "Bard", "Cleric", "Druid", "Fighter", "Monk", "Paladin", "Ranger", "Rogue", "Sorcerer", "Special", "Warlock", "Wizard"];
			case "Ritual":
				return ["Yes", "No"];
			case "Concentration":
				return ["Yes", "No"];
			default:
				return [];
		}
	};

	const isTextEntryField = (field) => getSecondaryFilterOptions(field).length === 0;

	const getSecondaryPlaceholder = (field) => {
		switch (field) {
			case "Casting Time":
				return "Select Casting Time";
			case "Duration":
				return "Select Duration";
			case "Components":
				return "Select Components";
			case "Level":
				return "Select Level";
			case "School":
				return "Select School";
			case "Class":
				return "Select Class";
			case "Ritual":
				return "Select Ritual";
			case "Concentration":
				return "Select Concentration";
			default:
				return "";
		}
	};

	const applyRangeToSelections = (setSelections, low, high) => {
		setSelections((prev) => {
			const otherFields = prev.filter((e) => e.field !== "Range");
			if (low === 0 && high === RANGE_SLIDER_MAX) {
				return otherFields;
			}
			const rangeValue = low === high
				? RANGE_SLIDER_VALUES[low]
				: `${RANGE_SLIDER_VALUES[low]} - ${RANGE_SLIDER_VALUES[high]}`;
			return [...otherFields, { field: "Range", value: rangeValue }];
		});
	};

	const applyRangeToAdvancedBubbles = (low, high) => {
		setAdvancedBubbles((prev) => {
			const otherBubbles = prev.filter((e) => e.field !== "Range");
			if (low === 0 && high === RANGE_SLIDER_MAX) {
				return otherBubbles;
			}
			const rangeValue = low === high
				? RANGE_SLIDER_VALUES[low]
				: `${RANGE_SLIDER_VALUES[low]} - ${RANGE_SLIDER_VALUES[high]}`;
			return [...otherBubbles, { field: "Range", value: rangeValue }];
		});
	};

	const renderRangeSlider = (low, setLow, high, setHigh, onRangeChange) => (
		<div className="range-slider-wrapper">
			<div className="range-slider-current-values">
				<span>{RANGE_SLIDER_VALUES[low]}</span>
				<span>{RANGE_SLIDER_VALUES[high]}</span>
			</div>
			<div className="range-slider-track-area">
				<div className="range-slider-track-bg" />
				<div
					className="range-slider-fill"
					style={{
						left: `${(low / RANGE_SLIDER_MAX) * 100}%`,
						width: `${((high - low) / RANGE_SLIDER_MAX) * 100}%`,
					}}
				/>
				<input
					type="range"
					className="range-slider-input"
					min={0}
					max={RANGE_SLIDER_MAX}
					value={low}
					onPointerDown={() => {
						setActiveRangeThumb("low");
						setRangeOverlapStartValue(low === high ? low : null);
					}}
					onPointerUp={() => {
						setActiveRangeThumb(null);
						setRangeOverlapStartValue(null);
					}}
					onPointerCancel={() => {
						setActiveRangeThumb(null);
						setRangeOverlapStartValue(null);
					}}
					onChange={(e) => {
						const raw = Number(e.target.value);

						if (activeRangeThumb === "low" && rangeOverlapStartValue !== null) {
							if (raw > rangeOverlapStartValue) {
								setHigh(raw);
								onRangeChange(rangeOverlapStartValue, raw);
								return;
							}
							setLow(raw);
							onRangeChange(raw, rangeOverlapStartValue);
							return;
						}

						if (activeRangeThumb === "low" && raw > high) {
							setHigh(raw);
							onRangeChange(low, raw);
							return;
						}

						const val = Math.min(raw, high);
						setLow(val);
						onRangeChange(val, high);
					}}
					aria-label="Range filter minimum"
					style={{ zIndex: low === high ? 2 : 1 }}
				/>
				<input
					type="range"
					className="range-slider-input"
					min={0}
					max={RANGE_SLIDER_MAX}
					value={high}
					onPointerDown={() => {
						setActiveRangeThumb("high");
						setRangeOverlapStartValue(low === high ? high : null);
					}}
					onPointerUp={() => {
						setActiveRangeThumb(null);
						setRangeOverlapStartValue(null);
					}}
					onPointerCancel={() => {
						setActiveRangeThumb(null);
						setRangeOverlapStartValue(null);
					}}
					onChange={(e) => {
						const raw = Number(e.target.value);

						if (activeRangeThumb === "high" && rangeOverlapStartValue !== null) {
							if (raw < rangeOverlapStartValue) {
								setLow(raw);
								onRangeChange(raw, rangeOverlapStartValue);
								return;
							}
							setHigh(raw);
							onRangeChange(rangeOverlapStartValue, raw);
							return;
						}

						if (activeRangeThumb === "high" && raw < low) {
							setLow(raw);
							onRangeChange(raw, high);
							return;
						}

						const val = Math.max(raw, low);
						setHigh(val);
						onRangeChange(low, val);
					}}
					aria-label="Range filter maximum"
					style={{ zIndex: 2 }}
				/>
			</div>
			<div className="range-slider-edge-labels">
				<span>Emanation</span>
				<span>&gt;1mile</span>
			</div>
		</div>
	);

	const includeSecondaryOptions = getSecondaryFilterOptions(includeFilterField);
	const excludeSecondaryOptions = getSecondaryFilterOptions(excludeFilterField);
	const advancedSecondaryOptions = getSecondaryFilterOptions(advancedFilterField);
	const isSingleSelectField = (field) => field === "Ritual" || field === "Concentration";
	const usesDeferredSecondaryMenu = (field) => field && !isSingleSelectField(field) && !isTextEntryField(field) && field !== "Range";
	const includeSecondaryDropdownOptions = isSingleSelectField(includeFilterField)
		? includeSecondaryOptions
		: ["ALL", ...includeSecondaryOptions];
	const excludeSecondaryDropdownOptions = isSingleSelectField(excludeFilterField)
		? excludeSecondaryOptions
		: ["ALL", ...excludeSecondaryOptions];
	const advancedSecondaryDropdownOptions = isSingleSelectField(advancedFilterField)
		? advancedSecondaryOptions
		: ["ALL", ...advancedSecondaryOptions];
	const isMobileIncludeMode = mobileFilterMode === "include";
	const mobileActiveFilterField = isMobileIncludeMode ? mobileIncludeFilterField : mobileExcludeFilterField;
	const mobileActiveFilterValue = isMobileIncludeMode ? mobileIncludeFilterValue : mobileExcludeFilterValue;
	const mobileActiveWorkingSelections = isMobileIncludeMode
		? mobileWorkingIncludeSelections
		: mobileWorkingExcludeSelections;
	const mobileActiveSecondaryOptions = getSecondaryFilterOptions(mobileActiveFilterField);
	const mobileActiveSecondaryDropdownOptions = isSingleSelectField(mobileActiveFilterField)
		? mobileActiveSecondaryOptions
		: ["ALL", ...mobileActiveSecondaryOptions];
	const mobileActivePendingSecondaryValues = isMobileIncludeMode
		? mobilePendingIncludeSecondaryValues
		: mobilePendingExcludeSecondaryValues;
	const mobileOpenSecondaryMenuKey = isMobileIncludeMode ? "include" : "exclude";
	const mobileCombinedSelections = [
		...mobileWorkingIncludeSelections.map((entry) => ({ ...entry, mode: "include" })),
		...mobileWorkingExcludeSelections.map((entry) => ({ ...entry, mode: "exclude" })),
	];

	const openMobileFiltersModal = () => {
		const nextIncludeSelections = hasMobileSavedFilters ? mobileSavedIncludeSelections : includeSelections;
		const nextExcludeSelections = hasMobileSavedFilters ? mobileSavedExcludeSelections : excludeSelections;

		setMobileWorkingIncludeSelections(cloneSelectionEntries(nextIncludeSelections));
		setMobileWorkingExcludeSelections(cloneSelectionEntries(nextExcludeSelections));
		setMobileIncludeFilterField("");
		setMobileExcludeFilterField("");
		setMobileIncludeFilterValue("");
		setMobileExcludeFilterValue("");
		setMobilePendingIncludeSecondaryValues([]);
		setMobilePendingExcludeSecondaryValues([]);
		setMobileIncludeRangeLow(includeRangeLow);
		setMobileIncludeRangeHigh(includeRangeHigh);
		setMobileExcludeRangeLow(excludeRangeLow);
		setMobileExcludeRangeHigh(excludeRangeHigh);
		setMobileFilterMode("include");
		setOpenSecondaryMenu(null);
		setIsMobileFiltersModalOpen(true);
	};

	const closeMobileFiltersModalAndClearList = () => {
		setIsMobileFiltersModalOpen(false);
		setOpenSecondaryMenu(null);
		setMobileSavedIncludeSelections([]);
		setMobileSavedExcludeSelections([]);
		setHasMobileSavedFilters(true);
		setMobileWorkingIncludeSelections([]);
		setMobileWorkingExcludeSelections([]);
		setMobileIncludeFilterField("");
		setMobileExcludeFilterField("");
		setMobileIncludeFilterValue("");
		setMobileExcludeFilterValue("");
		setMobilePendingIncludeSecondaryValues([]);
		setMobilePendingExcludeSecondaryValues([]);
		setMobileIncludeRangeLow(0);
		setMobileIncludeRangeHigh(RANGE_SLIDER_MAX);
		setMobileExcludeRangeLow(0);
		setMobileExcludeRangeHigh(RANGE_SLIDER_MAX);
	};

	const applyMobileFilters = () => {
		const nextIncludeSelections = cloneSelectionEntries(mobileWorkingIncludeSelections);
		const nextExcludeSelections = cloneSelectionEntries(mobileWorkingExcludeSelections);

		setIncludeSelections(nextIncludeSelections);
		setExcludeSelections(nextExcludeSelections);
		setMobileSavedIncludeSelections(nextIncludeSelections);
		setMobileSavedExcludeSelections(nextExcludeSelections);
		setHasMobileSavedFilters(true);
		setOpenSecondaryMenu(null);
		setIsMobileFiltersModalOpen(false);
	};

	const setMobileActiveFilterField = (nextField) => {
		if (isMobileIncludeMode) {
			setMobileIncludeFilterField(nextField);
			setMobileIncludeFilterValue("");
			setMobilePendingIncludeSecondaryValues([]);
			return;
		}

		setMobileExcludeFilterField(nextField);
		setMobileExcludeFilterValue("");
		setMobilePendingExcludeSecondaryValues([]);
	};

	const setMobileActiveFilterValue = (nextValue) => {
		if (isMobileIncludeMode) {
			setMobileIncludeFilterValue(nextValue);
			return;
		}

		setMobileExcludeFilterValue(nextValue);
	};

	const addMobileSelection = (field, value) => {
		if (isMobileIncludeMode) {
			addSelection(setMobileWorkingIncludeSelections, field, value);
			return;
		}

		addSelection(setMobileWorkingExcludeSelections, field, value);
	};

	const toggleMobilePendingSecondaryOption = (option) => {
		const currentValues = mobileActivePendingSecondaryValues;
		let nextValues = currentValues;

		if (option === "ALL") {
			nextValues = currentValues.includes("ALL") ? [] : ["ALL"];
		} else if (currentValues.includes(option)) {
			nextValues = currentValues.filter((entryValue) => entryValue !== option);
		} else {
			nextValues = [...currentValues.filter((entryValue) => entryValue !== "ALL"), option];
		}

		const normalizedValues = normalizeSelectionValuesForField(mobileActiveFilterField, nextValues);
		if (isMobileIncludeMode) {
			setMobilePendingIncludeSecondaryValues(normalizedValues);
			return;
		}

		setMobilePendingExcludeSecondaryValues(normalizedValues);
	};

	const commitMobileSecondaryMenuSelections = () => {
		if (!mobileActiveFilterField) {
			setOpenSecondaryMenu(null);
			return;
		}

		const pendingValues = mobileActivePendingSecondaryValues;
		const targetSetter = isMobileIncludeMode
			? setMobileWorkingIncludeSelections
			: setMobileWorkingExcludeSelections;

		setSelectionValuesForField(targetSetter, mobileActiveFilterField, pendingValues);

		if (isMobileIncludeMode) {
			setMobileIncludeFilterField("");
			setMobileIncludeFilterValue("");
			setMobilePendingIncludeSecondaryValues([]);
		} else {
			setMobileExcludeFilterField("");
			setMobileExcludeFilterValue("");
			setMobilePendingExcludeSecondaryValues([]);
		}

		setOpenSecondaryMenu(null);
	};

	const removeCombinedMobileSelection = (mode, field, value) => {
		if (mode === "include") {
			removeSelection(setMobileWorkingIncludeSelections, field, value);
			return;
		}

		removeSelection(setMobileWorkingExcludeSelections, field, value);
	};
	const includeKeywordSelections = includeSelections
		.filter((entry) => entry.field === "Key Word")
		.map((entry) => entry.value)
		.filter((value) => value && value !== "ALL");

	const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

	const renderDescriptionWithKeywordHighlights = (spellName, description) => {
		if (!description || includeKeywordSelections.length === 0) {
			return description;
		}

		const normalizedSpellName = `${spellName ?? ""}`.toLowerCase();
		const normalizedDescription = `${description}`.toLowerCase();
		const keywordsToHighlight = [...new Set(
			includeKeywordSelections
				.map((keyword) => `${keyword}`.trim())
				.filter(Boolean)
				.filter((keyword) => {
					const normalizedKeyword = keyword.toLowerCase();
					return (
						normalizedDescription.includes(normalizedKeyword)
						&& !normalizedSpellName.includes(normalizedKeyword)
					);
				}),
		)];

		if (keywordsToHighlight.length === 0) {
			return description;
		}

		const keywordPattern = new RegExp(
			`(${keywordsToHighlight
				.sort((firstKeyword, secondKeyword) => secondKeyword.length - firstKeyword.length)
				.map((keyword) => escapeRegExp(keyword))
				.join("|")})`,
			"gi",
		);
		const textSegments = `${description}`.split(keywordPattern);

		return textSegments.map((segment, index) => {
			if (index % 2 === 1) {
				return (
					<mark key={`keyword-highlight-${index}-${segment}`} className="spell-keyword-highlight">
						{segment}
					</mark>
				);
			}

			return <span key={`description-segment-${index}`}>{segment}</span>;
		});
	};

	const selectionKey = (field, value) => `${field}::${value}`;

	const hasSelection = (selections, field, value) => {
		return selections.some((entry) => selectionKey(entry.field, entry.value) === selectionKey(field, value));
	};

	const getSelectionValuesForField = (selections, field) => {
		return selections
			.filter((entry) => entry.field === field)
			.map((entry) => entry.value);
	};

	const normalizeSelectionValuesForField = (field, values) => {
		const dedupedValues = [...new Set(values.map((value) => `${value}`.trim()).filter(Boolean))];
		const secondaryOptions = getSecondaryFilterOptions(field);

		if (secondaryOptions.length === 0) {
			return dedupedValues;
		}

		if (isSingleSelectField(field)) {
			return dedupedValues.length > 0 ? [dedupedValues[dedupedValues.length - 1]] : [];
		}

		if (dedupedValues.includes("ALL")) {
			return ["ALL"];
		}

		const orderedValues = secondaryOptions.filter((option) => dedupedValues.includes(option));
		if (secondaryOptions.length > 0 && orderedValues.length === secondaryOptions.length) {
			return ["ALL"];
		}

		return orderedValues;
	};

	const setSelectionValuesForField = (setSelections, field, values) => {
		setSelections((previous) => {
			const selectionsForOtherFields = previous.filter((entry) => entry.field !== field);
			const normalizedValues = normalizeSelectionValuesForField(field, values);
			return [
				...selectionsForOtherFields,
				...normalizedValues.map((entryValue) => ({ field, value: entryValue })),
			];
		});
	};

	const getPendingSecondaryValues = (menuName) => (
		menuName === "include"
			? pendingIncludeSecondaryValues
			: menuName === "exclude"
				? pendingExcludeSecondaryValues
				: pendingAdvancedSecondaryValues
	);

	const setPendingSecondaryValues = (menuName, values) => {
		if (menuName === "include") {
			setPendingIncludeSecondaryValues(values);
			return;
		}
		if (menuName === "exclude") {
			setPendingExcludeSecondaryValues(values);
			return;
		}
		setPendingAdvancedSecondaryValues(values);
	};

	const addAdvancedBubblesForField = (field, values) => {
		const normalizedValues = normalizeSelectionValuesForField(field, values);
		if (normalizedValues.length === 0) {
			return [];
		}

		setAdvancedBubbles((previous) => {
			const bubblesForOtherFields = isSingleSelectField(field)
				? previous.filter((entry) => entry.field !== field)
				: previous;
			const nextBubbles = [...bubblesForOtherFields];

			normalizedValues.forEach((entryValue) => {
				const alreadyExists = nextBubbles.some(
					(entry) => entry.field === field && entry.value === entryValue,
				);
				if (!alreadyExists) {
					nextBubbles.push({ field, value: entryValue });
				}
			});

			return nextBubbles;
		});

		return normalizedValues;
	};

	const commitSecondaryMenuSelections = (menuName) => {
		if (menuName === "include" && includeFilterField) {
			const normalizedValues = normalizeSelectionValuesForField(includeFilterField, pendingIncludeSecondaryValues);
			setSelectionValuesForField(setIncludeSelections, includeFilterField, pendingIncludeSecondaryValues);
			if (normalizedValues.length > 0) {
				setIncludeFilterField("");
				setIncludeFilterValue("");
				setPendingIncludeSecondaryValues([]);
			}
		}
		if (menuName === "exclude" && excludeFilterField) {
			const normalizedValues = normalizeSelectionValuesForField(excludeFilterField, pendingExcludeSecondaryValues);
			setSelectionValuesForField(setExcludeSelections, excludeFilterField, pendingExcludeSecondaryValues);
			if (normalizedValues.length > 0) {
				setExcludeFilterField("");
				setExcludeFilterValue("");
				setPendingExcludeSecondaryValues([]);
			}
		}
		if (menuName === "advanced" && advancedFilterField) {
			const normalizedValues = addAdvancedBubblesForField(advancedFilterField, pendingAdvancedSecondaryValues);
			if (normalizedValues.length > 0) {
				setAdvancedFilterField("");
				setAdvancedFilterValue("");
				setPendingAdvancedSecondaryValues([]);
			}
		}
		setOpenSecondaryMenu((previous) => (previous === menuName ? null : previous));
	};

	const togglePendingSecondaryOption = (menuName, field, option) => {
		const currentValues = getPendingSecondaryValues(menuName);
		let nextValues = currentValues;

		if (option === "ALL") {
			nextValues = currentValues.includes("ALL") ? [] : ["ALL"];
		} else if (currentValues.includes(option)) {
			nextValues = currentValues.filter((entryValue) => entryValue !== option);
		} else {
			nextValues = [...currentValues.filter((entryValue) => entryValue !== "ALL"), option];
		}

		setPendingSecondaryValues(menuName, normalizeSelectionValuesForField(field, nextValues));
	};

	const getSecondaryMenuButtonLabel = (field, pendingValues) => {
		if (pendingValues.length === 0) {
			return getSecondaryPlaceholder(field);
		}

		if (pendingValues.includes("ALL")) {
			return "ALL";
		}

		if (pendingValues.length === 1) {
			return pendingValues[0];
		}

		return `${pendingValues.length} selected`;
	};

	const addSelection = (setSelections, field, value) => {
		const normalizedValue = value.trim();
		if (!normalizedValue) {
			return;
		}

		setSelections((previous) => {
			const selectionsForField = previous
				.filter((entry) => entry.field === field)
				.map((entry) => entry.value);

			if (!isSingleSelectField(field) && selectionsForField.includes(normalizedValue)) {
				return previous;
			}

			const baseValues = isSingleSelectField(field)
				? []
				: selectionsForField.filter((entryValue) => entryValue !== "ALL");
			const nextValues = normalizedValue === "ALL" ? ["ALL"] : [...baseValues, normalizedValue];
			const selectionsForOtherFields = previous.filter((entry) => entry.field !== field);
			const normalizedValues = normalizeSelectionValuesForField(field, nextValues);

			return [
				...selectionsForOtherFields,
				...normalizedValues.map((entryValue) => ({ field, value: entryValue })),
			];
		});
	};

	const removeSelection = (setSelections, field, value) => {
		setSelections((previous) => previous.filter((entry) => selectionKey(entry.field, entry.value) !== selectionKey(field, value)));
	};

	const formatSpellLevelForClipboard = (levelValue) => {
		const normalizedLevel = `${levelValue ?? ""}`.trim();
		if (!normalizedLevel) {
			return "Unknown-level";
		}

		if (normalizedLevel.toLowerCase() === "cantrip" || normalizedLevel === "0") {
			return "Cantrip-level";
		}

		if (/^\d+$/.test(normalizedLevel)) {
			const levelNumber = Number(normalizedLevel);
			const suffix =
				levelNumber % 10 === 1 && levelNumber % 100 !== 11
					? "st"
					: levelNumber % 10 === 2 && levelNumber % 100 !== 12
						? "nd"
						: levelNumber % 10 === 3 && levelNumber % 100 !== 13
							? "rd"
							: "th";
			return `${levelNumber}${suffix}-level`;
		}

		return `${normalizedLevel}-level`;
	};

	const buildSpellInfoClipboardText = (spell, description) => {
		const classesText = formatClassList(spell.classes);
		const schoolText = `${spell.school ?? ""}`.trim().toLowerCase();
		const levelAndSchoolLine = `${formatSpellLevelForClipboard(spell.level)} ${schoolText}${classesText ? ` (${classesText})` : ""}`.trim();
		const componentsText = `${spell.components ?? ""}`.replace(/\s*,\s*/g, ",").trim();
		const durationText = getDurationDisplayValue({ ...spell, description }) || `${spell.duration ?? ""}`.trim();

		return [
			`${spell.name ?? ""}`.trim(),
			levelAndSchoolLine,
			"",
			`Casting Time: ${spell.castingTime ?? ""}`,
			`Range: ${spell.range ?? ""}`,
			`Components: ${componentsText}`,
			`Duration: ${durationText}`,
			`Ritual: ${spell.ritual ?? ""}`,
			"",
			description,
		]
			.join("\n")
			.trim();
	};

	const handleCopySpellInfo = async (event, spell) => {
		event.stopPropagation();

		let descriptionToCopy = typeof spell?.description === "string" ? spell.description.trim() : "";

		if (!descriptionToCopy) {
			try {
				const spellDetails = await getSpell(spell.id, ownerKey);
				descriptionToCopy = typeof spellDetails?.description === "string" ? spellDetails.description.trim() : "";
			} catch (error) {
				console.error("Error fetching spell details for clipboard copy:", error);
			}
		}

		const clipboardText = buildSpellInfoClipboardText(spell, descriptionToCopy);
		await navigator.clipboard.writeText(clipboardText);
		setCopiedSpellInfoId(spell.id);
		setTimeout(() => setCopiedSpellInfoId(null), 2000);
	};

	const handleSpellNameClick = async (spellId) => {
		try {
			const spell = await getSpell(spellId, ownerKey);
			setCurrentSpellDescription(spell.description);
		} catch (error) {
			console.error("Error fetching spell details:", error);
		} finally {
			setExpandedSpellId((previousId) => (previousId === spellId ? null : spellId));
		}
	};

	const handleSecretCodeSubmit = (e) => {
		e.preventDefault();
		if (secretCode.trim()) {
			sessionStorage.setItem("owner-key", secretCode);
			setOwnerKey(secretCode);
			setSecretCode("");
		}
	};

	const goToPreviousPage = () => {
		setCurrentPage((previousPage) => Math.max(1, previousPage - 1));
	};

	const goToNextPage = () => {
		setCurrentPage((previousPage) => Math.min(totalPages, previousPage + 1));
	};

	const addAdvancedBubble = (field, value) => {
		const normalizedValue = value.trim();
		if (!normalizedValue) {
			return;
		}

		setAdvancedBubbles((previous) => {
			if (isSingleSelectField(field)) {
				const bubblesForOtherFields = previous.filter((entry) => entry.field !== field);
				return [...bubblesForOtherFields, { field, value: normalizedValue }];
			}

			const alreadyExists = previous.some(
				(entry) => entry.field === field && entry.value === normalizedValue,
			);

			if (alreadyExists) {
				return previous;
			}

			return [...previous, { field, value: normalizedValue }];
		});
	};

	const createDisplayTableBubble = (bubble) => ({
		id: `display-bubble-${displayBubbleIdCounterRef.current++}`,
		label: bubble.label,
		type: bubble.type,
		field: bubble.field ?? null,
		value: bubble.value ?? bubble.label,
	});
	const buildDisplayTableBubblesFromBasicSelections = (includeEntries, excludeEntries) => {
		const bubbles = [];

		includeEntries.forEach((entry, index) => {
			if (index > 0) {
				bubbles.push(createDisplayTableBubble({ label: "AND", type: "static" }));
			}

			bubbles.push(
				createDisplayTableBubble({
					label: entry.value,
					type: "dynamic",
					field: entry.field,
					value: entry.value,
				}),
			);
		});

		excludeEntries.forEach((entry) => {
			bubbles.push(createDisplayTableBubble({ label: "NOT", type: "static" }));
			bubbles.push(
				createDisplayTableBubble({
					label: entry.value,
					type: "dynamic",
					field: entry.field,
					value: entry.value,
				}),
			);
		});

		return bubbles;
	};

	const parseBasicSelectionsFromDisplayTableBubbles = (displayEntries) => {
		const parsedIncludeSelections = [];
		const parsedExcludeSelections = [];
		let shouldExcludeNextDynamic = false;

		displayEntries.forEach((entry) => {
			if (entry.type === "static") {
				if (entry.label === "NOT") {
					shouldExcludeNextDynamic = true;
				}
				return;
			}

			const entryField = entry.field ?? "Key Word";
			const entryValue = (entry.value ?? entry.label ?? "").trim();
			if (!entryValue) {
				shouldExcludeNextDynamic = false;
				return;
			}

			const targetSelections = shouldExcludeNextDynamic
				? parsedExcludeSelections
				: parsedIncludeSelections;
			const key = selectionKey(entryField, entryValue);

			if (!targetSelections.some((selectionEntry) => selectionKey(selectionEntry.field, selectionEntry.value) === key)) {
				targetSelections.push({ field: entryField, value: entryValue });
			}

			shouldExcludeNextDynamic = false;
		});

		return {
			parsedIncludeSelections,
			parsedExcludeSelections,
		};
	};

	const handleAdvancedSubmit = () => {
		const { parsedIncludeSelections, parsedExcludeSelections } =
			parseBasicSelectionsFromDisplayTableBubbles(displayTableBubbles);

		skipBasicToAdvancedSyncRef.current = true;
		setIncludeSelections(parsedIncludeSelections);
		setExcludeSelections(parsedExcludeSelections);
		setIsAdvancedSubmitErrorVisible(true);
	};

	const isPointInsideDynamicBubbleArea = (xPosition, yPosition) => {
		const containerElement = dynamicBubblesContainerRef.current;
		if (!containerElement) {
			return false;
		}

		const containerBounds = containerElement.getBoundingClientRect();
		return (
			xPosition >= containerBounds.left &&
			xPosition <= containerBounds.right &&
			yPosition >= containerBounds.top &&
			yPosition <= containerBounds.bottom
		);
	};

	const isPointInsideDisplayTableBubbleArea = (xPosition, yPosition) => {
		const containerElement = displayTableBubblesRef.current;
		if (!containerElement) {
			return false;
		}

		const containerBounds = containerElement.getBoundingClientRect();
		return (
			xPosition >= containerBounds.left &&
			xPosition <= containerBounds.right &&
			yPosition >= containerBounds.top &&
			yPosition <= containerBounds.bottom
		);
	};

	const setDynamicBubbleRef = (key, element) => {
		if (element) {
			dynamicBubbleRefs.current.set(key, element);
			return;
		}

		dynamicBubbleRefs.current.delete(key);
	};

	const setDisplayBubbleRef = (id, element) => {
		if (element) {
			displayBubbleRefs.current.set(id, element);
			return;
		}

		displayBubbleRefs.current.delete(id);
	};

	const findDynamicInsertionIndex = (bubbleEntries, pointerX, pointerY, draggingKey) => {
		const remainingEntries = bubbleEntries
			.filter((entry) => selectionKey(entry.field, entry.value) !== draggingKey)
			.map((entry) => {
				const key = selectionKey(entry.field, entry.value);
				const element = dynamicBubbleRefs.current.get(key);
				if (!element) {
					return null;
				}

				return {
					key,
					bounds: element.getBoundingClientRect(),
				};
			})
			.filter(Boolean);

		if (remainingEntries.length === 0) {
			return 0;
		}

		for (let index = 0; index < remainingEntries.length; index += 1) {
			const { bounds } = remainingEntries[index];
			if (pointerY < bounds.top) {
				return index;
			}

			if (pointerY <= bounds.bottom) {
				if (pointerX < bounds.left + bounds.width / 2) {
					return index;
				}
			}
		}

		return remainingEntries.length;
	};

	const reorderDynamicBubbleByDropPoint = (draggingKey, pointerX, pointerY) => {
		setAdvancedBubbles((previousBubbles) => {
			const draggingEntry = previousBubbles.find(
				(entry) => selectionKey(entry.field, entry.value) === draggingKey,
			);

			if (!draggingEntry) {
				return previousBubbles;
			}

			const bubblesWithoutDragged = previousBubbles.filter(
				(entry) => selectionKey(entry.field, entry.value) !== draggingKey,
			);
			const insertionIndex = findDynamicInsertionIndex(
				previousBubbles,
				pointerX,
				pointerY,
				draggingKey,
			);
			const nextBubbles = [...bubblesWithoutDragged];
			nextBubbles.splice(insertionIndex, 0, draggingEntry);
			return nextBubbles;
		});
	};

	const findDisplayInsertionIndex = (displayEntries, pointerX, pointerY) => {
		const positionedEntries = displayEntries
			.filter((entry) =>
				draggingBubble?.type === "display" ? entry.id !== draggingBubble.id : true,
			)
			.map((entry) => {
				const element = displayBubbleRefs.current.get(entry.id);
				if (!element) {
					return null;
				}

				return {
					id: entry.id,
					bounds: element.getBoundingClientRect(),
				};
			})
			.filter(Boolean);

		if (positionedEntries.length === 0) {
			return 0;
		}

		for (let index = 0; index < positionedEntries.length; index += 1) {
			const { bounds } = positionedEntries[index];
			if (pointerY < bounds.top) {
				return index;
			}

			if (pointerY <= bounds.bottom && pointerX < bounds.left + bounds.width / 2) {
				return index;
			}
		}

		return positionedEntries.length;
	};

	const insertDisplayTableBubbleByDropPoint = (draggedBubble, pointerX, pointerY) => {
		setDisplayTableBubbles((previousBubbles) => {
			const insertionIndex = findDisplayInsertionIndex(previousBubbles, pointerX, pointerY);
			const bubbleType =
				draggedBubble.type === "display" ? draggedBubble.bubbleType : draggedBubble.type;
			const nextBubbles = [...previousBubbles];
			nextBubbles.splice(insertionIndex, 0, {
				id: `display-bubble-${displayBubbleIdCounterRef.current}`,
				label: draggedBubble.label,
				type: bubbleType,
				field: draggedBubble.field ?? draggedBubble.bubbleField ?? null,
				value: draggedBubble.value ?? draggedBubble.bubbleValue ?? draggedBubble.label,
			});
			displayBubbleIdCounterRef.current += 1;
			return nextBubbles;
		});
	};

	const reorderDisplayBubbleByDropPoint = (displayBubbleId, pointerX, pointerY) => {
		setDisplayTableBubbles((previousBubbles) => {
			const draggingEntry = previousBubbles.find((entry) => entry.id === displayBubbleId);

			if (!draggingEntry) {
				return previousBubbles;
			}

			const bubblesWithoutDragged = previousBubbles.filter(
				(entry) => entry.id !== displayBubbleId,
			);
			const insertionIndex = findDisplayInsertionIndex(
				previousBubbles,
				pointerX,
				pointerY,
			);
			const nextBubbles = [...bubblesWithoutDragged];
			nextBubbles.splice(insertionIndex, 0, draggingEntry);
			return nextBubbles;
		});
	};

	const isPointOutsideSpellFilterWrapper = (xPosition, yPosition) => {
		const wrapperElement = spellFilterWrapperRef.current;
		if (!wrapperElement) {
			return false;
		}

		const wrapperBounds = wrapperElement.getBoundingClientRect();
		return (
			xPosition < wrapperBounds.left ||
			xPosition > wrapperBounds.right ||
			yPosition < wrapperBounds.top ||
			yPosition > wrapperBounds.bottom
		);
	};

	const isPointInsideDeleteBox = (xPosition, yPosition) => {
		const deleteBoxElement = filterBubbleDeleteBoxRef.current;
		if (!deleteBoxElement) {
			return false;
		}

		const deleteBoxBounds = deleteBoxElement.getBoundingClientRect();
		return (
			xPosition >= deleteBoxBounds.left &&
			xPosition <= deleteBoxBounds.right &&
			yPosition >= deleteBoxBounds.top &&
			yPosition <= deleteBoxBounds.bottom
		);
	};

	const beginBubbleDrag = (event, bubble) => {
		if (event.button !== 0) {
			return;
		}

		event.preventDefault();
		const bubbleBounds = event.currentTarget.getBoundingClientRect();
		const nextDraggingBubble = {
			...bubble,
			x: bubbleBounds.left,
			y: bubbleBounds.top,
			offsetX: event.clientX - bubbleBounds.left,
			offsetY: event.clientY - bubbleBounds.top,
		};
		draggingBubbleRef.current = nextDraggingBubble;
		setDraggingBubble(nextDraggingBubble);
		dragReleaseHandledRef.current = false;
		setSourceDropPreviewIndex(null);
		setDisplayDropPreviewIndex(null);
		setIsOutsideDeleteZone(false);
	};

	useEffect(() => {
		draggingBubbleRef.current = draggingBubble;
	}, [draggingBubble]);

	useEffect(() => {
		if (skipBasicToAdvancedSyncRef.current) {
			skipBasicToAdvancedSyncRef.current = false;
			return;
		}

		setDisplayTableBubbles(
			buildDisplayTableBubblesFromBasicSelections(includeSelections, excludeSelections),
		);
	}, [includeSelections, excludeSelections]);

	useEffect(() => {
		if (!draggingBubble) {
			return undefined;
		}

		const handlePointerMove = (event) => {
			const pointerInsideDeleteBox = isPointInsideDeleteBox(
				event.clientX,
				event.clientY,
			);
			setIsOutsideDeleteZone(pointerInsideDeleteBox);

			if (
				draggingBubble.type === "dynamic" &&
				!pointerInsideDeleteBox &&
				isPointInsideDynamicBubbleArea(event.clientX, event.clientY)
			) {
				setSourceDropPreviewIndex(
					findDynamicInsertionIndex(
						advancedBubbles,
						event.clientX,
						event.clientY,
						draggingBubble.key,
					),
				);
			} else {
				setSourceDropPreviewIndex(null);
			}

			if (!pointerInsideDeleteBox && isPointInsideDisplayTableBubbleArea(event.clientX, event.clientY)) {
				setDisplayDropPreviewIndex(
					findDisplayInsertionIndex(displayTableBubbles, event.clientX, event.clientY),
				);
			} else {
				setDisplayDropPreviewIndex(null);
			}

			setDraggingBubble((previousDragState) => {
				if (!previousDragState) {
					return previousDragState;
				}

				return {
					...previousDragState,
					x: event.clientX - previousDragState.offsetX,
					y: event.clientY - previousDragState.offsetY,
				};
			});
		};

		const handlePointerRelease = (event) => {
			if (dragReleaseHandledRef.current) {
				return;
			}
			dragReleaseHandledRef.current = true;

			setSourceDropPreviewIndex(null);
			setDisplayDropPreviewIndex(null);
			setIsOutsideDeleteZone(false);

			const previousDragState = draggingBubbleRef.current;
			if (!previousDragState) {
				return;
			}

			const droppedInDeleteBox = isPointInsideDeleteBox(
				event.clientX,
				event.clientY,
			);

			if (droppedInDeleteBox && previousDragState.type === "dynamic") {
				setAdvancedBubbles((previousBubbles) =>
					previousBubbles.filter(
						(entry) => selectionKey(entry.field, entry.value) !== previousDragState.key,
					),
				);
			} else if (droppedInDeleteBox && previousDragState.type === "display") {
				setDisplayTableBubbles((previousBubbles) =>
					previousBubbles.filter((entry) => entry.id !== previousDragState.id),
				);
			} else if (isPointInsideDisplayTableBubbleArea(event.clientX, event.clientY)) {
				if (previousDragState.type === "display") {
					reorderDisplayBubbleByDropPoint(
						previousDragState.id,
						event.clientX,
						event.clientY,
					);
				} else {
					if (previousDragState.type === "dynamic") {
						setAdvancedBubbles((previousBubbles) =>
							previousBubbles.filter(
								(entry) =>
									selectionKey(entry.field, entry.value) !== previousDragState.key,
							),
						);
					}

					insertDisplayTableBubbleByDropPoint(previousDragState, event.clientX, event.clientY);
				}
			} else if (
				previousDragState.type === "dynamic" &&
				isPointInsideDynamicBubbleArea(event.clientX, event.clientY)
			) {
				reorderDynamicBubbleByDropPoint(
					previousDragState.key,
					event.clientX,
					event.clientY,
				);
			}

			draggingBubbleRef.current = null;
			setDraggingBubble(null);
		};

		window.addEventListener("pointermove", handlePointerMove);
		window.addEventListener("pointerup", handlePointerRelease);
		window.addEventListener("pointercancel", handlePointerRelease);

		return () => {
			window.removeEventListener("pointermove", handlePointerMove);
			window.removeEventListener("pointerup", handlePointerRelease);
			window.removeEventListener("pointercancel", handlePointerRelease);
		};
	}, [advancedBubbles, displayTableBubbles, draggingBubble]);

	const draggedDynamicBubbleKey = draggingBubble?.type === "dynamic" ? draggingBubble.key : null;
	const dynamicBubblesForRender = draggedDynamicBubbleKey
		? advancedBubbles.filter(
			(entry) => selectionKey(entry.field, entry.value) !== draggedDynamicBubbleKey,
		)
		: advancedBubbles;
	const draggedDisplayBubbleId = draggingBubble?.type === "display" ? draggingBubble.id : null;
	const displayBubblesForRender = draggedDisplayBubbleId
		? displayTableBubbles.filter((entry) => entry.id !== draggedDisplayBubbleId)
		: displayTableBubbles;
	const shouldShowSourceDropGhost =
		draggedDynamicBubbleKey !== null &&
		sourceDropPreviewIndex !== null &&
		!isOutsideDeleteZone;
	const shouldShowDisplayDropGhost =
		draggingBubble !== null &&
		displayDropPreviewIndex !== null &&
		!isOutsideDeleteZone;

	useEffect(() => {
		if (!isAdvancedSubmitErrorVisible) {
			return undefined;
		}

		const hideTimer = window.setTimeout(() => {
			setIsAdvancedSubmitErrorVisible(false);
		}, 10000);

		return () => {
			window.clearTimeout(hideTimer);
		};
	}, [isAdvancedSubmitErrorVisible]);

	useEffect(() => {
		if (isAdvancedSubmitErrorVisible) {
			setIsAdvancedSubmitErrorVisible(false);
		}
	}, [displayTableBubbles]);

	useEffect(() => {
		if (!isGuidedTutorialModalOpen) {
			return;
		}

		if (guidedTutorialStep >= 9) {
			setFilterView("advanced");
			setOpenSecondaryMenu(null);
			return;
		}

		setFilterView("basic");
	}, [guidedTutorialStep, isGuidedTutorialModalOpen]);

	useEffect(() => {
		if (!isGuidedTutorialModalOpen) {
			return;
		}

		if (guidedTutorialStep === 6) {
			setIncludeSelections([{ field: "Class", value: "Bard" }]);
			setExcludeSelections([]);
			setIncludeFilterField("Class");
			setExcludeFilterField("");
			setIncludeFilterValue("");
			setExcludeFilterValue("");
			setPendingIncludeSecondaryValues(["Bard"]);
			setPendingExcludeSecondaryValues([]);
			setOpenSecondaryMenu(null);
			return;
		}

		if (guidedTutorialStep === 7) {
			setExcludeSelections([{ field: "Level", value: "Cantrip" }]);
			setExcludeFilterField("Level");
			setExcludeFilterValue("");
			setPendingExcludeSecondaryValues(["Cantrip"]);
			setOpenSecondaryMenu(null);
		}
	}, [guidedTutorialStep, isGuidedTutorialModalOpen]);

	useEffect(() => {
		if (!isGuidedTutorialModalOpen || guidedTutorialStep !== 10) {
			return;
		}

		setDisplayTableBubbles((previousBubbles) => {
			if (previousBubbles.length > 0) {
				return previousBubbles;
			}

			return [
				createDisplayTableBubble({ label: "Wizard", type: "dynamic", field: "Class", value: "Wizard" }),
				createDisplayTableBubble({ label: "AND", type: "static" }),
				createDisplayTableBubble({ label: "Warlock", type: "dynamic", field: "Class", value: "Warlock" }),
				createDisplayTableBubble({ label: "NOT", type: "static" }),
				createDisplayTableBubble({ label: "fire", type: "dynamic", field: "Key Word", value: "fire" }),
			];
		});
	}, [guidedTutorialStep, isGuidedTutorialModalOpen]);

	useEffect(() => {
		if (!isGuidedTutorialModalOpen || guidedTutorialStep !== 11 || !spellListWrapperRef.current) {
			return;
		}

		const updateTutorialDeleteBoxBounds = () => {
			const bounds = spellListWrapperRef.current.getBoundingClientRect();
			setDeleteBoxBounds({
				top: bounds.top,
				left: bounds.left,
				width: bounds.width,
				height: bounds.height,
			});
		};

		updateTutorialDeleteBoxBounds();
		const frameId = window.requestAnimationFrame(updateTutorialDeleteBoxBounds);

		return () => {
			window.cancelAnimationFrame(frameId);
		};
	}, [guidedTutorialStep, isGuidedTutorialModalOpen]);

	useEffect(() => {
		if (!isGuidedTutorialModalOpen) {
			setGuidedTutorialSpotlights([]);
			return;
		}

		const highlightSelectors = {
			2: ['.column-view-section'],
			3: ['.sort-by-toggle-section'],
			4: ['.page-of-spell-list'],
			5: ['.spell-filter-wrapper'],
			6: ['.basic-filter-include'],
			7: ['.basic-filter-exclude'],
			8: ['.main-spell-searcher-page-spellbook-buttons'],
			9: ['.advanced-formula-pieces'],
			10: ['.advanced-formula-display'],
			11: ['.filter-bubble-delete-box'],
		};

		const selectors = highlightSelectors[guidedTutorialStep];
		if (!selectors) {
			setGuidedTutorialSpotlights([]);
			return;
		}

		const updateSpotlights = () => {
			const padding = 6;
			const spots = selectors
				.map((selector) => document.querySelector(selector))
				.filter(Boolean)
				.map((target) => {
					const rect = target.getBoundingClientRect();
					return {
						x: rect.left + rect.width / 2,
						y: rect.top + rect.height / 2,
						width: rect.width + padding * 2,
						height: rect.height + padding * 2,
						shape: 'rect'
					};
				});

			setGuidedTutorialSpotlights(spots);
		};

		updateSpotlights();
		const firstFrameId = window.requestAnimationFrame(() => {
			window.requestAnimationFrame(updateSpotlights);
		});

		return () => {
			window.cancelAnimationFrame(firstFrameId);
		};
	}, [deleteBoxBounds, filterView, guidedTutorialStep, isGuidedTutorialModalOpen]);

	useEffect(() => {
		const handleOpenTutorial = () => {
			tutorialStateSnapshotRef.current = {
				filterView,
				includeSelections: cloneSelectionEntries(includeSelections),
				excludeSelections: cloneSelectionEntries(excludeSelections),
				includeFilterField,
				excludeFilterField,
				includeFilterValue,
				excludeFilterValue,
				pendingIncludeSecondaryValues: [...pendingIncludeSecondaryValues],
				pendingExcludeSecondaryValues: [...pendingExcludeSecondaryValues],
				advancedFilterField,
				advancedFilterValue,
				pendingAdvancedSecondaryValues: [...pendingAdvancedSecondaryValues],
				advancedBubbles: cloneSelectionEntries(advancedBubbles),
				displayTableBubbles: cloneDisplayBubbleEntries(displayTableBubbles),
				openSecondaryMenu,
			};

			const scrollContainer = document.querySelector('.spell-search-page-scroll');
			if (scrollContainer) {
				scrollContainer.scrollTop = 0;
			}
			window.scrollTo({ top: 0, behavior: 'auto' });
			setIsGuidedTutorialModalOpen(true);
			setGuidedTutorialStep(1);
		};
		window.addEventListener('open-spell-tutorial', handleOpenTutorial);
		return () => window.removeEventListener('open-spell-tutorial', handleOpenTutorial);
	}, [
		advancedBubbles,
		advancedFilterField,
		advancedFilterValue,
		displayTableBubbles,
		excludeFilterField,
		excludeFilterValue,
		excludeSelections,
		filterView,
		includeFilterField,
		includeFilterValue,
		includeSelections,
		openSecondaryMenu,
		pendingAdvancedSecondaryValues,
		pendingExcludeSecondaryValues,
		pendingIncludeSecondaryValues,
	]);

	useEffect(() => {
		if (!openSecondaryMenu) {
			return undefined;
		}

		if (isMobileFiltersModalOpen && (openSecondaryMenu === "include" || openSecondaryMenu === "exclude")) {
			return undefined;
		}

		const activeRef = openSecondaryMenu === "include"
			? includeSecondaryDropdownRef.current
			: openSecondaryMenu === "exclude"
				? excludeSecondaryDropdownRef.current
				: advancedSecondaryDropdownRef.current;

		const handlePointerDownOutside = (event) => {
			if (activeRef && !activeRef.contains(event.target)) {
				commitSecondaryMenuSelections(openSecondaryMenu);
			}
		};

		document.addEventListener("pointerdown", handlePointerDownOutside);
		return () => {
			document.removeEventListener("pointerdown", handlePointerDownOutside);
		};
	}, [
		openSecondaryMenu,
		isMobileFiltersModalOpen,
		pendingIncludeSecondaryValues,
		pendingExcludeSecondaryValues,
		pendingAdvancedSecondaryValues,
		includeFilterField,
		excludeFilterField,
		advancedFilterField,
	]);

	return (
		<div>
			{isLoading ? (
			<div className="loading-indicator" role="status" aria-live="polite">
				Loading spells...
			</div>
		) : (
			<div className="spell-search-page-root">
		<div className="spell-search-page-scroll">
		<div className="spell-search-page-container">
		<div className="spell-search-page">
			<div className="spell-list-wrapper" ref={spellListWrapperRef}>
				<div className="app-container-spell-searcher">
				<div className="spell-search-sort-bar">
					<div className="column-view-section">
						<button
							type="button"
							className="column-view-button"
							onClick={() => setIsColumnViewOpen(true)}
							aria-label="Open column view modal"
						/>
					</div>
					<div className="sort-by-toggle-section">
						<div className="text-and-toggles">
							<span className="sort-by-label">Sort By:</span>
						<button
							type="button"
							className={`sort-by-toggle ${isAlphabetical ? "is-alphabetical" : "is-level"}`}
							onClick={() => setSortBy(isAlphabetical ? "level" : "alphabetical")}
							aria-pressed={isAlphabetical}
							aria-label="Toggle spell sort order"
						>
							<span className="sort-by-switch" aria-hidden="true" />
							<span className="sort-by-option">Level</span>
							<span className="sort-by-option">Alphabetical</span>
						</button>
						<button
							type="button"
							className={`sort-by-toggle ${isDescending ? "is-descending" : "is-ascending"}`}
							onClick={() => setSortDirection(isDescending ? "ascending" : "descending")}
							aria-pressed={isDescending}
							aria-label="Toggle sort direction"
						>
							<span className="sort-by-switch" aria-hidden="true" />
							<span className="sort-by-option">Ascending</span>
							<span className="sort-by-option">Descending</span>
						</button>
					</div>
					</div>
					<div className="page-of-spell-list">
						<button
							type="button"
							className="page-of-spell-list-arrow-button is-left"
							onClick={goToPreviousPage}
							disabled={isOnFirstPage}
							aria-disabled={isOnFirstPage}
							aria-label="Previous spell list page"
						/>
						<div className="page-of-spell-list-left">
							<span className="page-of-spell-list-text">{currentPage}{"\u00A0\u00A0\u00A0"}o</span>
						</div>
						<div className="page-of-spell-list-right">
							<span className="page-of-spell-list-text">f{"\u00A0\u00A0\u00A0"}{totalPages}</span>
						</div>
						<button
							type="button"
							className="page-of-spell-list-arrow-button is-right"
							onClick={goToNextPage}
							disabled={isOnLastPage}
							aria-disabled={isOnLastPage}
							aria-label="Next spell list page"
						/>
						<button
							type="button"
							className="mobile-filters-button"
							onClick={openMobileFiltersModal}
							aria-label="Open filters"
						>
							Filters
						</button>
					</div>
				</div>
				<div className="spell-search-spell-list">
					{spellItems.map((spell) => (
						<div key={spell.id} className="spell-list-item">
							<div className="spell-list-row" onClick={() => handleSpellNameClick(spell.id)}>
								<button
									type="button"
									className={`spell-copy-info-button${copiedSpellInfoId === spell.id ? " is-copied" : ""}`}
									aria-label={`Copy spell info for ${spell.name}`}
									onClick={(event) => {
										void handleCopySpellInfo(event, spell);
									}}
								>
									<img src={copyScrollIcon} alt="" className="spell-copy-description-icon" />
								</button>
								<label
									className="spell-list-cell spell-list-checkbox-cell"
									aria-label={`Select ${spell.name}`}
									onClick={(event) => event.stopPropagation()}
								>
									<input
										type="checkbox"
										className="spell-row-checkbox"
										onClick={(event) => event.stopPropagation()}
									/>
								</label>
								<div className="spell-list-cell spell-list-name-cell">
									<button
										type="button"
										className="spell-name-button"
										onClick={(event) => {
											event.stopPropagation();
											handleSpellNameClick(spell.id);
										}}
										aria-expanded={expandedSpellId === spell.id}
										aria-controls={`spell-accordion-${spell.id}`}
									>
										{spell.name}
									</button>
								</div>
								<div className="mobile-row-level-cell" aria-label="Spell level">
									<div className="spell-column-header">Level</div>
									<div className="spell-cell-value">{spell.level}</div>
								</div>
								<div className="spell-list-details-grid" role="group" aria-label={`${spell.name} spell details`}>
									{visibleColumns.level ? (
										<div className="spell-list-cell">
											<div className="spell-column-header">Level</div>
											<div className="spell-cell-value">{spell.level}</div>
										</div>
									) : null}
									{visibleColumns.school ? (
										<div className="spell-list-cell">
											<div className="spell-column-header">School</div>
											<div className="spell-cell-value">{spell.school}</div>
										</div>
									) : null}
									{visibleColumns.castingTime ? (
										<div className="spell-list-cell">
											<div className="spell-column-header">Casting Time</div>
											<div className="spell-cell-value">{spell.castingTime}</div>
										</div>
									) : null}
									{visibleColumns.range ? (
										<div className="spell-list-cell">
											<div className="spell-column-header">Range</div>
											<div className="spell-cell-value">{spell.range}</div>
										</div>
									) : null}
									{visibleColumns.duration ? (
										<div className="spell-list-cell">
											<div className="spell-column-header">Duration</div>
											<div className="spell-cell-value">{getDurationDisplayValue(spell)}</div>
										</div>
									) : null}
									{visibleColumns.components ? (
										<div className="spell-list-cell">
											<div className="spell-column-header">Components</div>
											<div className="spell-cell-value">{spell.components}</div>
										</div>
									) : null}
									{visibleColumns.ritual ? (
										<div className="spell-list-cell">
											<div className="spell-column-header">Ritual</div>
											<div className="spell-cell-value">{spell.ritual}</div>
										</div>
									) : null}
									{visibleColumns.classes ? (
										<div className="spell-list-cell">
											<div className="spell-column-header">Classes</div>
											<div className="spell-cell-value spell-cell-value-classes">{formatClassList(spell.classes)}</div>
										</div>
									) : null}
								</div>
								<div className="tablet-row-details-grid" role="group" aria-label={`${spell.name} tablet spell details`}>
									<div className="spell-list-cell">
										<div className="spell-column-header">Level</div>
										<div className="spell-cell-value">{spell.level}</div>
									</div>
									<div className="spell-list-cell">
										<div className="spell-column-header">School</div>
										<div className="spell-cell-value">{spell.school}</div>
									</div>
									<div className="spell-list-cell">
										<div className="spell-column-header">Classes</div>
										<div className="spell-cell-value spell-cell-value-classes">{formatClassList(spell.classes)}</div>
									</div>
								</div>
							</div>
							<div
								id={`spell-accordion-${spell.id}`}
								className={`spell-row-accordion ${expandedSpellId === spell.id ? "is-open" : "is-closed"}`}
								aria-hidden={expandedSpellId !== spell.id}
							>
								<div className="spell-row-accordion-content">
									<button
										type="button"
										className={`spell-copy-description-button${copiedSpellId === spell.id ? " is-copied" : ""}`}
										aria-label="Copy description"
										onClick={() => {
											navigator.clipboard.writeText(currentSpellDescription ?? "");
											setCopiedSpellId(spell.id);
											setTimeout(() => setCopiedSpellId(null), 2000);
										}}
									>
										<img src={copyScrollIcon} alt="" className="spell-copy-description-icon" />
									</button>
									<div className="tablet-accordion-details-grid" role="group" aria-label={`${spell.name} tablet accordion details`}>
										<div className="tablet-accordion-cell">
											<div className="spell-column-header">Casting Time</div>
											<div className="spell-cell-value">{spell.castingTime}</div>
										</div>
										<div className="tablet-accordion-cell">
											<div className="spell-column-header">Range</div>
											<div className="spell-cell-value">{spell.range}</div>
										</div>
										<div className="tablet-accordion-cell">
											<div className="spell-column-header">Duration</div>
											<div className="spell-cell-value">{getDurationDisplayValue(spell)}</div>
										</div>
										<div className="tablet-accordion-cell">
											<div className="spell-column-header">Components</div>
											<div className="spell-cell-value">{spell.components}</div>
										</div>
										<div className="tablet-accordion-cell">
											<div className="spell-column-header">Ritual</div>
											<div className="spell-cell-value">{spell.ritual}</div>
										</div>
									</div>
									<div className="spell-accordion-description-body">
										{renderDescriptionWithKeywordHighlights(spell.name, currentSpellDescription)}
									</div>
									<div className="mobile-accordion-details-grid" role="group" aria-label={`${spell.name} mobile spell details`}>
										<div className="mobile-accordion-cell">
											<div className="spell-column-header">School</div>
											<div className="spell-cell-value">{spell.school}</div>
										</div>
										<div className="mobile-accordion-cell">
											<div className="spell-column-header">Casting Time</div>
											<div className="spell-cell-value">{spell.castingTime}</div>
										</div>
										<div className="mobile-accordion-cell">
											<div className="spell-column-header">Range</div>
											<div className="spell-cell-value">{spell.range}</div>
										</div>
										<div className="mobile-accordion-cell">
											<div className="spell-column-header">Duration</div>
											<div className="spell-cell-value">{getDurationDisplayValue(spell)}</div>
										</div>
										<div className="mobile-accordion-cell">
											<div className="spell-column-header">Components</div>
											<div className="spell-cell-value">{spell.components}</div>
										</div>
										<div className="mobile-accordion-cell">
											<div className="spell-column-header">Ritual</div>
											<div className="spell-cell-value">{spell.ritual}</div>
										</div>
										<div className="mobile-accordion-cell mobile-accordion-cell-span-two">
											<div className="spell-column-header">Classes</div>
											<div className="spell-cell-value spell-cell-value-classes">{formatClassList(spell.classes)}</div>
										</div>
										<div className="mobile-accordion-cell mobile-accordion-cell-span-two">
											<div className="spell-column-header">Description</div>
											<div className="spell-cell-value mobile-accordion-description-value">
												{renderDescriptionWithKeywordHighlights(spell.name, currentSpellDescription)}
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					))}
					{loadError ? <div className="spell-list-empty-state">{loadError}</div> : null}
					{!loadError && spellItems.length === 0 ? (
						<div className="spell-list-empty-state">{emptySpellMessage}</div>
					) : null}
				</div>
				</div> {/* app-container-spell-searcher */}
				{isMobileFiltersModalOpen ? (
					<div className="mobile-filters-modal-backdrop" onClick={closeMobileFiltersModalAndClearList}>
						<div
							className="mobile-filters-modal"
							role="dialog"
							aria-modal="true"
							aria-label="Spell filters"
							onClick={(event) => event.stopPropagation()}
						>
							<button
								type="button"
								className="mobile-filters-modal-close"
								onClick={closeMobileFiltersModalAndClearList}
								aria-label="Close filters"
							>
								X
							</button>
							<div className="mobile-filters-modal-content">
								<div className="mobile-filters-modal-top">
									<div className="mobile-filter-mode-dropdown">
										<select
											className="basic-filter-select"
											value={mobileFilterMode}
											onChange={(event) => {
												setOpenSecondaryMenu(null);
												setMobileFilterMode(event.target.value);
											}}
											aria-label="Select mobile filter mode"
										>
											<option value="include">Include</option>
											<option value="exclude">Exclude</option>
										</select>
									</div>
									<div className="basic-filter-include-dropdown">
										<select
											className="basic-filter-select"
											value={mobileActiveFilterField}
											onChange={(event) => setMobileActiveFilterField(event.target.value)}
											aria-label="Select mobile filter field"
										>
											<option value="">Select a Filter Category</option>
											{filterFieldOptions.map((option) => (
												<option key={option} value={option}>{option}</option>
											))}
										</select>
									</div>
									<div className="basic-filter-include-secondary-dropdown">
										{!mobileActiveFilterField ? (
											<select className="basic-filter-select basic-filter-select-disabled-placeholder" disabled aria-label="Mobile filter value unavailable">
												<option>---</option>
											</select>
										) : mobileActiveFilterField === "Range" ? (
											renderRangeSlider(
												isMobileIncludeMode ? mobileIncludeRangeLow : mobileExcludeRangeLow,
												isMobileIncludeMode ? setMobileIncludeRangeLow : setMobileExcludeRangeLow,
												isMobileIncludeMode ? mobileIncludeRangeHigh : mobileExcludeRangeHigh,
												isMobileIncludeMode ? setMobileIncludeRangeHigh : setMobileExcludeRangeHigh,
												(low, high) => applyRangeToSelections(isMobileIncludeMode ? setMobileWorkingIncludeSelections : setMobileWorkingExcludeSelections, low, high),
											)
										) : isTextEntryField(mobileActiveFilterField) ? (
											<input
												type="text"
												className="basic-filter-input"
												value={mobileActiveFilterValue}
												onChange={(event) => setMobileActiveFilterValue(event.target.value)}
												placeholder={`type ${mobileActiveFilterField.toLowerCase()}`}
												onKeyDown={(event) => {
													if (event.key === "Enter") {
														event.preventDefault();
														addMobileSelection(mobileActiveFilterField, mobileActiveFilterValue);
														setMobileActiveFilterValue("");
													}
												}}
												aria-label={`Mobile ${mobileActiveFilterField.toLowerCase()} value`}
											/>
										) : usesDeferredSecondaryMenu(mobileActiveFilterField) ? (
											<div
												className="secondary-multi-select"
												ref={isMobileIncludeMode ? includeSecondaryDropdownRef : excludeSecondaryDropdownRef}
											>
												<button
													type="button"
													className={`secondary-multi-select-trigger${openSecondaryMenu === mobileOpenSecondaryMenuKey ? " is-open" : ""}`}
													onClick={() => {
														if (openSecondaryMenu === mobileOpenSecondaryMenuKey) {
															return;
														}
														if (isMobileIncludeMode) {
															setMobilePendingIncludeSecondaryValues(getSelectionValuesForField(mobileWorkingIncludeSelections, mobileIncludeFilterField));
														} else {
															setMobilePendingExcludeSecondaryValues(getSelectionValuesForField(mobileWorkingExcludeSelections, mobileExcludeFilterField));
														}
														setOpenSecondaryMenu(mobileOpenSecondaryMenuKey);
													}}
													aria-expanded={openSecondaryMenu === mobileOpenSecondaryMenuKey}
													aria-label="Select mobile filter values"
												>
													<span>{getSecondaryMenuButtonLabel(mobileActiveFilterField, mobileActivePendingSecondaryValues)}</span>
													<span className="secondary-multi-select-arrow" aria-hidden="true">▾</span>
												</button>
												{openSecondaryMenu === mobileOpenSecondaryMenuKey ? (
													<div className="secondary-multi-select-menu">
														<button
															type="button"
															className="mobile-secondary-save-button"
															onClick={commitMobileSecondaryMenuSelections}
														>
															Save
														</button>
														{mobileActiveSecondaryDropdownOptions.map((option) => {
															const isChecked = mobileActivePendingSecondaryValues.includes(option);
															return (
																<label key={option} className="secondary-multi-select-option">
																	<input
																		type="checkbox"
																		checked={isChecked}
																		onChange={() => toggleMobilePendingSecondaryOption(option)}
																	/>
																	<span>{option}</span>
																</label>
															);
														})}
													</div>
												) : null}
											</div>
										) : (
											<select
												className="basic-filter-select"
												value={mobileActiveFilterValue}
												onChange={(event) => {
													const nextValue = event.target.value;
													setMobileActiveFilterValue(nextValue);
													addMobileSelection(mobileActiveFilterField, nextValue);
												}}
												aria-label="Select mobile filter value"
											>
												<option value="" disabled>
													{getSecondaryPlaceholder(mobileActiveFilterField)}
												</option>
												{mobileActiveSecondaryDropdownOptions.map((option) => (
													<option key={option} value={option}>{option}</option>
												))}
											</select>
										)}
									</div>
								</div>
								<div className="mobile-filters-modal-bottom">
									<div className="mobile-filter-selected-list">
										{mobileCombinedSelections.length === 0 ? (
											<div className="mobile-filter-selected-empty">No filters selected yet.</div>
										) : mobileCombinedSelections.map((entry) => (
											<div key={`${entry.mode}-${selectionKey(entry.field, entry.value)}`} className="mobile-filter-selected-item">
												<span
													className={`mobile-filter-item-icon ${entry.mode === "include" ? "is-include" : "is-exclude"}`}
													aria-hidden="true"
												>
													{entry.mode === "include" ? "✓" : "✕"}
												</span>
												<span className="mobile-filter-item-text">{entry.field}: {entry.value}</span>
												<button
													type="button"
													className="mobile-filter-delete-button"
													onClick={() => removeCombinedMobileSelection(entry.mode, entry.field, entry.value)}
												>
													Delete
												</button>
											</div>
										))}
									</div>
								</div>
							</div>
							<button
								type="button"
								className="mobile-filters-modal-apply"
								onClick={applyMobileFilters}
							>
								Apply Filters
							</button>
						</div>
					</div>
				) : null}
				<div className="page-of-spell-list-mobile">
					<button
						type="button"
						className="page-of-spell-list-arrow-button is-left"
						onClick={goToPreviousPage}
						disabled={isOnFirstPage}
						aria-disabled={isOnFirstPage}
						aria-label="Previous spell list page"
					/>
					<div className="page-of-spell-list-left">
						<span className="page-of-spell-list-text">{currentPage}{"\u00A0\u00A0\u00A0"}o</span>
					</div>
					<div className="page-of-spell-list-right">
						<span className="page-of-spell-list-text">f{"\u00A0\u00A0\u00A0"}{totalPages}</span>
					</div>
					<button
						type="button"
						className="page-of-spell-list-arrow-button is-right"
						onClick={goToNextPage}
						disabled={isOnLastPage}
						aria-disabled={isOnLastPage}
						aria-label="Next spell list page"
					/>
				</div>
			</div>
			<div
				className="spell-filter-wrapper"
				ref={spellFilterWrapperRef}
			>
				<div className="basic-advanced-toggle">
					<button
						type="button"
						className={`sort-by-toggle ${isAdvancedView ? "is-advanced" : "is-basic"}`}
						onClick={() => setFilterView(isAdvancedView ? "basic" : "advanced")}
						aria-pressed={isAdvancedView}
						aria-label="Toggle filter view"
					>
						<span className="sort-by-switch" aria-hidden="true" />
						<span className="sort-by-option">Basic Filters</span>
						<span className="sort-by-option">Advanced Filters</span>
					</button>
				</div>
				<div className="spell-filter-options">
					{isAdvancedView ? (
						<>
							<div className="advanced-formula-display">
								<div className="advanced-formula-display-table">
									<div className="advanced-formula-display-bubbles" ref={displayTableBubblesRef}>
										{displayBubblesForRender.map((entry, index) => {
											const bubbleNodes = [];

											if (shouldShowDisplayDropGhost && displayDropPreviewIndex === index) {
												bubbleNodes.push(
													<div
														key={`display-bubble-ghost-${index}`}
														className="advanced-formula-bubble advanced-formula-bubble-ghost"
														aria-hidden="true"
													/>,
												);
											}

											bubbleNodes.push(
												<div
													key={entry.id}
													className={`advanced-formula-bubble${entry.type === "static" ? " advanced-formula-bubble-static" : ""}`}
													ref={(element) => setDisplayBubbleRef(entry.id, element)}
													onPointerDown={(event) =>
														beginBubbleDrag(event, {
															type: "display",
															key: `display::${entry.id}`,
															id: entry.id,
															label: entry.label,
															bubbleType: entry.type,
															bubbleField: entry.field,
															bubbleValue: entry.value,
														})
													}
												>
													{entry.label}
												</div>,
											);

											return bubbleNodes;
										})}
										{shouldShowDisplayDropGhost && displayDropPreviewIndex === displayBubblesForRender.length ? (
											<div
												className="advanced-formula-bubble advanced-formula-bubble-ghost"
												aria-hidden="true"
											/>
										) : null}
									</div>
								</div>
								<div className="advanced-formula-submit-row">
									<div className={`advanced-submit-error-box${isAdvancedSubmitErrorVisible ? " is-visible" : ""}`}>
										The box will contain error text if the user tries to click "Submit" and the formula is invalid.
									</div>
									<button
										type="button"
										className="advanced-formula-submit-button"
										onClick={handleAdvancedSubmit}
										aria-label="Submit advanced formula"
									>
										Submit
									</button>
								</div>
							</div>
							<div className="advanced-formula-pieces">
								<div className="advanced-formula-pieces-dropdowns">
									<div className="basic-filter-include-dropdown">
										<select
											className="basic-filter-select"
											value={advancedFilterField}
											onChange={(event) => {
												setAdvancedFilterField(event.target.value);
												setAdvancedFilterValue("");
											}}
											aria-label="Select advanced filter field"
										>
											<option value="">Select a Filter Category</option>
											{filterFieldOptions.map((option) => (
												<option key={option} value={option}>{option}</option>
											))}
										</select>
									</div>
									<div className="basic-filter-include-secondary-dropdown">
										{!advancedFilterField ? (
											<select className="basic-filter-select basic-filter-select-disabled-placeholder" disabled aria-label="Advanced filter value unavailable">
												<option>---</option>
											</select>
										) : advancedFilterField === "Range" ? (
											renderRangeSlider(
												advancedRangeLow, setAdvancedRangeLow,
												advancedRangeHigh, setAdvancedRangeHigh,
												(low, high) => applyRangeToAdvancedBubbles(low, high),
											)
										) : isTextEntryField(advancedFilterField) ? (
											<input
												type="text"
												className="basic-filter-input"
												value={advancedFilterValue}
												onChange={(event) => setAdvancedFilterValue(event.target.value)}
												placeholder={`type ${advancedFilterField.toLowerCase()}`}
												onKeyDown={(event) => {
													if (event.key === "Enter") {
														event.preventDefault();
														addAdvancedBubble(advancedFilterField, advancedFilterValue);
														setAdvancedFilterValue("");
													}
												}}
												aria-label={`Advanced ${advancedFilterField.toLowerCase()} value`}
											/>
										) : usesDeferredSecondaryMenu(advancedFilterField) ? (
											<div className="secondary-multi-select" ref={advancedSecondaryDropdownRef}>
												<button
													type="button"
													className={`secondary-multi-select-trigger${openSecondaryMenu === "advanced" ? " is-open" : ""}`}
													onClick={() => {
														if (openSecondaryMenu === "advanced") {
															commitSecondaryMenuSelections("advanced");
															return;
														}
														setPendingAdvancedSecondaryValues(getSelectionValuesForField(advancedBubbles, advancedFilterField));
														setOpenSecondaryMenu("advanced");
													}}
													aria-expanded={openSecondaryMenu === "advanced"}
													aria-label="Select advanced filter values"
												>
													<span>{getSecondaryMenuButtonLabel(advancedFilterField, pendingAdvancedSecondaryValues)}</span>
													<span className="secondary-multi-select-arrow" aria-hidden="true">▾</span>
												</button>
												{openSecondaryMenu === "advanced" ? (
													<div className="secondary-multi-select-menu">
														{advancedSecondaryDropdownOptions.map((option) => {
															const isChecked = pendingAdvancedSecondaryValues.includes(option);
															return (
																<label key={option} className="secondary-multi-select-option">
																	<input
																		type="checkbox"
																		checked={isChecked}
																		onChange={() => togglePendingSecondaryOption("advanced", advancedFilterField, option)}
																	/>
																	<span>{option}</span>
																</label>
															);
														})}
													</div>
												) : null}
											</div>
										) : (
											<select
												className="basic-filter-select"
												value={advancedFilterValue}
												onChange={(event) => {
													const nextValue = event.target.value;
													setAdvancedFilterValue(nextValue);
													addAdvancedBubble(advancedFilterField, nextValue);
												}}
												aria-label="Select advanced filter value"
											>
												<option value="" disabled>
													{advancedSecondaryOptions.length > 0
														? getSecondaryPlaceholder(advancedFilterField)
														: "No options available"}
												</option>
												{advancedSecondaryDropdownOptions.map((option) => (
													<option key={option} value={option}>
														{option}
													</option>
												))}
											</select>
										)}
									</div>
								</div>
								<div className="advanced-formula-pieces-bubbles">
									<div className="advanced-formula-static-bubbles">
										{staticAdvancedBubbleLabels.map((label) => {
											const bubbleKey = `static::${label}`;
											return (
												<div
													key={bubbleKey}
													className={`advanced-formula-bubble advanced-formula-bubble-static${draggingBubble?.key === bubbleKey ? " is-drag-origin" : ""}`}
													onPointerDown={(event) =>
														beginBubbleDrag(event, { type: "static", key: bubbleKey, label })
													}
												>
													{label}
												</div>
											);
										})}
									</div>
									<div className="advanced-formula-dynamic-bubbles" ref={dynamicBubblesContainerRef}>
										{dynamicBubblesForRender.map((entry, index) => {
											const bubbleKey = selectionKey(entry.field, entry.value);
											const bubbleNodes = [];

											if (shouldShowSourceDropGhost && sourceDropPreviewIndex === index) {
												bubbleNodes.push(
													<div
														key={`advanced-bubble-ghost-${index}`}
														className="advanced-formula-bubble advanced-formula-bubble-ghost"
														aria-hidden="true"
													/>,
												);
											}

											bubbleNodes.push(
												<div
													key={bubbleKey}
													className={`advanced-formula-bubble${draggingBubble?.key === bubbleKey ? " is-drag-origin" : ""}`}
													ref={(element) => setDynamicBubbleRef(bubbleKey, element)}
													onPointerDown={(event) =>
														beginBubbleDrag(event, {
															type: "dynamic",
															key: bubbleKey,
															label: entry.value,
															field: entry.field,
															value: entry.value,
														})
													}
												>
													{entry.value}
												</div>
											);

											return bubbleNodes;
										})}
										{shouldShowSourceDropGhost && sourceDropPreviewIndex === dynamicBubblesForRender.length ? (
											<div
												className="advanced-formula-bubble advanced-formula-bubble-ghost"
												aria-hidden="true"
											/>
										) : null}
									</div>
								</div>
							</div>
						</>
					) : (
						<>
							<div className="basic-filter-include">
								<div className="basic-filter-include-title">Include</div>
								<div className="basic-filter-include-dropdown">
									<select
										className="basic-filter-select"
										value={includeFilterField}
										onChange={(event) => {
											const nextField = event.target.value;
											setIncludeFilterField(nextField);
											setIncludeFilterValue("");
										}}
										aria-label="Select include filter field"
									>
										<option value="">Select a Filter Category</option>
										{filterFieldOptions.map((option) => (
											<option key={option} value={option}>{option}</option>
										))}
									</select>
								</div>
								<div className="basic-filter-include-secondary-dropdown">
									{!includeFilterField ? (
										<select className="basic-filter-select basic-filter-select-disabled-placeholder" disabled aria-label="Include filter value unavailable">
											<option>---</option>
										</select>
									) : includeFilterField === "Range" ? (
										renderRangeSlider(
											includeRangeLow, setIncludeRangeLow,
											includeRangeHigh, setIncludeRangeHigh,
											(low, high) => applyRangeToSelections(setIncludeSelections, low, high),
										)
									) : isTextEntryField(includeFilterField) ? (
										<input
											type="text"
											className="basic-filter-input"
											value={includeFilterValue}
											onChange={(event) => setIncludeFilterValue(event.target.value)}
											placeholder={`type ${includeFilterField.toLowerCase()}`}
											onKeyDown={(event) => {
												if (event.key === "Enter") {
													event.preventDefault();
													addSelection(setIncludeSelections, includeFilterField, includeFilterValue);
													setIncludeFilterValue("");
												}
											}}
											aria-label={`Include ${includeFilterField.toLowerCase()} value`}
										/>
									) : usesDeferredSecondaryMenu(includeFilterField) ? (
										<div className="secondary-multi-select" ref={includeSecondaryDropdownRef}>
											<button
												type="button"
												className={`secondary-multi-select-trigger${openSecondaryMenu === "include" ? " is-open" : ""}`}
												onClick={() => {
													if (openSecondaryMenu === "include") {
														commitSecondaryMenuSelections("include");
														return;
													}
													setPendingIncludeSecondaryValues(getSelectionValuesForField(includeSelections, includeFilterField));
													setOpenSecondaryMenu("include");
												}}
												aria-expanded={openSecondaryMenu === "include"}
												aria-label="Select include filter values"
											>
												<span>{getSecondaryMenuButtonLabel(includeFilterField, pendingIncludeSecondaryValues)}</span>
												<span className="secondary-multi-select-arrow" aria-hidden="true">▾</span>
											</button>
											{openSecondaryMenu === "include" ? (
												<div className="secondary-multi-select-menu">
													{includeSecondaryDropdownOptions.map((option) => {
														const isChecked = pendingIncludeSecondaryValues.includes(option);
														return (
															<label key={option} className="secondary-multi-select-option">
																<input
																	type="checkbox"
																	checked={isChecked}
																	onChange={() => togglePendingSecondaryOption("include", includeFilterField, option)}
																/>
																<span>{option}</span>
															</label>
														);
													})}
												</div>
											) : null}
										</div>
									) : (
										<select
											className="basic-filter-select"
											value={includeFilterValue}
											onChange={(event) => {
												const nextValue = event.target.value;
												setIncludeFilterValue(nextValue);
												addSelection(setIncludeSelections, includeFilterField, nextValue);
											}}
											aria-label="Select include filter value"
										>
											<option value="" disabled>
												{getSecondaryPlaceholder(includeFilterField)}
											</option>
											{includeSecondaryDropdownOptions.map((option) => (
												<option key={option} value={option}>{option}</option>
											))}
										</select>
									)}
								</div>
								<div className="basic-filter-include-list">
									{includeSelections.map((entry) => (
										<div
											key={selectionKey(entry.field, entry.value)}
											className="basic-filter-list-item"
										>
											<span
												className="basic-filter-list-text"
												role="button"
												tabIndex={0}
												onClick={() => removeSelection(setIncludeSelections, entry.field, entry.value)}
												onKeyDown={(event) => {
													if (event.key === "Enter" || event.key === " ") {
														event.preventDefault();
														removeSelection(setIncludeSelections, entry.field, entry.value);
													}
												}}
												aria-label={`Remove include filter ${entry.field}: ${entry.value}`}
											>
												{entry.field}: {entry.value}
											</span>
										</div>
									))}
								</div>
							</div>
							<div className="basic-filter-exclude">
								<div className="basic-filter-exclude-title">Exclude</div>
								<div className="basic-filter-exclude-dropdown">
									<select
										className="basic-filter-select"
										value={excludeFilterField}
										onChange={(event) => {
											const nextField = event.target.value;
											setExcludeFilterField(nextField);
											setExcludeFilterValue("");
										}}
										aria-label="Select exclude filter field"
									>
										<option value="">Select a Filter Category</option>
										{filterFieldOptions.map((option) => (
											<option key={option} value={option}>{option}</option>
										))}
									</select>
								</div>
								<div className="basic-filter-exclude-secondary-dropdown">
									{!excludeFilterField ? (
										<select className="basic-filter-select basic-filter-select-disabled-placeholder" disabled aria-label="Exclude filter value unavailable">
											<option>---</option>
										</select>
									) : excludeFilterField === "Range" ? (
										renderRangeSlider(
											excludeRangeLow, setExcludeRangeLow,
											excludeRangeHigh, setExcludeRangeHigh,
											(low, high) => applyRangeToSelections(setExcludeSelections, low, high),
										)
									) : isTextEntryField(excludeFilterField) ? (
										<input
											type="text"
											className="basic-filter-input"
											value={excludeFilterValue}
											onChange={(event) => setExcludeFilterValue(event.target.value)}
											placeholder={`type ${excludeFilterField.toLowerCase()}`}
											onKeyDown={(event) => {
												if (event.key === "Enter") {
													event.preventDefault();
													addSelection(setExcludeSelections, excludeFilterField, excludeFilterValue);
													setExcludeFilterValue("");
												}
											}}
											aria-label={`Exclude ${excludeFilterField.toLowerCase()} value`}
										/>
									) : usesDeferredSecondaryMenu(excludeFilterField) ? (
										<div className="secondary-multi-select" ref={excludeSecondaryDropdownRef}>
											<button
												type="button"
												className={`secondary-multi-select-trigger${openSecondaryMenu === "exclude" ? " is-open" : ""}`}
												onClick={() => {
													if (openSecondaryMenu === "exclude") {
														commitSecondaryMenuSelections("exclude");
														return;
													}
													setPendingExcludeSecondaryValues(getSelectionValuesForField(excludeSelections, excludeFilterField));
													setOpenSecondaryMenu("exclude");
												}}
												aria-expanded={openSecondaryMenu === "exclude"}
												aria-label="Select exclude filter values"
											>
												<span>{getSecondaryMenuButtonLabel(excludeFilterField, pendingExcludeSecondaryValues)}</span>
												<span className="secondary-multi-select-arrow" aria-hidden="true">▾</span>
											</button>
											{openSecondaryMenu === "exclude" ? (
												<div className="secondary-multi-select-menu">
													{excludeSecondaryDropdownOptions.map((option) => {
														const isChecked = pendingExcludeSecondaryValues.includes(option);
														return (
															<label key={option} className="secondary-multi-select-option">
																<input
																	type="checkbox"
																	checked={isChecked}
																	onChange={() => togglePendingSecondaryOption("exclude", excludeFilterField, option)}
																/>
																<span>{option}</span>
															</label>
														);
													})}
												</div>
											) : null}
										</div>
									) : (
										<select
											className="basic-filter-select"
											value={excludeFilterValue}
											onChange={(event) => {
												const nextValue = event.target.value;
												setExcludeFilterValue(nextValue);
												addSelection(setExcludeSelections, excludeFilterField, nextValue);
											}}
											aria-label="Select exclude filter value"
										>
											<option value="" disabled>
												{getSecondaryPlaceholder(excludeFilterField)}
											</option>
											{excludeSecondaryDropdownOptions.map((option) => (
												<option key={option} value={option}>{option}</option>
											))}
										</select>
									)}
								</div>
								<div className="basic-filter-exclude-list">
									{excludeSelections.map((entry) => (
										<div
											key={selectionKey(entry.field, entry.value)}
											className="basic-filter-list-item"
										>
											<span
												className="basic-filter-list-text"
												role="button"
												tabIndex={0}
												onClick={() => removeSelection(setExcludeSelections, entry.field, entry.value)}
												onKeyDown={(event) => {
													if (event.key === "Enter" || event.key === " ") {
														event.preventDefault();
														removeSelection(setExcludeSelections, entry.field, entry.value);
													}
												}}
												aria-label={`Remove exclude filter ${entry.field}: ${entry.value}`}
											>
												{entry.field}: {entry.value}
											</span>
										</div>
									))}
								</div>
							</div>
						</>
					)}
				</div>
				<div className="main-spell-searcher-page-spellbook-buttons">
					<div className="main-spell-searcher-page-spellbook-buttons-left">
						<button
							type="button"
							className="spellbook-action-button"
							aria-label="Save selected as spellbook"
						>
							<img src={quillInk} alt="Quill and ink" />
						</button>
						<span className="spellbook-action-label">Save selected as spellbook</span>
					</div>
					<div className="main-spell-searcher-page-spellbook-buttons-right">
						<button
							type="button"
							className="spellbook-action-button"
							aria-label="View spellbooks"
						>
							<img src={bookStack} alt="Stacked books" />
						</button>
						<span className="spellbook-action-label">View spellbooks</span>
					</div>
					<div className="secret-code-input">
						<form onSubmit={handleSecretCodeSubmit}>
							<input
								type="password"
								value={secretCode}
								onChange={(e) => setSecretCode(e.target.value)}
								placeholder="Input secret code"
								className="secret-code-input-field"
								aria-label="Secret code input"
							/>
							<button
								type="submit"
								className="secret-code-submit-button"
								aria-label="Submit secret code"
							>
								Submit
							</button>
						</form>
					</div>
				</div>
			</div>

			{draggingBubble ? (
				<div
					className="filter-bubble-delete-box"
					ref={filterBubbleDeleteBoxRef}
					style={{
						top: `${deleteBoxBounds.top}px`,
						left: `${deleteBoxBounds.left}px`,
						width: `${deleteBoxBounds.width}px`,
						height: `${deleteBoxBounds.height}px`,
					}}
					aria-hidden="true"
				>
					<img src={circleXDeleteIcon} alt="" className="filter-bubble-delete-box-icon" />
				</div>
			) : null}

			{draggingBubble ? (
				<div
					className={`advanced-formula-bubble advanced-formula-floating-bubble${draggingBubble.type === "static" || draggingBubble.bubbleType === "static" ? " advanced-formula-bubble-static" : ""}`}
					style={{ left: `${draggingBubble.x}px`, top: `${draggingBubble.y}px` }}
					aria-hidden="true"
				>
					{draggingBubble.label}
				</div>
			) : null}

			{isColumnViewOpen ? (
				<div
					className="column-view-modal-backdrop"
					onClick={() => setIsColumnViewOpen(false)}
				>
					<div
						className="column-view-modal"
						onClick={(event) => event.stopPropagation()}
					>
						<div className="column-view-modal-content">
							<p className="column-view-modal-description">Select which columns will be present:</p>
							<div className="column-view-option-grid">
								{columnChoices.map((option) => (
									<label key={option.key} className="column-view-option-item">
										<input
											type="checkbox"
											checked={visibleColumns[option.key]}
											onChange={() => toggleColumnVisibility(option.key)}
										/>
										<span>{option.label}</span>
									</label>
								))}
							</div>
						</div>
						<button
							type="button"
							className="column-view-modal-close"
							onClick={() => setIsColumnViewOpen(false)}
							aria-label="Close column view modal"
						>
							X
						</button>
					</div>
				</div>
			) : null}
		</div>

		</div>

		{isGuidedTutorialModalOpen && (
			<div
				className="modal-overlay guided-tutorial-modal-overlay"
				style={guidedTutorialSpotlights.length ? { background: 'transparent' } : undefined}
			>
				{guidedTutorialStep === 11 ? (
					<div
						className="filter-bubble-delete-box"
						ref={filterBubbleDeleteBoxRef}
						style={{
							top: `${deleteBoxBounds.top}px`,
							left: `${deleteBoxBounds.left}px`,
							width: `${deleteBoxBounds.width}px`,
							height: `${deleteBoxBounds.height}px`,
						}}
						aria-hidden="true"
					>
						<img src={circleXDeleteIcon} alt="" className="filter-bubble-delete-box-icon" />
					</div>
				) : null}
				{guidedTutorialSpotlights.map((spot, index) => (
					<div
						key={`${spot.shape}-${index}`}
						className={`guided-tutorial-spotlight guided-tutorial-spotlight--${spot.shape}`}
						style={{
							left: spot.x,
							top: spot.y,
							width: spot.width,
							height: spot.height
						}}
					/>
				))}
				<div className="guided-tutorial-modal">
					<button
						type="button"
						className="guided-tutorial-close-button"
						onClick={closeGuidedTutorial}
						aria-label="Close Guided Tutorial"
					>
						X
					</button>
					<div className="guided-tutorial-content">
						<h2 className="guided-tutorial-title">
							Guided Tutorial - Step {guidedTutorialStep} of {guidedTutorialSteps.length}
						</h2>
						<p className="guided-tutorial-text">
							{guidedTutorialSteps[guidedTutorialStep - 1]}
						</p>
						<div className="guided-tutorial-actions">
							<button
								type="button"
								className="guided-tutorial-back-btn"
								aria-label="Guided tutorial back"
								onClick={() => setGuidedTutorialStep((step) => Math.max(1, step - 1))}
								disabled={guidedTutorialStep === 1}
								style={{ visibility: guidedTutorialStep === 1 ? 'hidden' : 'visible' }}
							/>
							<button
								type="button"
								className="guided-tutorial-next-btn"
								aria-label="Guided tutorial next"
								onClick={() => setGuidedTutorialStep((step) => Math.min(guidedTutorialSteps.length, step + 1))}
								disabled={guidedTutorialStep === guidedTutorialSteps.length}
								style={{ visibility: guidedTutorialStep === guidedTutorialSteps.length ? 'hidden' : 'visible' }}
							/>
						</div>
					</div>
				</div>
			</div>
		)}

		<ToolPageFooter
			helpHidden={helpHidden}
			showHelp={showHelp}
			learnMoreOpen={learnMoreOpen}
			setLearnMoreOpen={setLearnMoreOpen}
			contentKey="spellSearch"
		/>
		</div>
		</div>
		)}
	</div>
	)
}
