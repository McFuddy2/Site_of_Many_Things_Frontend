// Small inline icons for the Character Sheet's controls. Purely decorative
// (aria-hidden): every button that uses one carries its own aria-label and
// tooltip.

function Icon({ children, size = 18 }) {
	return (
		<svg
			viewBox="0 0 24 24"
			width={size}
			height={size}
			aria-hidden="true"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			{children}
		</svg>
	);
}

export function KebabIcon({ size = 16 }) {
	return (
		<svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
			<circle cx="12" cy="5.5" r="1.7" fill="currentColor" />
			<circle cx="12" cy="12" r="1.7" fill="currentColor" />
			<circle cx="12" cy="18.5" r="1.7" fill="currentColor" />
		</svg>
	);
}

export function UndoIcon() {
	return (
		<Icon>
			<path d="M9 14 4 9l5-5" />
			<path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
		</Icon>
	);
}

export function RedoIcon() {
	return (
		<Icon>
			<path d="m15 14 5-5-5-5" />
			<path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />
		</Icon>
	);
}

// Mirrored so the drip hangs off the left side, matching the paint cursor.
export function BucketIcon() {
	return (
		<Icon>
			<g transform="translate(24 0) scale(-1 1)">
				<path d="m19 11-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2a2 2 0 0 0 2.8 0L19 11Z" />
				<path d="m5 2 5 5" />
				<path d="M2 13h15" />
				<path d="M22 20a2 2 0 1 1-4 0c0-1.6 1.7-2.4 2-4 .3 1.6 2 2.4 2 4Z" />
			</g>
		</Icon>
	);
}

export function PositionIcon() {
	return (
		<Icon>
			<rect x="5" y="5" width="14" height="14" rx="1" />
			<path d="M2 9h3M2 15h3M19 9h3M19 15h3M9 2v3M15 2v3M9 19v3M15 19v3" />
		</Icon>
	);
}

export function TrashIcon() {
	return (
		<Icon>
			<path d="M3 6h18" />
			<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
			<path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
			<path d="M10 11v6M14 11v6" />
		</Icon>
	);
}

export function InfoIcon() {
	return (
		<Icon size={18}>
			<circle cx="12" cy="12" r="10" />
			<path d="M12 16v-4M12 8h.01" />
		</Icon>
	);
}

export function PlusIcon() {
	return (
		<Icon size={16}>
			<path d="M12 5v14M5 12h14" />
		</Icon>
	);
}

export function SearchIcon() {
	return (
		<Icon size={16}>
			<circle cx="11" cy="11" r="7" />
			<path d="m20 20-3.5-3.5" />
		</Icon>
	);
}

// The paint-mode cursor: the bucket, drawn navy on white so it reads on any
// card colour, mirrored so the drip hangs off the left. The hotspot is the
// drip (bottom left) — that's the point that paints.
export const BUCKET_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(
	'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white" stroke="#16263f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><g transform="translate(24 0) scale(-1 1)"><path d="m19 11-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2a2 2 0 0 0 2.8 0L19 11Z"/><path d="m5 2 5 5"/><path d="M2 13h15"/><path d="M22 20a2 2 0 1 1-4 0c0-1.6 1.7-2.4 2-4 .3 1.6 2 2.4 2 4Z"/></g></svg>'
)}") 4 22, crosshair`;

// The link glyph on a chip — marks a value that comes from somewhere else.
export const LINK_ICON_PATHS = [
	"M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07L11.5 4.5",
	"M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 0 0 7.07 7.07L12.5 19.5",
];

export function LinkIcon({ size = 12 }) {
	return (
		<Icon size={size}>
			{LINK_ICON_PATHS.map((d) => (
				<path key={d} d={d} />
			))}
		</Icon>
	);
}
