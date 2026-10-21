import { BucketIcon, PositionIcon, TrashIcon } from "./icons";

// The floating toolbar over the selected card — or, when modules are
// selected, over the card they're in — with the same four tools either way:
// the paint colour, the paint bucket, Position & Size, delete. Every button
// has a tooltip and an aria-label.
//
// The colour wheel only sets the bucket's colour. The bucket toggles Paint
// Mode, which paints exactly the part that's clicked — a module's label, a
// module's body, a card's header or a card's background — until Esc or the
// bucket again, so one tool colours everything in a card.

export default function SelectionToolbar({
	style,
	placement,
	paintColor,
	onPaintColor,
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
			<label
				className="cs-toolbar-color"
				title="Paint color — then use the bucket to color labels, modules, headers and backgrounds"
			>
				<input
					type="color"
					value={paintColor}
					aria-label="Paint color"
					onChange={(event) => onPaintColor(event.target.value)}
				/>
			</label>
			<button
				type="button"
				className={`cs-toolbar-btn${paintMode ? " cs-toolbar-btn--on" : ""}`}
				aria-label="Paint bucket"
				aria-pressed={paintMode}
				title={paintMode ? "Stop painting (Esc)" : "Paint bucket — click a label, a module, a card header or a card background to color it"}
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
