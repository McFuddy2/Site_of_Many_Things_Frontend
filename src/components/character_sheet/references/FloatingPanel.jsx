import { useLayoutEffect, useRef, useState } from "react";

// A non-modal panel anchored under (or above) a spot on the sheet — the
// reference editor's frame, shared by the dropdown-options and rules
// editors. Non-modal on purpose: the sheet behind it has to stay clickable
// for Pick mode. Esc closes it.

const VIEWPORT_MARGIN = 8;
const GAP = 6;

export default function FloatingPanel({ anchor, label, className = "", onClose, children }) {
	const ref = useRef(null);
	const [position, setPosition] = useState({ left: anchor.left, top: anchor.bottom + GAP });

	useLayoutEffect(() => {
		const box = ref.current?.getBoundingClientRect();
		if (!box) {
			return;
		}
		const below = anchor.bottom + GAP;
		const top = below + box.height <= window.innerHeight - VIEWPORT_MARGIN ? below : anchor.top - box.height - GAP;
		const left = Math.max(VIEWPORT_MARGIN, Math.min(anchor.left, window.innerWidth - box.width - VIEWPORT_MARGIN));
		const clampedTop = Math.max(VIEWPORT_MARGIN, Math.min(top, window.innerHeight - box.height - VIEWPORT_MARGIN));
		// Re-measured after every render (rows come and go), but only moved
		// when the spot actually changes.
		setPosition((current) => (current.left === left && current.top === clampedTop ? current : { left, top: clampedTop }));
	});

	return (
		<div
			ref={ref}
			className={`cs-popover cs-ref-panel ${className}`}
			role="dialog"
			aria-label={label}
			data-ref-ui
			style={{ left: position.left, top: position.top }}
			onKeyDown={(event) => {
				if (event.key === "Escape") {
					event.preventDefault();
					event.stopPropagation();
					onClose();
				}
			}}
		>
			{children}
		</div>
	);
}

// The anchor box for a panel opened from an element (or the middle of the
// screen when there's none).
export function anchorOf(element) {
	const box = element?.getBoundingClientRect();
	return box
		? { left: box.left, top: box.top, bottom: box.bottom }
		: { left: window.innerWidth / 2 - 200, top: 120, bottom: 120 };
}
