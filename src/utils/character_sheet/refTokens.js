// Serialization between a Text piece's segment array and a plain string that can
// be edited in a textarea. A reference segment appears in the string as
// @[Readable Label](pieceId) — the label is cosmetic, the pieceId is what's
// stored, so references survive edits and renames.

import { getPieceDisplayValue } from "./references.js";

const TOKEN_PATTERN = /@\[([^\]]*)\]\(([^)]+)\)/g;

// The editable token for a piece, labeled "Module – Piece" (e.g. "Wisdom – Bonus").
export function refTokenFor(pieceId, pieceIndex) {
	const entry = pieceIndex[pieceId];
	const label = entry
		? [entry.moduleLabel, entry.piece.label].filter(Boolean).join(" – ") || "reference"
		: "missing reference";
	return `@[${label}](${pieceId})`;
}

// Parses textarea text into segments. Tokens pointing at unknown pieces stay as
// plain text rather than becoming broken references.
export function textToSegments(raw, pieceIndex) {
	const segments = [];
	let last = 0;
	for (const match of raw.matchAll(TOKEN_PATTERN)) {
		if (match.index > last) {
			segments.push({ type: "text", value: raw.slice(last, match.index) });
		}
		if (pieceIndex[match[2]]) {
			segments.push({ type: "ref", pieceId: match[2] });
		} else {
			segments.push({ type: "text", value: match[0] });
		}
		last = match.index + match[0].length;
	}
	if (last < raw.length || segments.length === 0) {
		segments.push({ type: "text", value: raw.slice(last) });
	}
	return segments;
}

export function segmentsToText(segments, pieceIndex) {
	return segments
		.map((segment) => (segment.type === "ref" ? refTokenFor(segment.pieceId, pieceIndex) : segment.value))
		.join("");
}

// Resolved, human-readable preview of what the segments will display.
export function resolveSegmentsPreview(segments, pieceIndex) {
	return segments
		.map((segment) => {
			if (segment.type === "text") {
				return segment.value;
			}
			const resolved = getPieceDisplayValue(segment.pieceId, pieceIndex);
			return resolved.error ? "—" : resolved.text;
		})
		.join("");
}

// Every piece on a card that other cards are allowed to reference
// (Variable, Checkbox, Text — not Buttons or Dropdowns), with picker labels.
export function referenceablePieces(card) {
	const pieces = [];
	for (const moduleId of card.moduleOrder) {
		const module = card.modules[moduleId];
		if (!module) {
			continue;
		}
		for (const pieceId of module.pieceOrder) {
			const piece = module.pieces[pieceId];
			if (piece && ["variable", "checkbox", "text"].includes(piece.kind)) {
				pieces.push({
					id: pieceId,
					label: [module.label, piece.label].filter(Boolean).join(" – ") || module.label || piece.kind,
				});
			}
		}
	}
	return pieces;
}
