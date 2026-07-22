import { useEffect, useMemo, useRef, useState } from "react";
import "./SpellbookModalStyles.css";
import { getSpell } from "../API/spell_search/spells";
import {
	setSpellbookSpellFlag,
	setSpellbookSpellFlags,
	renameSpellbook,
	setSpellbookColors,
	setSpellbookMaxPrepared,
	setSpellbookSectionSettings,
	deleteSpellbook,
	removeSpellFromSpellbook,
} from "../utils/spellbookStorage";

const FILTER_FIELD_OPTIONS = ["Keyword", "Level", "School", "Class", "Source", "Casting Time", "Range", "Duration", "Components", "Ritual", "Concentration"];
const RANGE_FILTER_VALUES = ["Emanation", "5ft", "10ft", "15ft", "20ft", "30ft", "60ft", "120ft", "300ft", "1mile", ">1mile"];

function BookIcon() {
	return (
		<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
			<path
				d="M3 5c2.2-1.1 4.7-1.2 6.5 0.4L12 7.4l2.5-2C16.3 3.8 18.8 3.9 21 5v13c-2.2-1.1-4.7-1.2-6.5 0.4L12 20.4l-2.5-2C7.7 16.8 5.2 16.9 3 18V5Z"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.6"
				strokeLinejoin="round"
			/>
			<line x1="12" y1="7.4" x2="12" y2="20.4" stroke="currentColor" strokeWidth="1.6" />
		</svg>
	);
}

function PencilIcon() {
	return (
		<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
			<path d="M4 20l1-4.2L15.6 5.2a1.5 1.5 0 0 1 2.1 0l1.1 1.1a1.5 1.5 0 0 1 0 2.1L8.2 19 4 20Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
			<line x1="14.2" y1="6.6" x2="17.4" y2="9.8" stroke="currentColor" strokeWidth="1.6" />
		</svg>
	);
}

function CheckIcon() {
	return (
		<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
			<polyline points="4 12.5 9.5 18 20 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}

function GearIcon() {
	return (
		<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
			<circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
			<path
				d="M12 3.5v2.1M12 18.4v2.1M20.5 12h-2.1M5.6 12H3.5M17.7 6.3l-1.5 1.5M7.8 16.2l-1.5 1.5M17.7 17.7l-1.5-1.5M7.8 7.8 6.3 6.3"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.6"
				strokeLinecap="round"
			/>
		</svg>
	);
}

function CloseIcon() {
	return (
		<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
			<line x1="5" y1="5" x2="19" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
			<line x1="19" y1="5" x2="5" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
		</svg>
	);
}

function SearchIcon() {
	return (
		<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
			<circle cx="10.5" cy="10.5" r="6" fill="none" stroke="currentColor" strokeWidth="1.8" />
			<line x1="15.2" y1="15.2" x2="20" y2="20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
		</svg>
	);
}

function FunnelIcon() {
	return (
		<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
			<path d="M4 5h16l-6 7.5V18l-4 2v-7.5L4 5Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
		</svg>
	);
}

function ChevronIcon({ direction = "down" }) {
	return (
		<svg
			viewBox="0 0 24 24"
			width="14"
			height="14"
			aria-hidden="true"
			style={{ transform: direction === "up" ? "rotate(180deg)" : "none", transition: "transform 0.15s ease" }}
		>
			<polyline points="6 9 12 15 18 9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}

function PreparedCircleIcon({ active }) {
	if (active) {
		return (
			<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
				<circle cx="12" cy="12" r="9.5" fill="currentColor" />
				<polyline points="8 12.5 11 15.5 16.5 9" fill="none" stroke="var(--page-background)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
			</svg>
		);
	}
	return (
		<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
			<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.6" />
		</svg>
	);
}

function PinIcon({ active }) {
	return (
		<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
			<path
				d="M13.2 3.2 20.8 10.8c0.5 0.5 0.3 1.4-0.4 1.6l-3.7 1.1-4 5.3-1.5-1.5 2.3-3-3.4-3.4-3 2.3-1.5-1.5 5.3-4 1.1-3.7c0.2-0.7 1.1-0.9 1.6-0.4Z"
				fill={active ? "currentColor" : "none"}
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinejoin="round"
			/>
			<line x1="3.5" y1="20.5" x2="8.2" y2="15.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
		</svg>
	);
}

function StarIcon({ active }) {
	return (
		<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
			<path
				d="M12 3.2 14.6 9l6.2 0.6-4.7 4.1 1.4 6.1L12 16.7 6.5 19.8l1.4-6.1-4.7-4.1L9.4 9 12 3.2Z"
				fill={active ? "currentColor" : "none"}
				stroke="currentColor"
				strokeWidth="1.4"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

function NotesIcon({ hasNotes }) {
	return (
		<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
			<path d="M6 3h9l4 4v14H6V3Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
			<polyline points="15 3 15 7 19 7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
			<line x1="8.5" y1="12" x2="16" y2="12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
			<line x1="8.5" y1="15.5" x2="16" y2="15.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
			{hasNotes ? (
				<circle cx="19" cy="19" r="4" fill="var(--initiative-banner)" stroke="var(--spellbook-cream)" strokeWidth="1.4" />
			) : null}
		</svg>
	);
}

function TrashIcon() {
	return (
		<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
			<path d="M5 7h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
			<path d="M9 7V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
			<path d="M7 7l1 13a1.5 1.5 0 0 0 1.5 1.4h5a1.5 1.5 0 0 0 1.5-1.4l1-13" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
			<line x1="10.3" y1="10.5" x2="10.7" y2="17.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
			<line x1="13.7" y1="10.5" x2="13.3" y2="17.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
		</svg>
	);
}

function formatClassList(classesValue) {
	if (Array.isArray(classesValue)) {
		return classesValue.join(", ");
	}
	if (typeof classesValue === "string") {
		return classesValue;
	}
	return "";
}

function getDurationDisplayValue(spell) {
	const rawDuration = typeof spell?.duration === "string" ? spell.duration.trim() : "";
	const rawDescription = typeof spell?.description === "string" ? spell.description.trim() : "";
	const normalizedDuration = rawDuration.replace(/\s+/g, " ").trim();

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
}

function getSortableLevel(spell) {
	const raw = `${spell.level ?? ""}`.trim().toLowerCase();
	if (raw === "cantrip") {
		return 0;
	}
	const num = Number(raw);
	return Number.isFinite(num) ? num : 0;
}

function getLevelGroupLabel(levelNumber) {
	if (levelNumber === 0) {
		return "Cantrips";
	}
	const suffix =
		levelNumber % 10 === 1 && levelNumber % 100 !== 11
			? "st"
			: levelNumber % 10 === 2 && levelNumber % 100 !== 12
				? "nd"
				: levelNumber % 10 === 3 && levelNumber % 100 !== 13
					? "rd"
					: "th";
	return `${levelNumber}${suffix} Level`;
}

function getLevelDisplayLabel(spell) {
	const levelNumber = getSortableLevel(spell);
	return levelNumber === 0 ? "Cantrip" : getLevelGroupLabel(levelNumber);
}

function getSecondaryFilterOptions(field, availableSourceNames) {
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
		case "Source":
			return availableSourceNames ?? [];
		case "Ritual":
			return ["Yes", "No"];
		case "Concentration":
			return ["Yes", "No"];
		case "Range":
			return RANGE_FILTER_VALUES;
		default:
			return [];
	}
}

function isRitualEligible(spell) {
	return `${spell?.ritual ?? ""}`.trim().toLowerCase() === "yes";
}

function spellMatchesField(spell, field, value) {
	switch (field) {
		case "Keyword": {
			const needle = value.trim().toLowerCase();
			if (!needle) return true;
			return (
				`${spell.name ?? ""}`.toLowerCase().includes(needle) ||
				`${spell.description ?? ""}`.toLowerCase().includes(needle)
			);
		}
		case "Level": {
			const rawLevel = `${spell.level ?? ""}`.trim().toLowerCase();
			const spellLevel = rawLevel === "cantrip" || rawLevel === "0" ? "cantrip" : rawLevel;
			const filterLevel = value.trim().toLowerCase() === "cantrip" ? "cantrip" : value.trim().toLowerCase();
			return spellLevel === filterLevel;
		}
		case "School":
			return `${spell.school ?? ""}`.trim().toLowerCase() === value.trim().toLowerCase();
		case "Class": {
			const classesText = formatClassList(spell.classes).toLowerCase();
			return classesText
				.split(",")
				.map((entry) => entry.trim())
				.includes(value.trim().toLowerCase());
		}
		case "Source":
			return `${spell.source ?? ""}`.trim().toLowerCase() === value.trim().toLowerCase();
		case "Casting Time":
			return `${spell.castingTime ?? ""}`.trim().toLowerCase() === value.trim().toLowerCase();
		case "Range":
			return `${spell.range ?? ""}`.trim().toLowerCase() === value.trim().toLowerCase();
		case "Duration": {
			const durationDisplay = getDurationDisplayValue(spell).trim().toLowerCase();
			return durationDisplay === value.trim().toLowerCase();
		}
		case "Components":
			return `${spell.components ?? ""}`.toLowerCase().includes(value.trim().toLowerCase());
		case "Ritual":
			return `${spell.ritual ?? ""}`.trim().toLowerCase() === value.trim().toLowerCase();
		case "Concentration": {
			const isConcentration = `${spell.duration ?? ""}`.trim().toLowerCase().startsWith("concentration");
			return (isConcentration ? "yes" : "no") === value.trim().toLowerCase();
		}
		default:
			return true;
	}
}

function selectionKey(field, value, mode) {
	return `${field}::${value}::${mode}`;
}

export default function SpellbookModal({ spellbook, onClose, onSpellbookUpdated, onSpellbookDeleted }) {
	const [activeTab, setActiveTab] = useState("prepared");
	const [isLoadingSpells, setIsLoadingSpells] = useState(true);
	const [loadError, setLoadError] = useState("");
	const [spellDetailsById, setSpellDetailsById] = useState({});

	const [isEditMode, setIsEditMode] = useState(false);
	const [nameDraft, setNameDraft] = useState(spellbook.name);
	const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
	const [isSettingsOpen, setIsSettingsOpen] = useState(false);
	const nameInputRef = useRef(null);

	const [searchText, setSearchText] = useState("");
	const [collapsedSections, setCollapsedSections] = useState(() => new Set());
	const [expandedSpellId, setExpandedSpellId] = useState(null);

	const [notesSpellId, setNotesSpellId] = useState(null);
	const [notesDraft, setNotesDraft] = useState("");

	const [isFiltersOpen, setIsFiltersOpen] = useState(false);
	const [filterMode, setFilterMode] = useState("include");
	const [filterSelections, setFilterSelections] = useState([]);
	const [openFilterCategory, setOpenFilterCategory] = useState(null);
	const [keywordDraft, setKeywordDraft] = useState("");
	const filtersDropdownRef = useRef(null);

	const isAdvancedFiltersOpen = isFiltersOpen;

	const spellIdsKey = useMemo(
		() => (Array.isArray(spellbook.spells) ? spellbook.spells.map((entry) => entry.id).join("|") : ""),
		[spellbook.spells],
	);

	useEffect(() => {
		let cancelled = false;

		async function loadSpells() {
			setIsLoadingSpells(true);
			setLoadError("");
			const entries = Array.isArray(spellbook.spells) ? spellbook.spells : [];

			try {
				const results = await Promise.all(
					entries.map(async (entry) => {
						try {
							const detail = await getSpell(entry.id);
							return {
								...detail,
								id: entry.id,
								prepared: Boolean(entry.prepared),
								pinned: Boolean(entry.pinned),
								alwaysPrepared: Boolean(entry.alwaysPrepared),
								notes: typeof entry.notes === "string" ? entry.notes : "",
							};
						} catch (error) {
							console.error(`Failed to load spell ${entry.id}:`, error);
							return {
								id: entry.id,
								name: entry.name,
								prepared: Boolean(entry.prepared),
								pinned: Boolean(entry.pinned),
								alwaysPrepared: Boolean(entry.alwaysPrepared),
								notes: typeof entry.notes === "string" ? entry.notes : "",
							};
						}
					}),
				);

				if (cancelled) return;
				const map = {};
				results.forEach((spell) => {
					map[spell.id] = spell;
				});
				setSpellDetailsById(map);
			} catch (error) {
				if (!cancelled) {
					console.error("Failed to load spellbook spells:", error);
					setLoadError("Unable to load spells for this spellbook right now.");
				}
			} finally {
				if (!cancelled) {
					setIsLoadingSpells(false);
				}
			}
		}

		loadSpells();
		return () => {
			cancelled = true;
		};
	}, [spellbook.id, spellIdsKey]);

	useEffect(() => {
		const handlePointerDownOutside = (event) => {
			if (filtersDropdownRef.current && !filtersDropdownRef.current.contains(event.target)) {
				setIsFiltersOpen(false);
				setOpenFilterCategory(null);
			}
		};
		document.addEventListener("pointerdown", handlePointerDownOutside);
		return () => document.removeEventListener("pointerdown", handlePointerDownOutside);
	}, []);

	useEffect(() => {
		const handleKeyDown = (event) => {
			if (event.key !== "Escape") return;
			if (isEditMode) {
				event.preventDefault();
				cancelEditMode();
				return;
			}
			if (isSettingsOpen) {
				event.preventDefault();
				setIsSettingsOpen(false);
				return;
			}
			if (isDeleteConfirmOpen || notesSpellId) return;
			onClose();
		};
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [onClose, isEditMode, isSettingsOpen, isDeleteConfirmOpen, notesSpellId]);

	useEffect(() => {
		if (!isEditMode) {
			setNameDraft(spellbook.name);
		}
	}, [spellbook.name, isEditMode]);

	useEffect(() => {
		if (isEditMode && nameInputRef.current) {
			nameInputRef.current.focus();
			nameInputRef.current.select();
		}
	}, [isEditMode]);

	const allSpells = useMemo(() => Object.values(spellDetailsById), [spellDetailsById]);
	const pinnedSectionEnabled = spellbook.showPinnedSection !== false;
	const ritualSectionEnabled = spellbook.showRitualSection === true;
	const preparedSpells = useMemo(
		() => allSpells.filter((spell) => spell.prepared),
		[allSpells],
	);
	const preparedCount = useMemo(
		() => allSpells.filter((spell) => spell.prepared && !spell.alwaysPrepared).length,
		[allSpells],
	);
	const maxPreparedValue =
		spellbook.maxPrepared === "" || spellbook.maxPrepared === undefined || spellbook.maxPrepared === null
			? null
			: Number(spellbook.maxPrepared);
	const isOverMaxPrepared = maxPreparedValue !== null && preparedCount > maxPreparedValue;
	const availableSourceNames = useMemo(
		() => [...new Set(allSpells.map((spell) => spell.source).filter(Boolean))].sort(),
		[allSpells],
	);

	const spellMatchesFilters = (spell) => {
		const normalizedSearch = searchText.trim().toLowerCase();
		if (normalizedSearch) {
			const matchesSearch =
				`${spell.name ?? ""}`.toLowerCase().includes(normalizedSearch) ||
				`${spell.description ?? ""}`.toLowerCase().includes(normalizedSearch);
			if (!matchesSearch) return false;
		}

		const includeByField = {};
		const excludeByField = {};
		filterSelections.forEach(({ field, value, mode }) => {
			const byField = mode === "exclude" ? excludeByField : includeByField;
			if (!byField[field]) byField[field] = [];
			byField[field].push(value);
		});
		const passesInclude = Object.entries(includeByField).every(([field, values]) =>
			values.some((value) => spellMatchesField(spell, field, value)),
		);
		const passesExclude = Object.entries(excludeByField).every(
			([field, values]) => !values.some((value) => spellMatchesField(spell, field, value)),
		);
		return passesInclude && passesExclude;
	};

	const baseSpells = activeTab === "prepared" ? preparedSpells : allSpells;
	const filteredSpells = useMemo(
		() => baseSpells.filter(spellMatchesFilters),
		[baseSpells, searchText, filterSelections],
	);

	const ritualGroupSpells = useMemo(() => {
		if (activeTab !== "prepared" || !ritualSectionEnabled) return [];
		return allSpells.filter((spell) => isRitualEligible(spell)).filter(spellMatchesFilters);
	}, [allSpells, activeTab, ritualSectionEnabled, searchText, filterSelections]);

	const groupedSections = useMemo(() => {
		const byName = (a, b) => `${a.name ?? ""}`.localeCompare(`${b.name ?? ""}`);

		const groupableSpells = filteredSpells;
		const pinned = pinnedSectionEnabled ? groupableSpells.filter((spell) => spell.pinned).sort(byName) : [];

		const levelBuckets = new Map();
		groupableSpells.forEach((spell) => {
			const level = getSortableLevel(spell);
			if (!levelBuckets.has(level)) levelBuckets.set(level, []);
			levelBuckets.get(level).push(spell);
		});

		const sections = [];
		if (pinned.length > 0) {
			sections.push({ key: "pinned", label: `Pinned (${pinned.length})`, spells: pinned });
		}
		[...levelBuckets.keys()]
			.sort((a, b) => a - b)
			.forEach((level) => {
				const spells = levelBuckets.get(level).sort(byName);
				sections.push({ key: `level-${level}`, label: `${getLevelGroupLabel(level)} (${spells.length})`, spells });
			});
		if (ritualGroupSpells.length > 0) {
			const spells = [...ritualGroupSpells].sort(byName);
			sections.push({ key: "ritual", label: `Ritual Spells (${spells.length})`, spells });
		}
		return sections;
	}, [filteredSpells, ritualGroupSpells, pinnedSectionEnabled]);

	const totalShownCount = useMemo(() => {
		const idSet = new Set(filteredSpells.map((spell) => spell.id));
		ritualGroupSpells.forEach((spell) => idSet.add(spell.id));
		return idSet.size;
	}, [filteredSpells, ritualGroupSpells]);

	const toggleSection = (key) => {
		setCollapsedSections((previous) => {
			const next = new Set(previous);
			if (next.has(key)) {
				next.delete(key);
			} else {
				next.add(key);
			}
			return next;
		});
	};

	const toggleSpellFlag = (spellId, flag) => {
		const currentSpell = spellDetailsById[spellId];
		if (!currentSpell) return;
		const nextValue = !currentSpell[flag];

		const updates = { [flag]: nextValue };
		if (flag === "alwaysPrepared" && nextValue) {
			updates.prepared = true;
		}
		if (flag === "prepared" && !nextValue && currentSpell.alwaysPrepared) {
			updates.alwaysPrepared = false;
		}

		setSpellDetailsById((previous) => ({
			...previous,
			[spellId]: { ...previous[spellId], ...updates },
		}));

		const updatedBook = setSpellbookSpellFlags(spellbook.id, spellId, updates);
		if (updatedBook && onSpellbookUpdated) {
			onSpellbookUpdated(updatedBook);
		}
	};

	const toggleSpellDescription = (spellId) => {
		setExpandedSpellId((previous) => (previous === spellId ? null : spellId));
	};

	const handleDeleteSpell = (event, spellId) => {
		event.stopPropagation();
		setSpellDetailsById((previous) => {
			const next = { ...previous };
			delete next[spellId];
			return next;
		});
		if (notesSpellId === spellId) {
			setNotesSpellId(null);
		}
		if (expandedSpellId === spellId) {
			setExpandedSpellId(null);
		}
		const updatedBook = removeSpellFromSpellbook(spellbook.id, spellId);
		if (updatedBook && onSpellbookUpdated) {
			onSpellbookUpdated(updatedBook);
		}
	};

	const openNotesEditor = (event, spell) => {
		event.stopPropagation();
		setNotesSpellId(spell.id);
		setNotesDraft(spell.notes ?? "");
	};

	const commitNotes = () => {
		if (!notesSpellId) return;
		const spellId = notesSpellId;
		const trimmedNotes = notesDraft;

		setSpellDetailsById((previous) => ({
			...previous,
			[spellId]: { ...previous[spellId], notes: trimmedNotes },
		}));
		const updatedBook = setSpellbookSpellFlag(spellbook.id, spellId, "notes", trimmedNotes);
		if (updatedBook && onSpellbookUpdated) {
			onSpellbookUpdated(updatedBook);
		}
		setNotesSpellId(null);
	};

	const commitNameEdit = () => {
		const trimmedName = nameDraft.trim();

		if (!trimmedName || trimmedName === spellbook.name) {
			setNameDraft(spellbook.name);
			return;
		}

		const updatedBook = renameSpellbook(spellbook.id, trimmedName);
		if (updatedBook && onSpellbookUpdated) {
			onSpellbookUpdated(updatedBook);
		} else {
			setNameDraft(spellbook.name);
		}
	};

	const cancelEditMode = () => {
		setNameDraft(spellbook.name);
		setIsEditMode(false);
	};

	const handleSpineColorChange = (event) => {
		const updatedBook = setSpellbookColors(spellbook.id, { spineColor: event.target.value });
		if (updatedBook && onSpellbookUpdated) {
			onSpellbookUpdated(updatedBook);
		}
	};

	const handleFontColorChange = (event) => {
		const updatedBook = setSpellbookColors(spellbook.id, { fontColor: event.target.value });
		if (updatedBook && onSpellbookUpdated) {
			onSpellbookUpdated(updatedBook);
		}
	};

	const handleMaxPreparedChange = (event) => {
		const digitsOnly = event.target.value.replace(/\D/g, "");
		const nextValue = digitsOnly === "" ? "" : Number(digitsOnly);
		const updatedBook = setSpellbookMaxPrepared(spellbook.id, nextValue);
		if (updatedBook && onSpellbookUpdated) {
			onSpellbookUpdated(updatedBook);
		}
	};

	const handleSectionSettingChange = (key, value) => {
		const updatedBook = setSpellbookSectionSettings(spellbook.id, { [key]: value });
		if (updatedBook && onSpellbookUpdated) {
			onSpellbookUpdated(updatedBook);
		}
	};

	const handleConfirmDelete = () => {
		const didDelete = deleteSpellbook(spellbook.id);
		setIsDeleteConfirmOpen(false);
		if (didDelete) {
			if (onSpellbookDeleted) {
				onSpellbookDeleted(spellbook.id);
			}
			onClose();
		}
	};

	const toggleFilterCheckbox = (field, option) => {
		setFilterSelections((previous) => {
			const exists = previous.some((entry) => entry.field === field && entry.value === option && entry.mode === filterMode);
			if (exists) {
				return previous.filter((entry) => !(entry.field === field && entry.value === option && entry.mode === filterMode));
			}
			return [...previous, { field, value: option, mode: filterMode }];
		});
	};

	const removeFilterSelection = (field, value, mode) => {
		setFilterSelections((previous) => previous.filter((entry) => !(entry.field === field && entry.value === value && entry.mode === mode)));
	};

	const clearAllFilters = () => setFilterSelections([]);

	const addKeywordFilter = () => {
		const trimmed = keywordDraft.trim();
		if (!trimmed) return;
		setFilterSelections((previous) => {
			const exists = previous.some(
				(entry) => entry.field === "Keyword" && entry.value.toLowerCase() === trimmed.toLowerCase() && entry.mode === filterMode,
			);
			if (exists) return previous;
			return [...previous, { field: "Keyword", value: trimmed, mode: filterMode }];
		});
		setKeywordDraft("");
	};

	const renderSpellRow = (spell, sectionKey) => {
		const durationDisplay = getDurationDisplayValue(spell);
		const showLevelInMeta = sectionKey === "pinned" || sectionKey === "ritual";
		const metaParts = [
			showLevelInMeta ? getLevelDisplayLabel(spell) : null,
			spell.school,
			spell.castingTime,
			spell.range,
			durationDisplay,
			spell.components,
		].filter(Boolean);
		const isPrepared = Boolean(spell.prepared);
		const hasNotes = Boolean(spell.notes && spell.notes.trim());
		const isExpanded = expandedSpellId === spell.id;

		return (
			<div key={spell.id} className={`spellbook-row${isPrepared ? " is-prepared" : ""}`}>
				<div
					className="spellbook-row-main"
					onClick={() => toggleSpellDescription(spell.id)}
					aria-expanded={isExpanded}
				>
					<div className="spellbook-row-info">
						<div className="spellbook-row-name">{spell.name}</div>
						<div className="spellbook-row-meta">{metaParts.join(" • ")}</div>
					</div>
					<div className="spellbook-row-actions" onClick={(event) => event.stopPropagation()}>
						<button
							type="button"
							className="spellbook-icon-button spellbook-icon-prepared"
							aria-label={isPrepared ? `Unprepare ${spell.name}` : `Prepare ${spell.name}`}
							aria-pressed={isPrepared}
							data-tooltip="Prepare"
							onClick={() => toggleSpellFlag(spell.id, "prepared")}
						>
							<PreparedCircleIcon active={isPrepared} />
						</button>
						{pinnedSectionEnabled ? (
							<button
								type="button"
								className={`spellbook-icon-button spellbook-icon-pin${!isPrepared ? " is-muted" : ""}`}
								aria-label={spell.pinned ? `Unpin ${spell.name}` : `Pin ${spell.name}`}
								aria-pressed={Boolean(spell.pinned)}
								data-tooltip="Pin"
								onClick={() => toggleSpellFlag(spell.id, "pinned")}
							>
								<PinIcon active={Boolean(spell.pinned)} />
							</button>
						) : null}
						<button
							type="button"
							className={`spellbook-icon-button spellbook-icon-always${!isPrepared ? " is-muted" : ""}`}
							aria-label={spell.alwaysPrepared ? `Unmark ${spell.name} as always prepared` : `Mark ${spell.name} as always prepared`}
							aria-pressed={Boolean(spell.alwaysPrepared)}
							data-tooltip="Always Prepared"
							onClick={() => toggleSpellFlag(spell.id, "alwaysPrepared")}
						>
							<StarIcon active={Boolean(spell.alwaysPrepared)} />
						</button>
						<button
							type="button"
							className={`spellbook-icon-button spellbook-icon-notes${!isPrepared ? " is-muted" : ""}${hasNotes ? " has-notes" : ""}`}
							aria-label={hasNotes ? `Notes for ${spell.name} (note saved)` : `Notes for ${spell.name}`}
							data-tooltip="Notes"
							onClick={(event) => openNotesEditor(event, spell)}
						>
							<NotesIcon hasNotes={hasNotes} />
						</button>
						<button
							type="button"
							className="spellbook-icon-button spellbook-icon-delete"
							aria-label={`Remove ${spell.name} from spellbook`}
							data-tooltip="Delete"
							onClick={(event) => handleDeleteSpell(event, spell.id)}
						>
							<TrashIcon />
						</button>
					</div>
				</div>

				<div className={`spellbook-row-accordion${isExpanded ? " is-open" : ""}`}>
					<div className="spellbook-row-accordion-content">
						<div className="spellbook-row-accordion-meta">
							<span><strong>Ritual:</strong> {spell.ritual || "No"}</span>
							<span><strong>Classes:</strong> {formatClassList(spell.classes) || "—"}</span>
							<span><strong>Source:</strong> {spell.source || "—"}</span>
						</div>
						<div className="spellbook-row-accordion-description">{spell.description}</div>
					</div>
				</div>

				{notesSpellId === spell.id ? (
					<div className="spellbook-notes-popover" onClick={(event) => event.stopPropagation()}>
						<textarea
							className="spellbook-notes-textarea"
							value={notesDraft}
							onChange={(event) => setNotesDraft(event.target.value)}
							placeholder={`Notes for ${spell.name}...`}
							autoFocus
						/>
						<div className="spellbook-notes-popover-actions">
							<button type="button" className="spellbook-notes-save" onClick={commitNotes}>Save</button>
							<button type="button" className="spellbook-notes-cancel" onClick={() => setNotesSpellId(null)}>Cancel</button>
						</div>
					</div>
				) : null}
			</div>
		);
	};

	return (
		<div className="spellbook-modal-backdrop" onClick={onClose}>
			<div className="spellbook-modal" onClick={(event) => event.stopPropagation()}>
				<div
					className="spellbook-modal-top-bar"
					style={{
						backgroundColor: spellbook.spineColor,
						"--spellbook-header-font-color": spellbook.fontColor,
					}}
				>
					<div className="spellbook-modal-header">
						<div className="spellbook-modal-header-title">
							<span className="spellbook-modal-book-icon"><BookIcon /></span>
							{isEditMode ? (
								<input
									ref={nameInputRef}
									type="text"
									className="spellbook-modal-title spellbook-modal-title-input"
									value={nameDraft}
									onChange={(event) => setNameDraft(event.target.value)}
									onKeyDown={(event) => {
										if (event.key === "Enter") {
											event.preventDefault();
											commitNameEdit();
											setIsEditMode(false);
										}
									}}
									onBlur={commitNameEdit}
									aria-label="Spellbook name"
								/>
							) : (
								<h2 className="spellbook-modal-title">{spellbook.name}</h2>
							)}
							{isEditMode ? (
								<button
									type="button"
									className="spellbook-header-delete-link"
									onMouseDown={(event) => event.preventDefault()}
									onClick={() => setIsDeleteConfirmOpen(true)}
								>
									Delete Spellbook
								</button>
							) : null}
						</div>
						<div className="spellbook-modal-header-actions">
							<button
								type="button"
								className="spellbook-header-icon-button"
								aria-label={isEditMode ? "Save spellbook changes" : "Edit spellbook"}
								title={isEditMode ? "Save spellbook changes" : "Edit spellbook"}
								onClick={() => setIsEditMode((previous) => !previous)}
							>
								{isEditMode ? <CheckIcon /> : <PencilIcon />}
							</button>
							<button
								type="button"
								className="spellbook-header-icon-button"
								aria-label="Spellbook settings"
								title="Spellbook settings"
								onClick={() => setIsSettingsOpen(true)}
							>
								<GearIcon />
							</button>
							<button type="button" className="spellbook-header-icon-button" aria-label="Close spellbook" onClick={onClose}>
								<CloseIcon />
							</button>
						</div>
					</div>
					{isEditMode ? (
						<div className="spellbook-edit-color-panel">
							<label className="spellbook-edit-color-field">
								<span>Spine Color</span>
								<input
									type="color"
									className="spellbook-edit-color-input"
									value={spellbook.spineColor}
									onChange={handleSpineColorChange}
									aria-label="Spine color"
								/>
							</label>
							<label className="spellbook-edit-color-field">
								<span>Font Color</span>
								<input
									type="color"
									className="spellbook-edit-color-input"
									value={spellbook.fontColor}
									onChange={handleFontColorChange}
									aria-label="Font color"
								/>
							</label>
						</div>
					) : null}
				</div>

				<div className="spellbook-modal-tabs">
					<button
						type="button"
						className={`spellbook-modal-tab spellbook-modal-tab-ribbon${activeTab === "prepared" ? " is-active" : ""}`}
						onClick={() => setActiveTab("prepared")}
					>
						Prepared Spells
					</button>
					<button
						type="button"
						className={`spellbook-modal-tab${activeTab === "known" ? " is-active" : ""}`}
						onClick={() => setActiveTab("known")}
					>
						Known Spells
					</button>
				</div>

				<div className="spellbook-modal-searchbar">
					<div className={`spellbook-prepared-counter${isOverMaxPrepared ? " is-over-max" : ""}`}>
						<span className="spellbook-prepared-counter-label">Prepared</span>
						<span className="spellbook-prepared-counter-value">{preparedCount}</span>
						<span className="spellbook-prepared-counter-divider">/</span>
						<input
							type="text"
							inputMode="numeric"
							pattern="[0-9]*"
							className="spellbook-prepared-max-input"
							value={spellbook.maxPrepared ?? ""}
							onChange={handleMaxPreparedChange}
							placeholder="—"
							aria-label="Maximum prepared spells"
						/>
					</div>
					<div className="spellbook-search-input-wrapper">
						<SearchIcon />
						<input
							type="text"
							className="spellbook-search-input"
							value={searchText}
							onChange={(event) => setSearchText(event.target.value)}
							placeholder="Search spells..."
							aria-label="Search spells"
						/>
					</div>
					<div className="spellbook-filters-dropdown" ref={filtersDropdownRef}>
						<button
							type="button"
							className={`spellbook-filter-pill${filterSelections.length > 0 ? " has-selections" : ""}`}
							onClick={() => setIsFiltersOpen((previous) => !previous)}
							aria-expanded={isAdvancedFiltersOpen}
						>
							<FunnelIcon />
							<span>{filterSelections.length > 0 ? `${filterSelections.length} Filter${filterSelections.length === 1 ? "" : "s"}` : "All Filters"}</span>
							<ChevronIcon direction={isAdvancedFiltersOpen ? "up" : "down"} />
						</button>
						{isAdvancedFiltersOpen ? (
							<div className="spellbook-filters-panel">
								<div className="spellbook-filter-mode-toggle">
									<button
										type="button"
										className={`spellbook-filter-mode-toggle-button${filterMode === "exclude" ? " is-exclude" : " is-include"}`}
										onClick={() => setFilterMode((previous) => (previous === "include" ? "exclude" : "include"))}
										aria-pressed={filterMode === "exclude"}
										aria-label="Toggle filter mode between include and exclude"
									>
										<span className="spellbook-filter-mode-switch" aria-hidden="true" />
										<span className="spellbook-filter-mode-option">Include</span>
										<span className="spellbook-filter-mode-option">Exclude</span>
									</button>
								</div>
								{filterSelections.length > 0 ? (
									<div className="spellbook-filters-chips">
										{filterSelections.map((entry) => (
											<button
												key={selectionKey(entry.field, entry.value, entry.mode)}
												type="button"
												className={`spellbook-filter-chip${entry.mode === "exclude" ? " is-exclude" : ""}`}
												onClick={() => removeFilterSelection(entry.field, entry.value, entry.mode)}
											>
												{entry.mode === "exclude" ? "Exclude " : ""}{entry.field}: {entry.value} ×
											</button>
										))}
										<button type="button" className="spellbook-filters-clear" onClick={clearAllFilters}>Clear all</button>
									</div>
								) : null}
								{FILTER_FIELD_OPTIONS.map((field) => {
									const isOpen = openFilterCategory === field;
									const options = getSecondaryFilterOptions(field, availableSourceNames);
									const selectedCount = filterSelections.filter((entry) => entry.field === field).length;
									return (
										<div key={field} className="spellbook-filter-category">
											<button
												type="button"
												className="spellbook-filter-category-header"
												onClick={() => setOpenFilterCategory(isOpen ? null : field)}
												aria-expanded={isOpen}
											>
												<span>{field}{selectedCount > 0 ? ` (${selectedCount})` : ""}</span>
												<ChevronIcon direction={isOpen ? "up" : "down"} />
											</button>
											{isOpen && field === "Keyword" ? (
												<div className="spellbook-filter-keyword-entry">
													<input
														type="text"
														className="spellbook-filter-keyword-input"
														value={keywordDraft}
														onChange={(event) => setKeywordDraft(event.target.value)}
														onKeyDown={(event) => {
															if (event.key === "Enter") {
																event.preventDefault();
																addKeywordFilter();
															}
														}}
														placeholder={`Type a keyword to ${filterMode}...`}
														aria-label="Keyword filter value"
													/>
													<button type="button" className="spellbook-filter-keyword-add" onClick={addKeywordFilter}>
														Add
													</button>
												</div>
											) : isOpen ? (
												<div className="spellbook-filter-category-options">
													{options.length === 0 ? (
														<div className="spellbook-filter-no-options">No options available</div>
													) : options.map((option) => (
														<label key={option} className="spellbook-filter-option">
															<input
																type="checkbox"
																checked={filterSelections.some((entry) => entry.field === field && entry.value === option && entry.mode === filterMode)}
																onChange={() => toggleFilterCheckbox(field, option)}
															/>
															<span>{option}</span>
														</label>
													))}
												</div>
											) : null}
										</div>
									);
								})}
							</div>
						) : null}
					</div>
				</div>

				<div className="spellbook-modal-body">
					{isLoadingSpells ? (
						<div className="spellbook-loading-indicator" role="status" aria-live="polite">Loading spells...</div>
					) : loadError ? (
						<div className="spellbook-empty-state">{loadError}</div>
					) : groupedSections.length === 0 ? (
						<div className="spellbook-empty-state">
							{activeTab === "prepared"
								? "No spells are prepared yet. Switch to Known Spells and toggle the Prepared circle for a spell."
								: "No spells match your current search or filters."}
						</div>
					) : (
						groupedSections.map((section) => {
							const isCollapsed = collapsedSections.has(section.key);
							return (
								<div key={section.key} className="spellbook-section">
									<button
										type="button"
										className="spellbook-section-header"
										onClick={() => toggleSection(section.key)}
										aria-expanded={!isCollapsed}
									>
										<span className="spellbook-section-flourish" aria-hidden="true">✦</span>
										<span className="spellbook-section-label">{section.label}</span>
										<span className="spellbook-section-rule" aria-hidden="true" />
										<ChevronIcon direction={isCollapsed ? "down" : "up"} />
									</button>
									{!isCollapsed ? (
										<div className="spellbook-section-rows">
											{section.spells.map((spell) => renderSpellRow(spell, section.key))}
										</div>
									) : null}
								</div>
							);
						})
					)}
				</div>

				<div className="spellbook-modal-footer">
					<span className="spellbook-footer-count">{totalShownCount} spell{totalShownCount === 1 ? "" : "s"}</span>
				</div>
			</div>

			{isDeleteConfirmOpen ? (
				<div className="spellbook-delete-confirm-backdrop" onClick={() => setIsDeleteConfirmOpen(false)}>
					<div
						className="spellbook-delete-confirm-modal"
						onClick={(event) => event.stopPropagation()}
						role="alertdialog"
						aria-modal="true"
						aria-label="Confirm spellbook deletion"
					>
						<p className="spellbook-delete-confirm-text">Are you sure? This action cannot be undone.</p>
						<div className="spellbook-delete-confirm-buttons">
							<button type="button" className="spellbook-delete-confirm-proceed" onClick={handleConfirmDelete}>Proceed</button>
							<button type="button" className="spellbook-delete-confirm-cancel" onClick={() => setIsDeleteConfirmOpen(false)}>Cancel</button>
						</div>
					</div>
				</div>
			) : null}

			{isSettingsOpen ? (
				<div className="spellbook-settings-backdrop" onClick={() => setIsSettingsOpen(false)}>
					<div
						className="spellbook-settings-modal"
						onClick={(event) => event.stopPropagation()}
						role="dialog"
						aria-modal="true"
						aria-label="Spellbook section settings"
					>
						<h3 className="spellbook-settings-title">Spellbook Sections</h3>
						<p className="spellbook-settings-subtitle">Choose which optional sections appear for this spellbook.</p>
						<label className="spellbook-settings-option">
							<input
								type="checkbox"
								checked={pinnedSectionEnabled}
								onChange={(event) => handleSectionSettingChange("showPinnedSection", event.target.checked)}
							/>
							<span className="spellbook-settings-option-text">
								<strong>Pinned Section</strong>
								<small>Lets you pin spells so they also appear together at the top of the list, in addition to their level group.</small>
							</span>
						</label>
						<label className="spellbook-settings-option">
							<input
								type="checkbox"
								checked={ritualSectionEnabled}
								onChange={(event) => handleSectionSettingChange("showRitualSection", event.target.checked)}
							/>
							<span className="spellbook-settings-option-text">
								<strong>Ritual Section</strong>
								<small>Automatically groups every known ritual spell at the bottom of Prepared Spells, whether or not it's prepared. Preparing one of these spells will also show it in its level group.</small>
							</span>
						</label>
						<div className="spellbook-settings-actions">
							<button type="button" className="spellbook-settings-close" onClick={() => setIsSettingsOpen(false)}>Done</button>
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
}
