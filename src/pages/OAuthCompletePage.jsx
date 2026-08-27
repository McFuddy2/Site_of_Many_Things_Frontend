// Where the backend drops the user after a successful Google sign-in
// (/oauth-complete).
//
// There is no token in the URL — by the time we get here the backend has already
// set the httpOnly refresh cookie, so the session is established by asking
// GET /users/me. A request with no access token in memory answers 401, which the
// fetch wrapper turns into a refresh-and-retry against that cookie, so one call
// is enough.
//
// Migrating anything still held in this browser is not this page's job:
// AccountDataSync reacts to the session becoming backend-backed, however it got
// there.

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../18ProfilePage.css";
import { setMetaDescription } from "../utils/seo";
import { useAuth } from "../auth/AuthContext";
import { getUserMessage } from "../API/errors";

export default function OAuthCompletePage() {
	const navigate = useNavigate();
	const { user, isBootstrapping, refreshUser } = useAuth();

	const [status, setStatus] = useState("loading");
	const [errorMessage, setErrorMessage] = useState(null);
	// The provider bootstrap and this page both ask for the user; this keeps the
	// page from firing a second time under StrictMode's double effect.
	const hasFinishedRef = useRef(false);

	useEffect(() => {
		document.title = "Signing you in | Site of Many Things";
		setMetaDescription("Finishing your Google sign-in.");
	}, []);

	useEffect(() => {
		// AuthProvider's own bootstrap is already doing refresh + /users/me on
		// mount. Waiting for it avoids racing it with a duplicate request.
		if (isBootstrapping || hasFinishedRef.current) return;

		if (user) {
			hasFinishedRef.current = true;
			navigate("/profile", { replace: true });
			return;
		}

		hasFinishedRef.current = true;
		(async () => {
			try {
				await refreshUser();
				navigate("/profile", { replace: true });
			} catch (error) {
				console.error("Could not finish the Google sign-in:", error);
				setErrorMessage(getUserMessage(error));
				setStatus("error");
			}
		})();
	}, [isBootstrapping, user, refreshUser, navigate]);

	return (
		<main className="profile-page-wrapper">
			<div className="profile-page-content">
				{status === "loading" ? (
					<>
						<h1 className="profile-heading">Signing you in…</h1>
						<p>One moment while we finish setting up your session.</p>
					</>
				) : (
					<>
						<h1 className="profile-heading">We couldn&apos;t finish signing you in</h1>
						<p>{errorMessage}</p>
						<p>Your account is fine — only this sign-in attempt didn&apos;t complete.</p>
						<div className="profile-actions">
							<button
								type="button"
								className="som-btn som-btn-primary"
								onClick={() => navigate("/profile", { state: { openLogin: true } })}
							>
								Try signing in again
							</button>
						</div>
					</>
				)}
			</div>
		</main>
	);
}
