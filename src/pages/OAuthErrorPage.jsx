// Where the backend drops the user when a Google sign-in fails
// (/oauth-error?reason=<code>).
//
// `reason` is one of the agreed error codes, so the copy comes from the same
// USER_MESSAGES table as every other error rather than being written twice. An
// unrecognised reason falls through to the generic message — a code we haven't
// seen must never put a raw string in front of the user.

import { useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import "../18ProfilePage.css";
import { setMetaDescription } from "../utils/seo";
import { ERROR_CODES, getMessageForCode } from "../API/errors";

export default function OAuthErrorPage() {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();

	const reason = searchParams.get("reason");

	useEffect(() => {
		document.title = "Sign-in problem | Site of Many Things";
		setMetaDescription("Something went wrong finishing your Google sign-in.");
	}, []);

	// An email that already has an account is the one case where retrying the
	// sign-up is the wrong advice — that user wants to log in.
	const shouldOfferLogin = reason === ERROR_CODES.EMAIL_TAKEN;

	return (
		<main className="profile-page-wrapper">
			<div className="profile-page-content">
				<h1 className="profile-heading">We couldn&apos;t sign you in with Google</h1>
				<p>{getMessageForCode(reason)}</p>
				<p>
					Nothing has been saved or changed, and anything stored in this browser is still exactly where it
					was.
				</p>
				<div className="profile-actions">
					<button
						type="button"
						className="som-btn som-btn-primary"
						onClick={() =>
							navigate("/profile", {
								state: shouldOfferLogin ? { openLogin: true } : { openSignup: true },
							})
						}
					>
						{shouldOfferLogin ? "Log in instead" : "Try again"}
					</button>
					<Link to="/" className="som-btn som-btn-secondary">
						Back to the site
					</Link>
				</div>
			</div>
		</main>
	);
}
