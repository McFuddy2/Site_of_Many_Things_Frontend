// Colour helpers for user-chosen colours (page tabs, card headers, modules).

function parseHex(hex) {
	if (!hex) {
		return null;
	}
	const clean = hex.replace("#", "");
	const full = clean.length === 3 ? clean.split("").map((char) => char + char).join("") : clean;
	if (full.length !== 6 || /[^0-9a-fA-F]/.test(full)) {
		return null;
	}
	return [full.slice(0, 2), full.slice(2, 4), full.slice(4, 6)].map((part) => parseInt(part, 16));
}

function toHex(rgb) {
	return `#${rgb.map((channel) => Math.round(Math.min(255, Math.max(0, channel))).toString(16).padStart(2, "0")).join("")}`;
}

// Linear blend of two colours: t = 0 is `a`, t = 1 is `b`.
export function mixHex(a, b, t) {
	const from = parseHex(a);
	const to = parseHex(b);
	if (!from || !to) {
		return a;
	}
	return toHex(from.map((channel, i) => channel + (to[i] - channel) * t));
}

// Picks readable text (near-navy or white) for an arbitrary user-chosen
// background hex, so a custom page-tab or card-header color never goes
// illegible against its own text.
export function getContrastTextColor(hex) {
	const rgb = parseHex(hex);
	if (!rgb) {
		return null;
	}
	// Relative luminance, WCAG formula.
	const [rl, gl, bl] = rgb.map((channel) => {
		const c = channel / 255;
		return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
	});
	const luminance = 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
	return luminance > 0.5 ? "#16263f" : "#ffffff";
}

// A module's whole colour scheme from one chosen base colour, so any pick
// reads as coherently as the built-in palettes: the label bar is the colour
// itself, the body a pale tint of it, the border a deeper shade, and both
// text colours are picked for contrast.
export function deriveModuleShades(base) {
	if (!parseHex(base)) {
		return null;
	}
	const bg = mixHex(base, "#ffffff", 0.78);
	return {
		bar: base,
		barText: getContrastTextColor(base),
		bg,
		border: mixHex(base, "#000000", 0.18),
		text: getContrastTextColor(bg),
	};
}
