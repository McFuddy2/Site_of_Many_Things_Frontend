// Small attention dot used for the over-limit breadcrumb.
//
// Purely decorative to screen readers on its own, so the label is what carries
// the meaning. The element it sits on needs `position: relative`.

import "./NotificationBadge.css";

export default function NotificationBadge({ label = "Needs your attention" }) {
	return <span className="som-notification-badge" role="status" aria-label={label} title={label} />;
}
