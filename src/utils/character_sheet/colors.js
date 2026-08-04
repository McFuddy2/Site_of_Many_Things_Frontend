// Picks readable text (near-navy or white) for an arbitrary user-chosen
// background hex, so a custom page-tab or card-header color never goes
// illegible against its own text.
export function getContrastTextColor(hex) {
	if (!hex) {
		return null;
	}
	const clean = hex.replace("#", "");
	const full = clean.length === 3 ? clean.split("").map((char) => char + char).join("") : clean;
	if (full.length !== 6 || /[^0-9a-fA-F]/.test(full)) {
		return null;
	}
	const [r, g, b] = [full.slice(0, 2), full.slice(2, 4), full.slice(4, 6)].map((part) => parseInt(part, 16));
	// Relative luminance, WCAG formula.
	const [rl, gl, bl] = [r, g, b].map((channel) => {
		const c = channel / 255;
		return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
	});
	const luminance = 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
	return luminance > 0.5 ? "#16263f" : "#ffffff";
}
