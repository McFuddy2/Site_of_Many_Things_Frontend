// Email verification landing page — the target of the link in the verification
// email (/verify?token=…).
//
// The contract doesn't say whether POST /auth/verify returns a session, so this
// handles both: if a token comes back the user is logged in from here, otherwise
// they're sent to log in. Migrating this browser's data onto the account is
// handled by AccountDataSync, which reacts to the session becoming
// backend-backed however that happened.

import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import "../18ProfilePage.css";
import { setMetaDescription } from "../utils/seo";
import { verifyEmail } from "../API/auth";
import { getUserMessage } from "../API/errors";
import { useAuth } from "../auth/AuthContext";
import LoginModal from "../components/account/LoginModal";

export default function VerifyPage() {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const { applyVerificationResult } = useAuth();

	const [status, setStatus] = useState("verifying");
	const [errorMessage, setErrorMessage] = useState(null);
	const [isLoginOpen, setIsLoginOpen] = useState(false);
	// Verification tokens are single use, so this must not fire twice — which
	// React's development StrictMode double-effect would otherwise cause.
	const hasVerifiedRef = useRef(false);

	const token = searchParams.get("token");

	useEffect(() => {
		document.title = "Verify your email | Site of Many Things";
		setMetaDescription("Confirm your email address to unlock your Trailblazer profile.");
	}, []);

	useEffect(() => {
		if (hasVerifiedRef.current) return;
		hasVerifiedRef.current = true;

		if (!token) {
			setStatus("error");
			setErrorMessage("That verification link is missing its token. Please use the link from your email.");
			return;
		}

		(async () => {
			try {
				const result = await verifyEmail(token);
				const user = await applyVerificationResult(result);
				// Once the session becomes backend-backed, AccountDataSync picks up
				// any data still held in this browser and migrates it across.
				setStatus(user ? "verified" : "verified-needs-login");
			} catch (error) {
				setStatus("error");
				setErrorMessage(getUserMessage(error));
			}
		})();
	}, [token, applyVerificationResult]);

	return (
		<main className="profile-page-wrapper">
			<div className="profile-page-content">
				{status === "verifying" ? (
					<>
						<h1 className="profile-heading">Verifying your email…</h1>
						<p>One moment while we confirm your address.</p>
					</>
				) : null}

				{status === "verified" ? (
					<>
						<h1 className="profile-heading">You&apos;re a Trailblazer!</h1>
						<p>
							Your email is verified and your Trailblazer perks are unlocked. Your saved work now lives
							on your account, so it survives clearing your browser and follows you to any device.
						</p>
						<div className="profile-actions">
							<button
								type="button"
								className="som-btn som-btn-primary"
								onClick={() => navigate("/profile")}
							>
								Go to my profile
							</button>
							<Link to="/" className="som-btn som-btn-secondary">
								Back to the site
							</Link>
						</div>
					</>
				) : null}

				{status === "verified-needs-login" ? (
					<>
						<h1 className="profile-heading">Email verified!</h1>
						<p>Your address is confirmed. Log in to start using your Trailblazer perks.</p>
						<div className="profile-actions">
							<button
								type="button"
								className="som-btn som-btn-primary"
								onClick={() => setIsLoginOpen(true)}
							>
								Log in
							</button>
						</div>
					</>
				) : null}

				{status === "error" ? (
					<>
						<h1 className="profile-heading">We couldn&apos;t verify that link</h1>
						<p>{errorMessage}</p>
						<p>
							Verification links expire after 24 hours and can only be used once. You can send yourself
							a new one from your profile page.
						</p>
						<div className="profile-actions">
							<button
								type="button"
								className="som-btn som-btn-primary"
								onClick={() => navigate("/profile")}
							>
								Go to my profile
							</button>
						</div>
					</>
				) : null}
			</div>

			<LoginModal
				isOpen={isLoginOpen}
				onClose={() => setIsLoginOpen(false)}
				onSwitchToSignUp={() => navigate("/profile", { state: { openSignup: true } })}
				onForgotPassword={() => navigate("/reset-password")}
				onLoggedIn={() => navigate("/profile")}
			/>
		</main>
	);
}
