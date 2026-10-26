import { useLayoutEffect, useRef } from "react";
import { useCharacterSheet } from "../CharacterSheetContext";
import usePieceValue from "../usePieceValue";
import { useReferenceUI, rememberCaret } from "./useReferenceUI";
import { chipText, chipState, chipTitle, chipLabel, opensInfo } from "./chips";
import { LINK_ICON_PATHS } from "../icons";
import { nodeIds } from "../../../utils/character_sheet/engine/engine";

// A text piece that holds chips: plain text you type freely before, between
// and after them. (A text piece without chips stays an ordinary input or
// textarea.) It's a small contenteditable — no editor library — that the
// browser edits directly; each edit is read back into segments, and React
// only rebuilds it when the segments change from outside (undo, another
// field, a chip saved in the editor), so typing never loses the caret.
//
// Chips can't be edited or deleted by typing: any edit that would touch one
// — Backspace/Delete beside it, typing over a selection that includes it,
// cut, drag — is cancelled and opens that chip's info modal instead. Paste
// is always plain text.

const SVG_NS = "http://www.w3.org/2000/svg";

function chipElement(ref) {
	const chip = document.createElement("span");
	chip.contentEditable = "false";
	chip.dataset.chip = ref.id;
	chip.dataset.chipKind = "chip";
	chip.setAttribute("role", "button");
	chip.tabIndex = 0;
	const icon = document.createElementNS(SVG_NS, "svg");
	icon.setAttribute("viewBox", "0 0 24 24");
	icon.setAttribute("width", "12");
	icon.setAttribute("height", "12");
	icon.setAttribute("aria-hidden", "true");
	icon.setAttribute("fill", "none");
	icon.setAttribute("stroke", "currentColor");
	icon.setAttribute("stroke-width", "2");
	icon.setAttribute("stroke-linecap", "round");
	for (const d of LINK_ICON_PATHS) {
		const path = document.createElementNS(SVG_NS, "path");
		path.setAttribute("d", d);
		icon.appendChild(path);
	}
	const text = document.createElement("span");
	text.className = "cs-chip-text";
	chip.append(icon, text);
	return chip;
}

// Segments as the editor's DOM: text nodes and chip spans.
function renderSegments(root, segments) {
	root.replaceChildren(
		...segments.map((segment) => (segment.type === "chip" && segment.ref ? chipElement(segment.ref) : document.createTextNode(segment.value ?? "")))
	);
}

// The editor's DOM read back as segments. Chips come back as the very
// segment objects they were (found by id), so a chip is never re-created.
function readSegments(root, chipsById) {
	const segments = [];
	const pushText = (value) => {
		const last = segments[segments.length - 1];
		if (last?.type === "text") {
			segments[segments.length - 1] = { type: "text", value: last.value + value };
		} else if (value) {
			segments.push({ type: "text", value });
		}
	};
	const walk = (node) => {
		for (const child of node.childNodes) {
			if (child.nodeType === Node.TEXT_NODE) {
				pushText(child.nodeValue);
			} else if (child.dataset?.chip) {
				const chip = chipsById.get(child.dataset.chip);
				if (chip) {
					segments.push(chip);
				}
			} else if (child.nodeName === "BR") {
				pushText("\n");
			} else {
				if ((child.nodeName === "DIV" || child.nodeName === "P") && segments.length) {
					pushText("\n");
				}
				walk(child);
			}
		}
	};
	walk(root);
	return segments.length ? segments : [{ type: "text", value: "" }];
}

// The caret as an offset in the field's content, each chip counting as one.
function caretOffset(root) {
	const selection = window.getSelection();
	if (!selection?.rangeCount || !root.contains(selection.anchorNode)) {
		return null;
	}
	const range = document.createRange();
	range.setStart(root, 0);
	range.setEnd(selection.anchorNode, selection.anchorOffset);
	const fragment = range.cloneContents();
	const chips = fragment.querySelectorAll("[data-chip]").length;
	fragment.querySelectorAll("[data-chip]").forEach((chip) => chip.remove());
	return fragment.textContent.length + chips;
}

// The chip an edit would touch, if any: the ones inside the ranges the
// browser is about to change, or — when it doesn't say — next to the caret.
function chipTouchedBy(root, event) {
	const chips = [...root.querySelectorAll("[data-chip]")];
	if (!chips.length) {
		return null;
	}
	const ranges = (event.getTargetRanges?.() || []).map((staticRange) => {
		const range = document.createRange();
		range.setStart(staticRange.startContainer, staticRange.startOffset);
		range.setEnd(staticRange.endContainer, staticRange.endOffset);
		return range;
	});
	const selection = window.getSelection();
	if (!ranges.length && selection?.rangeCount) {
		ranges.push(selection.getRangeAt(0));
	}
	for (const range of ranges) {
		const hit = chips.find((chip) => range.intersectsNode(chip) && !range.collapsed);
		if (hit) {
			return hit;
		}
		if (range.collapsed && event.inputType?.startsWith("delete")) {
			const backward = event.inputType.includes("Backward");
			const { startContainer: node, startOffset: offset } = range;
			let neighbour = null;
			if (node.nodeType === Node.TEXT_NODE) {
				if (backward && offset === 0) {
					neighbour = node.previousSibling;
				} else if (!backward && offset === node.nodeValue.length) {
					neighbour = node.nextSibling;
				}
			} else {
				neighbour = node.childNodes[backward ? offset - 1 : offset];
			}
			if (neighbour?.dataset?.chip) {
				return neighbour;
			}
		}
	}
	return null;
}

export default function ChipTextField({ pieceId, multiline = false, className = "" }) {
	const read = usePieceValue(pieceId);
	const { engine, dispatch, readOnly } = useCharacterSheet();
	const ui = useReferenceUI();
	const rootRef = useRef(null);
	const emitted = useRef(null);
	const segments = read.piece?.segments || [];
	const editable = !readOnly && !read.locked;

	const chipsById = new Map(segments.filter((segment) => segment.type === "chip").map((segment) => [segment.ref.id, segment]));
	const openChip = (refId) => ui.openInfo({ kind: "chip", pieceId, refId });

	// Rebuild only when the segments came from somewhere other than this field.
	useLayoutEffect(() => {
		const key = JSON.stringify(segments);
		if (key !== emitted.current) {
			emitted.current = key;
			renderSegments(rootRef.current, segments);
		}
	}, [segments]);

	// Every chip shows its live value — after any change anywhere.
	useLayoutEffect(() => {
		for (const element of rootRef.current.querySelectorAll("[data-chip]")) {
			const ref = chipsById.get(element.dataset.chip)?.ref;
			const entry = engine.values.get(nodeIds.part(pieceId, element.dataset.chip));
			const text = chipText(entry);
			const state = chipState(entry);
			element.className = `cs-chip cs-chip--inline${state ? ` cs-chip--${state}` : ""}`;
			element.title = chipTitle(engine, ref, entry);
			element.setAttribute("aria-label", chipLabel(ref, entry, text));
			element.querySelector(".cs-chip-text").textContent = text;
		}
	});

	// The native beforeinput (React's onBeforeInput never sees deletions):
	// any edit that would touch a chip is cancelled and opens it instead.
	const openChipRef = useRef(openChip);
	openChipRef.current = openChip;
	useLayoutEffect(() => {
		const root = rootRef.current;
		const onBeforeInput = (event) => {
			const chip = chipTouchedBy(root, event);
			if (chip) {
				event.preventDefault();
				openChipRef.current(chip.dataset.chip);
			}
		};
		root.addEventListener("beforeinput", onBeforeInput);
		return () => root.removeEventListener("beforeinput", onBeforeInput);
	}, []);

	const commit = () => {
		const next = readSegments(rootRef.current, chipsById);
		emitted.current = JSON.stringify(next);
		dispatch({ type: "setPieceValue", pieceId, value: next });
	};

	const remember = () => {
		const offset = caretOffset(rootRef.current);
		if (offset !== null) {
			rememberCaret(pieceId, offset);
		}
	};

	return (
		<div
			ref={rootRef}
			className={`cs-chiptext ${multiline ? "cs-textarea cs-chiptext--multi" : "cs-input cs-chiptext--single"} ${className}${read.locked ? " cs-locked" : ""}`}
			data-piece-id={pieceId}
			contentEditable={editable}
			suppressContentEditableWarning
			role="textbox"
			aria-multiline={multiline}
			aria-label={read.piece?.label || "Text"}
			aria-disabled={read.locked || undefined}
			onInput={commit}
			onKeyDown={(event) => {
				const chip = event.target.closest?.("[data-chip]");
				if (chip && opensInfo(event)) {
					event.preventDefault();
					event.stopPropagation();
					openChip(chip.dataset.chip);
					return;
				}
				if (event.key === "Enter") {
					event.preventDefault();
					if (multiline) {
						document.execCommand("insertText", false, "\n");
					}
				}
			}}
			onKeyUp={remember}
			onMouseUp={remember}
			onBlur={remember}
			onPaste={(event) => {
				event.preventDefault();
				const pasted = event.clipboardData.getData("text/plain");
				document.execCommand("insertText", false, multiline ? pasted : pasted.replace(/\s*\n\s*/g, " "));
			}}
			onDrop={(event) => event.preventDefault()}
			onMouseDown={(event) => {
				// A press on a chip opens it rather than placing the caret.
				if (event.target.closest("[data-chip]")) {
					event.preventDefault();
				}
			}}
			onClick={(event) => {
				const chip = event.target.closest("[data-chip]");
				if (chip) {
					openChip(chip.dataset.chip);
				}
			}}
		/>
	);
}
