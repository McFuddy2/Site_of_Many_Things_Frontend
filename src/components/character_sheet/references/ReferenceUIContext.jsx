import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ReferenceUIContext } from "./useReferenceUI";
import { useCharacterSheet } from "../CharacterSheetContext";
import { checkSource } from "../../../utils/character_sheet/engine/engine";
import { describeSource, pageOfCard } from "../../../utils/character_sheet/engine/describe";
import ReferenceInfoDialog from "./ReferenceInfoDialog";
import ReferenceEditor from "./ReferenceEditor";
import DropdownOptionsEditor from "./DropdownOptionsEditor";
import RulesEditor from "./RulesEditor";
import { anchorOf } from "./FloatingPanel";

// Everything about references that spans the sheet, in one place:
//
//   - the reference info modal (what a chip links to; Edit / Unlink / Remove
//     on desktop, read-only below it)
//   - the popover editor (desktop only)
//   - the dropdown-options and lock/hide-rules panels (desktop only), which
//     open the popover editor for each option's or rule's value
//   - Pick mode: while it's on, every value on the sheet is marked usable or
//     not (with the reason), a click on a usable one picks it, page tabs
//     still work, and Esc cancels
//   - Go to source: switches page, scrolls to the piece and flashes it
//
// Fields find each other by `data-piece-id` (and a checkbox group's label bar
// by `data-pick-module`), so no card needs to know any of this exists.
// Components reach it through useReferenceUI.

const PICK_ATTRS = ["data-pick", "data-pick-reason"];

function pickSourceOf(element) {
	if (element.dataset.pickModule) {
		return { module: element.dataset.pickModule, field: "checked" };
	}
	return { piece: element.dataset.pieceId };
}

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function ReferenceUIProvider({ editable, children }) {
	const { sheet, engine, dispatch } = useCharacterSheet();
	const [info, setInfo] = useState(null); // { target }
	const [editor, setEditor] = useState(null); // { target, anchor, originPageId, key }
	const [pick, setPick] = useState(null); // { targetNode, onPick }
	const [hint, setHint] = useState(null); // { x, y, text, ok }
	const [flash, setFlash] = useState(null); // { pieceId, moduleId, n }
	const [panel, setPanel] = useState(null); // { kind: "options", pieceId, anchor } | { kind: "rules", moduleId, anchor }
	const live = useRef({});
	live.current = { sheet, engine, pick, editor };

	const openInfo = useCallback((target) => setInfo({ target }), []);

	const openEditor = useCallback(
		(target, anchorElement = null) => {
			if (!editable) {
				return;
			}
			const box = anchorElement?.getBoundingClientRect();
			setInfo(null);
			setEditor({
				target,
				anchor: box
					? { left: box.left, top: box.top, bottom: box.bottom }
					: { left: window.innerWidth / 2 - 200, top: 120, bottom: 120 },
				originPageId: live.current.sheet.activePageId,
				key: Date.now(),
			});
		},
		[editable]
	);

	const openOptionsEditor = useCallback(
		(pieceId, element) => editable && setPanel({ kind: "options", pieceId, anchor: anchorOf(element) }),
		[editable]
	);
	const openRulesEditor = useCallback(
		(moduleId, element) => editable && setPanel({ kind: "rules", moduleId, anchor: anchorOf(element) }),
		[editable]
	);

	const stopPick = useCallback(() => {
		setPick(null);
		setHint(null);
	}, []);

	const startPick = useCallback((targetNode, onPick) => setPick({ targetNode, onPick }), []);

	const closeEditor = useCallback(() => {
		stopPick();
		// Picking a source on another page leaves you there; closing the
		// editor brings you back to the field you were editing.
		const current = live.current.editor;
		if (current && current.originPageId !== live.current.sheet.activePageId) {
			dispatch({ type: "setActivePage", pageId: current.originPageId });
		}
		setEditor(null);
	}, [dispatch, stopPick]);

	// Go to source: the page that shows it (the current one if it can), then
	// scroll to the piece and flash it.
	const goToSource = useCallback(
		({ pieceId = null, moduleId = null }) => {
			const { sheet: currentSheet, engine: currentEngine } = live.current;
			const cardId = pieceId ? currentEngine.index.pieces[pieceId]?.cardId : currentEngine.index.modules[moduleId]?.cardId;
			const page = cardId ? pageOfCard(currentSheet, cardId) : null;
			if (!page) {
				return;
			}
			if (page.id !== currentSheet.activePageId) {
				dispatch({ type: "setActivePage", pageId: page.id });
			}
			setInfo(null);
			setFlash({ pieceId, moduleId, n: Date.now() });
		},
		[dispatch]
	);

	useEffect(() => {
		if (!flash) {
			return undefined;
		}
		let frame = null;
		let timer = null;
		let tries = 0;
		const selector = flash.pieceId ? `[data-piece-id="${flash.pieceId}"]` : `[data-module-id="${flash.moduleId}"]`;
		const run = () => {
			const element = document.querySelector(selector);
			if (!element) {
				tries += 1;
				frame = tries < 30 ? requestAnimationFrame(run) : null;
				return;
			}
			element.scrollIntoView({ block: "center", inline: "center", behavior: reducedMotion() ? "auto" : "smooth" });
			element.classList.add("cs-flash");
			timer = setTimeout(() => element.classList.remove("cs-flash"), 1800);
		};
		run();
		return () => {
			cancelAnimationFrame(frame);
			clearTimeout(timer);
			document.querySelectorAll(".cs-flash").forEach((element) => element.classList.remove("cs-flash"));
		};
	}, [flash]);

	// Pick mode, part 1: mark every value on screen usable or not. Runs after
	// every render while picking, so a page switch marks the new page too.
	useEffect(() => {
		if (!pick) {
			return undefined;
		}
		for (const element of document.querySelectorAll("[data-piece-id], [data-pick-module]")) {
			const reason = checkSource(engine, pick.targetNode, pickSourceOf(element));
			element.setAttribute("data-pick", reason ? "bad" : "ok");
			if (reason) {
				element.setAttribute("data-pick-reason", reason);
			} else {
				element.removeAttribute("data-pick-reason");
			}
		}
	});

	useEffect(() => {
		if (pick) {
			return undefined;
		}
		for (const element of document.querySelectorAll("[data-pick]")) {
			PICK_ATTRS.forEach((name) => element.removeAttribute(name));
		}
		return undefined;
	}, [pick]);

	// Pick mode, part 2: clicks. A press on a marked value picks it (or does
	// nothing, if it's unusable) instead of focusing or toggling it; presses
	// anywhere else on the sheet are swallowed; page tabs and the editor work
	// as usual. Esc cancels.
	useEffect(() => {
		if (!pick) {
			return undefined;
		}
		const onSheet = (target) => target.closest?.(".cs-canvas, .cs-flow-sheet, .cs-scaled-wrap");
		const swallow = (event) => {
			const marked = event.target.closest?.("[data-pick]");
			if (marked || onSheet(event.target)) {
				event.preventDefault();
				event.stopPropagation();
			}
			return marked;
		};
		const onPointerDown = (event) => {
			const marked = swallow(event);
			if (marked && marked.getAttribute("data-pick") === "ok") {
				const picked = pickSourceOf(marked);
				const { onPick } = live.current.pick || {};
				stopPick();
				onPick?.(picked);
			}
		};
		const onKeyDown = (event) => {
			if (event.key === "Escape") {
				event.preventDefault();
				event.stopPropagation();
				stopPick();
			}
		};
		let frame = null;
		const onPointerMove = (event) => {
			cancelAnimationFrame(frame);
			const { clientX, clientY, target } = event;
			frame = requestAnimationFrame(() => {
				const marked = target.closest?.("[data-pick]");
				if (!marked) {
					setHint(null);
					return;
				}
				const ok = marked.getAttribute("data-pick") === "ok";
				const text = ok ? `Use ${describeSource(live.current.engine, pickSourceOf(marked))}` : marked.getAttribute("data-pick-reason");
				setHint({ x: clientX, y: clientY, text, ok });
			});
		};
		window.addEventListener("pointerdown", onPointerDown, true);
		window.addEventListener("mousedown", swallow, true);
		window.addEventListener("click", swallow, true);
		window.addEventListener("keydown", onKeyDown, true);
		window.addEventListener("pointermove", onPointerMove, true);
		return () => {
			cancelAnimationFrame(frame);
			window.removeEventListener("pointerdown", onPointerDown, true);
			window.removeEventListener("mousedown", swallow, true);
			window.removeEventListener("click", swallow, true);
			window.removeEventListener("keydown", onKeyDown, true);
			window.removeEventListener("pointermove", onPointerMove, true);
		};
	}, [pick, stopPick]);

	const value = useMemo(
		() => ({ editable, picking: Boolean(pick), openInfo, openEditor, goToSource, startPick, stopPick, openOptionsEditor, openRulesEditor }),
		[editable, pick, openInfo, openEditor, goToSource, startPick, stopPick, openOptionsEditor, openRulesEditor]
	);

	return (
		<ReferenceUIContext.Provider value={value}>
			<div className={pick ? "cs-picking" : undefined} style={{ display: "contents" }}>
				{children}
			</div>
			{info ? <ReferenceInfoDialog target={info.target} onClose={() => setInfo(null)} /> : null}
			{/* Panels step aside while picking, so the sheet behind is clear. */}
			{panel?.kind === "options" && !pick ? (
				<DropdownOptionsEditor pieceId={panel.pieceId} anchor={panel.anchor} onClose={() => setPanel(null)} />
			) : null}
			{panel?.kind === "rules" && !pick ? <RulesEditor moduleId={panel.moduleId} anchor={panel.anchor} onClose={() => setPanel(null)} /> : null}
			{editor ? <ReferenceEditor key={editor.key} target={editor.target} anchor={editor.anchor} onClose={closeEditor} /> : null}
			{hint ? (
				<div className={`cs-pick-hint${hint.ok ? "" : " cs-pick-hint--bad"}`} style={{ left: hint.x + 14, top: hint.y + 16 }} role="status">
					{hint.text}
				</div>
			) : null}
		</ReferenceUIContext.Provider>
	);
}
