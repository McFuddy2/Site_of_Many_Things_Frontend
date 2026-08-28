// Surfaces UpgradePromptModal when a request finds the session has expired
// server-side, so the user isn't silently dropped to Guest with no explanation.
// Rendered once near the app root; auth/session.js's expireSession() is the
// only thing that triggers it, so a deliberate sign-out never shows this.

import { useEffect, useState } from "react";
import { onSessionExpired } from "../../auth/session";
import UpgradePromptModal from "./UpgradePromptModal";

export default function SessionExpiredNotice() {
	const [isOpen, setIsOpen] = useState(false);

	useEffect(() => onSessionExpired(() => setIsOpen(true)), []);

	return (
		<UpgradePromptModal
			isOpen={isOpen}
			onClose={() => setIsOpen(false)}
			title="You've been logged out"
			message="Your session expired, so you've been signed out. Log in or create an account to pick up where you left off."
			dismissLabel="Dismiss"
		/>
	);
}
