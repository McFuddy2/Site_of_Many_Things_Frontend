import { useEffect, useRef } from "react";
import { BucketIcon, PositionIcon, TrashIcon } from "./icons";

// The floating toolbar over the current selection: colour wheel(s), paint
// bucket, Position & Size, delete. Every button has a tooltip and an
// aria-label.
//
// Modules get two colour wheels — the label bar and the module body are
// coloured separately — and cards get one, for the header. Picking a colour
// makes it the bucket's active colour too; when the picker closes (its
// native "change" event) the colour is applied to that part of everything
// selected, as a single undo step. The bucket toggles Paint Mode, which
// paints exactly the part that's clicked until Esc or the bucket again.

function ColorWheel({ part, label, value, onInput, onCommit }) {
	const ref = useRef(null);
	useEffect(() => {
		const input = ref.current;
		if (!input) {
			return undefined;
		}
		const commit = () => onCommit(input.value, part);
		input.addEventListener("change", commit);
		return () => input.removeEventListener("change", commit);
	}, [onCommit, part]);
	return (
		<label className="cs-toolbar-color" title={`${label} — also becomes the paint bucket's color`}>
			<input ref={ref} type="color" value={value} aria-label={label} onChange={(event) => onInput(event.target.value)} />
			<span className="cs-toolbar-color-caption" aria-hidden="true">
				{label.split(" ")[0]}
			</span>
		</label>
	);
}

export default function SelectionToolbar({
	style,
	placement,
	colors,
	onColorInput,
	onColorCommit,
	paintMode,
	onTogglePaint,
	onPositionSize,
	canPositionSize,
	onDelete,
	count,
}) {
	const noun = count > 1 ? `${count} selected` : "selection";
	return (
		<div
			className={`cs-toolbar cs-toolbar--${placement}`}
			role="toolbar"
			aria-label="Selection tools"
			data-canvas-ui
			style={style}
		>
			{colors.map((color) => (
				<ColorWheel key={color.part} {...color} onInput={onColorInput} onCommit={onColorCommit} />
			))}
			<button
				type="button"
				className={`cs-toolbar-btn${paintMode ? " cs-toolbar-btn--on" : ""}`}
				aria-label="Paint bucket"
				aria-pressed={paintMode}
				title={paintMode ? "Stop painting (Esc)" : "Paint bucket — click a label, a module, or a card header to color it"}
				onClick={onTogglePaint}
			>
				<BucketIcon />
			</button>
			<button
				type="button"
				className="cs-toolbar-btn"
				aria-label="Position and size"
				title={canPositionSize ? "Position & Size" : "Position & Size works on one item at a time"}
				disabled={!canPositionSize}
				onClick={onPositionSize}
			>
				<PositionIcon />
			</button>
			<button
				type="button"
				className="cs-toolbar-btn cs-toolbar-btn--danger"
				aria-label={`Delete ${noun}`}
				title="Delete (Del)"
				onClick={onDelete}
			>
				<TrashIcon />
			</button>
		</div>
	);
}
