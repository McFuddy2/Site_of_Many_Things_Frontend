import { useEffect, useLayoutEffect, useRef, useState } from "react";

// Exact X / Y / W / H, in grid units, for one card or module. Each field
// applies on Enter or when it loses focus (one undo step per applied edit);
// out-of-range values are clamped by whoever applies them (minimum sizes,
// card width), and the fields then show what actually landed. Esc closes.

const FIELDS = [
	{ key: "x", label: "X" },
	{ key: "y", label: "Y" },
	{ key: "w", label: "W" },
	{ key: "h", label: "H" },
];

const VIEWPORT_MARGIN = 8;

export default function PositionSizePopover({ title, rect, anchor, onApply, onClose }) {
	const [draft, setDraft] = useState(() => Object.fromEntries(FIELDS.map(({ key }) => [key, String(rect[key])])));
	const ref = useRef(null);
	const [position, setPosition] = useState({ left: anchor.x, top: anchor.y });

	// Re-sync when the rect changes underneath (an applied edit, undo…).
	useEffect(() => {
		setDraft(Object.fromEntries(FIELDS.map(({ key }) => [key, String(rect[key])])));
	}, [rect.x, rect.y, rect.w, rect.h]);

	useLayoutEffect(() => {
		const box = ref.current?.getBoundingClientRect();
		if (!box) {
			return;
		}
		setPosition({
			left: Math.max(VIEWPORT_MARGIN, Math.min(anchor.x, window.innerWidth - box.width - VIEWPORT_MARGIN)),
			top: Math.max(VIEWPORT_MARGIN, Math.min(anchor.y, window.innerHeight - box.height - VIEWPORT_MARGIN)),
		});
	}, [anchor.x, anchor.y]);

	useEffect(() => {
		ref.current?.querySelector("input")?.select();
		const onPointerDown = (event) => {
			if (!ref.current?.contains(event.target)) {
				onClose();
			}
		};
		document.addEventListener("pointerdown", onPointerDown, true);
		return () => document.removeEventListener("pointerdown", onPointerDown, true);
	}, [onClose]);

	const apply = (key) => {
		const value = Math.round(Number(draft[key]));
		if (!Number.isFinite(value) || value === rect[key]) {
			setDraft((current) => ({ ...current, [key]: String(rect[key]) }));
			return;
		}
		onApply({ ...rect, [key]: value });
		// Show the current value again until the applied rect arrives; if the
		// edit was clamped back to exactly what's there, nothing new arrives and
		// this is already what landed.
		setDraft((current) => ({ ...current, [key]: String(rect[key]) }));
	};

	return (
		<div
			ref={ref}
			className="cs-popover cs-position-popover"
			role="dialog"
			aria-label={`Position and size of ${title}`}
			style={{ left: position.left, top: position.top }}
			onKeyDown={(event) => {
				if (event.key === "Escape") {
					event.preventDefault();
					onClose();
				}
			}}
		>
			<div className="cs-popover-title">Position &amp; Size</div>
			<div className="cs-position-fields">
				{FIELDS.map(({ key, label }) => (
					<label key={key} className="cs-position-field">
						<span>{label}</span>
						<input
							type="number"
							inputMode="numeric"
							step="1"
							min={key === "w" || key === "h" ? 1 : 0}
							value={draft[key]}
							onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))}
							onBlur={() => apply(key)}
							onKeyDown={(event) => {
								if (event.key === "Enter") {
									event.preventDefault();
									apply(key);
								}
							}}
						/>
					</label>
				))}
			</div>
			<p className="cs-popover-hint">In grid cells. Too small? It stops at the smallest size that fits.</p>
		</div>
	);
}
