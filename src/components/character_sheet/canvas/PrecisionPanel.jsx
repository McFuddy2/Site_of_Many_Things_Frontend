import { useEffect, useRef, useState } from "react";

// Numeric position/size controls, the align/distribute actions and the snap
// toggles for whatever is currently selected on a LayoutCanvas. Pass it the
// object returned by useLayoutCanvas and it wires itself up.

const NUMERIC_FIELDS = [
	{ key: "x", label: "X" },
	{ key: "y", label: "Y" },
	{ key: "width", label: "W" },
	{ key: "height", label: "H" },
];

const ALIGN_BUTTONS = [
	{ mode: "left", label: "Left", title: "Align left edges" },
	{ mode: "hcenter", label: "Center", title: "Align horizontal centers" },
	{ mode: "right", label: "Right", title: "Align right edges" },
	{ mode: "top", label: "Top", title: "Align top edges" },
	{ mode: "vmiddle", label: "Middle", title: "Align vertical centers" },
	{ mode: "bottom", label: "Bottom", title: "Align bottom edges" },
];

// A number input that reports every valid keystroke upward (so the card moves
// as you type) without fighting you mid-edit: while focused it keeps whatever
// you've typed, including transient states like "" or "-", and only re-syncs
// from the canvas once you leave.
function NumberField({ label, value, onChange, onEditStart, onEditEnd }) {
	const [text, setText] = useState("");
	const focusedRef = useRef(false);

	useEffect(() => {
		if (!focusedRef.current) {
			setText(String(Math.round(value)));
		}
	}, [value]);

	const handleChange = (event) => {
		const next = event.target.value;
		setText(next);
		const parsed = Number(next);
		if (next.trim() !== "" && Number.isFinite(parsed)) {
			onChange(parsed);
		}
	};

	return (
		<label className="cs-precision-field">
			<span className="cs-precision-field-label">{label}</span>
			<input
				type="number"
				className="cs-precision-input"
				value={text}
				onChange={handleChange}
				onFocus={() => {
					focusedRef.current = true;
					onEditStart();
				}}
				onBlur={() => {
					focusedRef.current = false;
					onEditEnd();
					setText(String(Math.round(value)));
				}}
			/>
		</label>
	);
}

export default function PrecisionPanel({ canvas, label = "Selection" }) {
	const {
		rects,
		selection,
		updateRect,
		align,
		distribute,
		aspectLocked,
		setAspectLocked,
		snapToGrid,
		setSnapToGrid,
		snapToObjects,
		setSnapToObjects,
		gridSize,
	} = canvas;

	// One undo step per focus-to-blur editing session rather than per keystroke
	// (see updateRect's recordHistory option).
	const historyPushedRef = useRef(false);
	const selectedId = selection.length === 1 ? selection[0] : null;
	const rect = selectedId ? rects[selectedId] : null;

	const commit = (patch) => {
		updateRect(selectedId, patch, { recordHistory: !historyPushedRef.current });
		historyPushedRef.current = true;
	};

	const resetEditSession = () => {
		historyPushedRef.current = false;
	};

	return (
		<div className="cs-precision-panel">
			<div className="cs-precision-row">
				<span className="cs-precision-title">
					{selection.length === 0
						? `No ${label} selected`
						: selection.length === 1
						? label
						: `${selection.length} selected`}
				</span>
			</div>

			{rect ? (
				<div className="cs-precision-row">
					{NUMERIC_FIELDS.map((field) => (
						<NumberField
							key={field.key}
							label={field.label}
							value={rect[field.key]}
							onChange={(value) => commit({ [field.key]: value })}
							onEditStart={resetEditSession}
							onEditEnd={resetEditSession}
						/>
					))}
					<button
						type="button"
						className={`cs-precision-toggle${aspectLocked ? " cs-precision-toggle--on" : ""}`}
						aria-pressed={aspectLocked}
						title="Lock aspect ratio — ties Width and Height together (Shift does the same while dragging a corner)"
						onClick={() => setAspectLocked((current) => !current)}
					>
						{aspectLocked ? "🔒" : "🔓"} Ratio
					</button>
				</div>
			) : null}

			{selection.length > 1 ? (
				<div className="cs-precision-row">
					<span className="cs-precision-field-label">Align</span>
					{ALIGN_BUTTONS.map((button) => (
						<button
							key={button.mode}
							type="button"
							className="cs-precision-btn"
							title={button.title}
							onClick={() => align(button.mode)}
						>
							{button.label}
						</button>
					))}
				</div>
			) : null}

			{selection.length > 2 ? (
				<div className="cs-precision-row">
					<span className="cs-precision-field-label">Distribute</span>
					<button
						type="button"
						className="cs-precision-btn"
						title="Even horizontal gaps"
						onClick={() => distribute("horizontal")}
					>
						Horizontally
					</button>
					<button
						type="button"
						className="cs-precision-btn"
						title="Even vertical gaps"
						onClick={() => distribute("vertical")}
					>
						Vertically
					</button>
				</div>
			) : null}

			<div className="cs-precision-row">
				<button
					type="button"
					className={`cs-precision-toggle${snapToGrid ? " cs-precision-toggle--on" : ""}`}
					aria-pressed={snapToGrid}
					title={`Snap to the ${gridSize}px grid`}
					onClick={() => setSnapToGrid((current) => !current)}
				>
					Snap to Grid
				</button>
				<button
					type="button"
					className={`cs-precision-toggle${snapToObjects ? " cs-precision-toggle--on" : ""}`}
					aria-pressed={snapToObjects}
					title="Snap to other items' edges and centers, with alignment guides"
					onClick={() => setSnapToObjects((current) => !current)}
				>
					Smart Guides
				</button>
			</div>
		</div>
	);
}
