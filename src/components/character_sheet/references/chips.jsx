import { useCharacterSheet } from "../CharacterSheetContext";
import { useReferenceUI } from "./useReferenceUI";
import { LinkIcon } from "../icons";
import { describeExpression, describeLocation, describeRole } from "../../../utils/character_sheet/engine/describe";

// A chip is how a saved reference looks: a small pill with a link glyph
// showing the reference's live result. It never edits in place — a click,
// Enter/Space, typing or Backspace/Delete on it opens the reference info
// modal, which is the "this is linked, don't edit it casually" safeguard.
//
//   ?   the reference has an error (a loop, text used in math…) — the
//       tooltip says why
//   !   still waiting for data (a card it needs isn't on the sheet yet)
//   red its source was deleted; it keeps showing its last known value

function formatSigned(value) {
	return value >= 0 ? `+${value}` : `${value}`;
}

// The text a chip shows for an engine entry.
export function chipText(entry, { signed = false } = {}) {
	if (!entry) {
		return "—";
	}
	if (entry.error) {
		return entry.partial ? "!" : "?";
	}
	const { value } = entry;
	if (value === null || value === undefined || value === "") {
		return "—";
	}
	if (typeof value === "boolean") {
		return value ? "Yes" : "No";
	}
	return typeof value === "number" && signed ? formatSigned(value) : String(value);
}

// "", "error", "pending" or "missing" — picks the chip's colours.
export function chipState(entry) {
	if (entry?.state === "missing") {
		return "missing";
	}
	if (entry?.partial) {
		return "pending";
	}
	return entry?.error ? "error" : "";
}

// What a chip says on hover/focus, in words.
export function chipTitle(engine, ref, entry) {
	const lines = [];
	if (ref?.nickname) {
		lines.push(ref.nickname);
	}
	if (ref?.expr) {
		lines.push(`= ${describeExpression(engine, ref.expr)}`);
	}
	if (entry?.state === "missing") {
		lines.push("Its source was deleted — showing its last known value.");
	} else if (entry?.partial) {
		lines.push(`Needs: ${(entry.missingRoles || []).map(describeRole).join(", ")} (add the card that has it).`);
	} else if (entry?.error) {
		lines.push(`Problem: ${entry.error}`);
	}
	return lines.join("\n");
}

// The accessible name: what it is, and its current value.
export function chipLabel(ref, entry, text, name = "Linked value") {
	return `${ref?.nickname || name}: ${text}, linked${entry?.state === "missing" ? " (source deleted)" : ""}. Press Enter for details.`;
}

const OPENS_INFO = new Set(["Enter", " ", "Backspace", "Delete"]);

// Whether a key pressed on a chip should open its info modal: Enter/Space,
// Backspace/Delete, or any typing.
export function opensInfo(event) {
	return OPENS_INFO.has(event.key) || (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey);
}

// The chip for a number piece whose whole value is a reference.
export function ValueChip({ read, pieceId, signed = false, big = false, className = "" }) {
	const { engine } = useCharacterSheet();
	const ui = useReferenceUI();
	const ref = read.piece?.ref;
	const text = chipText(read, { signed });
	const state = chipState(read);
	const open = () => ui.openInfo({ kind: "value", pieceId });
	return (
		<button
			type="button"
			className={`cs-chip${big ? " cs-chip--big" : ""}${state ? ` cs-chip--${state}` : ""}${read.locked ? " cs-locked" : ""} ${className}`}
			data-chip={ref?.id}
			data-chip-kind="value"
			data-chip-piece={pieceId}
			title={chipTitle(engine, ref, read)}
			aria-label={chipLabel(ref, read, text, describeLocation(engine, { pieceId })?.name)}
			disabled={read.locked}
			onClick={open}
			onKeyDown={(event) => {
				if (opensInfo(event)) {
					event.preventDefault();
					event.stopPropagation();
					open();
				}
			}}
		>
			<LinkIcon />
			<span className="cs-chip-text">{text}</span>
		</button>
	);
}
