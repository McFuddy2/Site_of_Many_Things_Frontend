import { useEffect, useRef } from "react";
import { BucketIcon, PositionIcon, TrashIcon } from "./icons";

// The floating toolbar over the current selection: colour wheel, paint
// bucket, Position & Size, delete. Every button has a tooltip and an
// aria-label.
//
// The colour wheel sets the active colour; when the picker closes (its
// native "change" event) that colour is also applied to the selection, as a
// single undo step. The bucket toggles Paint Mode, which keeps painting
// whatever is clicked with the active colour until Esc or the bucket again.

export default function SelectionToolbar({
	style,
	placement,
	color,
	onColorInput,
	onColorCommit,
	paintMode,
	onTogglePaint,
	onPositionSize,
	canPositionSize,
	onDelete,
	count,
}) {
	const colorRef = useRef(null);

	useEffect(() => {
		const input = colorRef.current;
		if (!input) {
			return undefined;
		}
		const commit = () => onColorCommit(input.value);
		input.addEventListener("change", commit);
		return () => input.removeEventListener("change", commit);
	}, [onColorCommit]);

	const noun = count > 1 ? `${count} selected` : "selection";

	return (
		<div
			className={`cs-toolbar cs-toolbar--${placement}`}
			role="toolbar"
			aria-label="Selection tools"
			data-canvas-ui
			style={style}
		>
			<label className="cs-toolbar-color" title="Color — sets the paint color and recolors the selection">
				<input
					ref={colorRef}
					type="color"
					value={color}
					aria-label={`Color for ${noun}`}
					onChange={(event) => onColorInput(event.target.value)}
				/>
			</label>
			<button
				type="button"
				className={`cs-toolbar-btn${paintMode ? " cs-toolbar-btn--on" : ""}`}
				aria-label="Paint bucket"
				aria-pressed={paintMode}
				title={paintMode ? "Stop painting (Esc)" : "Paint bucket — click cards and modules to color them"}
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
