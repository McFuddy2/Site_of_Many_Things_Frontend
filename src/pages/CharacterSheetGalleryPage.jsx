import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { SheetPreviewProvider } from "../components/character_sheet/CharacterSheetContext";
import { CardFace, ModuleView, staticCardStyle, moduleSlotStyle } from "../components/character_sheet/CharacterSheetCard";
import {
	CARD_TYPE_OPTIONS,
	STANDARD_CARD_TYPES,
	createSheet,
	createStandardCard,
	createCard,
	createModuleForType,
	createSavingThrowModule,
	createHealthCard,
} from "../utils/character_sheet/schema";
import { buildDefaultLayout } from "../utils/character_sheet/cardLayouts";
import { coverage, fitCardSize, boundingSize } from "../utils/character_sheet/grid";
import { getModuleSizing, MODULE_TYPES } from "../utils/character_sheet/moduleTypes";
import { CARD_HEADER_HEIGHT, CARD_BORDER, GAP, GRID_UNIT, SIZE, tokenCssVars } from "../utils/character_sheet/layoutConstants";
import "../CharacterSheetStyles.css";

// DEV-ONLY (routed only when import.meta.env.DEV — see AppRouter). Renders
// every standard card at its default size, and every module type at its
// minimum and default sizes, then audits each one against the sizing rules:
// equal header heights, no clipped labels or values, no scrollbars, nothing
// cut off by a module's edge, no dead space, every module labelled, uniform
// gaps. Results show inline and on window.__csGallery for scripted checks.

const LABEL_SELECTOR = ".cs-mod-label-text, .cs-row-label, .cs-caption, .cs-coin-label, .cs-list-head-name";
const CONTENT_SELECTOR =
	"input, textarea, select, button, img, .cs-mod-label, .cs-row-label, .cs-caption, .cs-value, .cs-value--big, .cs-list-row, .cs-coin-row, .cs-image-empty, .cs-value-suffix, .cs-value-sign";

let measureContext = null;
function textWidth(text, element) {
	measureContext = measureContext || document.createElement("canvas").getContext("2d");
	const style = getComputedStyle(element);
	measureContext.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
	return measureContext.measureText(text).width;
}

// Shared DOM checks for a rendered card or module sample.
function auditElement(root, { checkLabels = true, checkPlaceholders = true } = {}) {
	const issues = [];
	if (checkLabels) {
		root.querySelectorAll(LABEL_SELECTOR).forEach((node) => {
			if (node.scrollWidth > node.clientWidth + 0.5) {
				issues.push(`label clipped: "${node.textContent}"`);
			}
		});
	}
	root.querySelectorAll("input[type=text], input[type=number]").forEach((input) => {
		const text = input.value || (checkPlaceholders ? input.placeholder : "");
		if (!text) {
			return;
		}
		const style = getComputedStyle(input);
		const room = input.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
		if (textWidth(text, input) > room + 0.5) {
			issues.push(`text clipped: "${text}"`);
		}
	});
	root.querySelectorAll("*").forEach((node) => {
		const style = getComputedStyle(node);
		const scrollsY = /(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 1;
		const scrollsX = /(auto|scroll)/.test(style.overflowX) && node.scrollWidth > node.clientWidth + 1;
		if (scrollsY || scrollsX) {
			issues.push(`scrollbar on .${String(node.className).split(" ")[0]}`);
		}
	});
	root.querySelectorAll(".cs-module").forEach((module) => {
		const box = module.getBoundingClientRect();
		module.querySelectorAll(CONTENT_SELECTOR).forEach((child) => {
			if (child.closest(".cs-visually-hidden") || child.classList.contains("cs-visually-hidden")) {
				return;
			}
			const rect = child.getBoundingClientRect();
			if (!rect.width && !rect.height) {
				return;
			}
			if (rect.left < box.left - 0.5 || rect.right > box.right + 0.5 || rect.top < box.top - 0.5 || rect.bottom > box.bottom + 0.5) {
				issues.push(`cut off: ${child.tagName.toLowerCase()}.${String(child.className).split(" ")[0] || ""}`);
			}
		});
		module.querySelectorAll("textarea").forEach((area) => {
			if (area.getBoundingClientRect().height < 36) {
				issues.push("textarea under two lines tall");
			}
		});
		const label = module.querySelector(".cs-mod-label-text, .cs-row-label, .cs-column-label, .cs-row-label-input");
		const labelText = label ? label.textContent || label.value : "";
		if (!labelText || !labelText.trim()) {
			issues.push("module has no visible label");
		}
	});
	return issues;
}

function auditCard(element, card, layout) {
	const issues = [];
	const header = element.querySelector(".cs-card-header");
	const headerHeight = Math.round(header.getBoundingClientRect().height);
	if (headerHeight !== CARD_HEADER_HEIGHT) {
		issues.push(`header ${headerHeight}px (expected ${CARD_HEADER_HEIGHT})`);
	}
	const title = element.querySelector(".cs-card-title");
	if (title.scrollWidth > title.clientWidth + 0.5) {
		issues.push("title truncated");
	}
	if (getComputedStyle(title).fontSize !== `${SIZE.headerFont}px`) {
		issues.push(`title font ${getComputedStyle(title).fontSize}`);
	}
	issues.push(...auditElement(element));

	// Uniform gaps: the module block sits exactly GAP from every inner edge.
	const cardBox = element.getBoundingClientRect();
	const modules = [...element.querySelectorAll(".cs-module-slot")].map((slot) => slot.getBoundingClientRect());
	if (modules.length) {
		const headerBottom = header.getBoundingClientRect().bottom;
		const gaps = {
			left: Math.min(...modules.map((r) => r.left)) - (cardBox.left + CARD_BORDER),
			right: cardBox.right - CARD_BORDER - Math.max(...modules.map((r) => r.right)),
			top: Math.min(...modules.map((r) => r.top)) - headerBottom,
			bottom: cardBox.bottom - CARD_BORDER - Math.max(...modules.map((r) => r.bottom)),
		};
		for (const [side, gap] of Object.entries(gaps)) {
			if (Math.abs(gap - GAP) > 0.5) {
				issues.push(`${side} edge gap ${gap.toFixed(1)}px (expected ${GAP})`);
			}
		}
	}

	// No dead space: modules tile their bounding box, and the card is exactly
	// that box plus its header.
	const rects = layout.moduleOrder.map((id) => layout.moduleRects[id]);
	const { cols, rows } = boundingSize(rects);
	const covered = coverage(rects, cols, rows);
	if (covered < 1) {
		issues.push(`dead space: modules cover ${Math.round(covered * 100)}%`);
	}
	const fit = fitCardSize(card.title, layout.moduleRects);
	if (fit.w !== layout.w || fit.h !== layout.h) {
		issues.push("card larger than its content");
	}
	return issues;
}

// Every module type, built the way the Custom Card picker builds it (plus the
// few that only standard cards create).
function buildModuleSamples() {
	const samples = [];
	for (const type of Object.keys(MODULE_TYPES)) {
		let module = null;
		if (type === "savingThrow") {
			module = createSavingThrowModule("Constitution");
		} else if (type === "damageHeal") {
			const health = createHealthCard();
			module = health.modules[health.moduleOrder[3]];
		} else {
			module = createModuleForType(type, {});
		}
		if (module) {
			samples.push(module);
		}
	}
	return samples;
}

function buildGallerySheet() {
	let sheet = createSheet("Gallery");
	const cards = {};
	// Ability Scores first, like on a real sheet.
	for (const type of ["abilityScores", ...STANDARD_CARD_TYPES.filter((t) => t !== "abilityScores")]) {
		const card = createStandardCard(type);
		cards[card.id] = card;
	}
	const sampleCard = createCard({ type: "custom", title: "Module samples", modules: buildModuleSamples() });
	cards[sampleCard.id] = sampleCard;
	sheet = { ...sheet, cards };
	return { sheet, sampleCard };
}

const pickerLabel = (type) => CARD_TYPE_OPTIONS.find((option) => option.id === type)?.label || type;

export default function CharacterSheetGalleryPage() {
	const { sheet, sampleCard } = useMemo(buildGallerySheet, []);
	const cards = useMemo(
		() =>
			Object.values(sheet.cards)
				.filter((card) => card.type !== "custom")
				.sort((a, b) => pickerLabel(a.type).localeCompare(pickerLabel(b.type))),
		[sheet]
	);
	const layouts = useMemo(() => Object.fromEntries(cards.map((card) => [card.id, buildDefaultLayout(card)])), [cards]);
	const rootRef = useRef(null);
	const [results, setResults] = useState(null);

	useLayoutEffect(() => {
		let cancelled = false;
		document.fonts.ready.then(() => {
			if (cancelled || !rootRef.current) {
				return;
			}
			const cardResults = cards.map((card) => {
				const element = rootRef.current.querySelector(`[data-gallery-card="${card.id}"] .cs-card`);
				return { id: card.id, type: card.type, issues: auditCard(element, card, layouts[card.id]) };
			});
			const moduleResults = [];
			rootRef.current.querySelectorAll("[data-gallery-module]").forEach((element) => {
				const [type, size] = element.dataset.galleryModule.split(":");
				moduleResults.push({
					type,
					size,
					issues: auditElement(element, { checkLabels: size === "default", checkPlaceholders: size === "default" }),
				});
			});
			const report = { cards: cardResults, modules: moduleResults };
			window.__csGallery = report;
			setResults(report);
		});
		return () => {
			cancelled = true;
		};
	}, [cards, layouts]);

	const issuesFor = (id) => results?.cards.find((entry) => entry.id === id)?.issues;
	const failingCards = results ? results.cards.filter((entry) => entry.issues.length).length : null;
	const failingModules = results ? results.modules.filter((entry) => entry.issues.length).length : null;

	return (
		<div className="cs-page cs-gallery" style={tokenCssVars()} ref={rootRef}>
			<SheetPreviewProvider sheet={sheet}>
				<header className="cs-gallery-head">
					<h1>Character Sheet card gallery (dev only)</h1>
					<p>
						{results
							? `${cards.length - failingCards}/${cards.length} cards and ${results.modules.length - failingModules}/${results.modules.length} module samples pass.`
							: "Auditing…"}
					</p>
				</header>

				<h2 className="cs-gallery-section">Every card at its default size</h2>
				<div className="cs-gallery-grid">
					{cards.map((card) => {
						const layout = layouts[card.id];
						const issues = issuesFor(card.id);
						return (
							<figure key={card.id} className="cs-gallery-item" data-gallery-card={card.id}>
								<figcaption>
									<strong>{pickerLabel(card.type)}</strong> · {layout.w}×{layout.h} units
									{issues ? (
										issues.length ? (
											<ul className="cs-gallery-issues">
												{issues.map((issue, index) => (
													<li key={index}>{issue}</li>
												))}
											</ul>
										) : (
											<span className="cs-gallery-pass"> ✓</span>
										)
									) : null}
								</figcaption>
								<CardFace card={card} layout={layout} style={staticCardStyle(layout)} />
							</figure>
						);
					})}
				</div>

				<h2 className="cs-gallery-section">Every module type at its minimum and default size</h2>
				<div className="cs-gallery-grid">
					{sampleCard.moduleOrder.map((moduleId) => {
						const module = sampleCard.modules[moduleId];
						const sizing = getModuleSizing(module);
						const minH = getModuleSizing(module, sizing.minW).minH;
						return ["min", "default"].map((size) => {
							const w = size === "min" ? sizing.minW : sizing.defaultW;
							const h = size === "min" ? minH : sizing.defaultH;
							const issues = results?.modules.find((entry) => entry.type === module.type && entry.size === size)?.issues;
							return (
								<figure key={`${moduleId}-${size}`} className="cs-gallery-item">
									<figcaption>
										<strong>{module.type}</strong> · {size} {w}×{h}
										{issues ? (
											issues.length ? (
												<ul className="cs-gallery-issues">
													{issues.map((issue, index) => (
														<li key={index}>{issue}</li>
													))}
												</ul>
											) : (
												<span className="cs-gallery-pass"> ✓</span>
											)
										) : null}
									</figcaption>
									<div
										className="cs-gallery-module"
										data-gallery-module={`${module.type}:${size}`}
										style={{ width: w * GRID_UNIT, height: h * GRID_UNIT }}
									>
										<div className="cs-module-slot" style={moduleSlotStyle({ x: 0, y: 0, w, h })}>
											<ModuleView module={module} />
										</div>
									</div>
								</figure>
							);
						});
					})}
				</div>
			</SheetPreviewProvider>
		</div>
	);
}
