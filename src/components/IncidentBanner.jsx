// Temporary notice for the Railway hosting incident (status page linked below).
// Once Railway resolves it: delete this file, IncidentBanner.css, and the two
// lines that import and render <IncidentBanner /> in AppRouter.jsx.

import { useLayoutEffect, useRef, useState } from "react";
import "./IncidentBanner.css";

const MESSAGE =
	"We're experiencing a temporary outage with our hosting provider (Railway) that may cause hiccups on parts of the site. No action needed — should clear up soon. Status details:";
const STATUS_URL = "https://status.railway.com/incident/8GL2R2U5";

export default function IncidentBanner() {
	// Deliberately not persisted: dismissing hides it for this render only, so the
	// notice comes back on refresh while the incident is still running.
	const [isVisible, setIsVisible] = useState(true);
	const bannerRef = useRef(null);

	// Pages size themselves off --header-height, which the rest of the site treats
	// both as "how tall the header is" and as "how far down the page starts". The
	// banner publishes its own height so IncidentBanner.css can fold it into that
	// variable; without it every full-height tool page overflows the viewport.
	useLayoutEffect(() => {
		const banner = bannerRef.current;
		if (!banner) return;

		const root = document.documentElement;
		const syncHeight = () =>
			root.style.setProperty("--incident-banner-height", `${banner.offsetHeight}px`);

		syncHeight();
		root.classList.add("has-incident-banner");

		const observer = new ResizeObserver(syncHeight);
		observer.observe(banner);

		return () => {
			observer.disconnect();
			root.classList.remove("has-incident-banner");
			root.style.removeProperty("--incident-banner-height");
		};
	}, [isVisible]);

	if (!isVisible) return null;

	return (
		<div className="incident-banner" ref={bannerRef} role="status">
			<svg
				className="incident-banner-icon"
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="currentColor"
				aria-hidden="true"
			>
				<path d="M12 2.75 1.75 20.5h20.5L12 2.75Zm0 5.5a1 1 0 0 1 1 1v4.5a1 1 0 1 1-2 0v-4.5a1 1 0 0 1 1-1Zm0 8a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5Z" />
			</svg>
			<p className="incident-banner-text">
				{`${MESSAGE} `}
				<a
					className="incident-banner-link"
					href={STATUS_URL}
					target="_blank"
					rel="noopener noreferrer"
				>
					{STATUS_URL}
				</a>
			</p>
			<button
				className="incident-banner-dismiss"
				type="button"
				aria-label="Dismiss notice"
				onClick={() => setIsVisible(false)}
			>
				&times;
			</button>
		</div>
	);
}
