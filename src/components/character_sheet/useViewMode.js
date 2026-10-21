import { useEffect, useState } from "react";

// Which way the sheet is shown:
//   desktop  wide (≥ 1024px) with a fine pointer — everything, including layout editing
//   tablet   anything else that isn't phone-narrow — the desktop layout, scaled to fit, view and play only
//   phone    narrow (< 640px) — one column of cards, modules reflowed, view and play only
// "View and play" means every value works (typing, checkboxes, +/−, Damage/Heal)
// but nothing that rearranges or restyles the sheet is offered.

const DESKTOP_QUERY = "(min-width: 1024px) and (pointer: fine)";
const PHONE_QUERY = "(max-width: 639px)";

function currentMode() {
	if (typeof window === "undefined" || !window.matchMedia) {
		return "desktop";
	}
	if (window.matchMedia(DESKTOP_QUERY).matches) {
		return "desktop";
	}
	return window.matchMedia(PHONE_QUERY).matches ? "phone" : "tablet";
}

export default function useViewMode() {
	const [mode, setMode] = useState(currentMode);
	useEffect(() => {
		const queries = [DESKTOP_QUERY, PHONE_QUERY].map((query) => window.matchMedia(query));
		const update = () => setMode(currentMode());
		queries.forEach((query) => query.addEventListener("change", update));
		update();
		return () => queries.forEach((query) => query.removeEventListener("change", update));
	}, []);
	return mode;
}
