// Set a new password — the target of the link in the reset email
// (/reset-password?token=…).
//
// Changing a password invalidates existing sessions server-side, so the user is
// sent to log in again afterwards rather than being silently signed in here.

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "../18ProfilePage.css";
import { setMetaDescription } from "../utils/seo";
import { resetPassword } from "../API/auth";
import { getUserMessage } from "../API/errors";
import { checkPasswordRules, isPasswordValid } from "../auth/validation";
import LoginModal from "../components/account/LoginModal";

export default function ResetPasswordPage() {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();

	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [formError, setFormError] = useState(null);
	const [isDone, setIsDone] = useState(false);
	const [isLoginOpen, setIsLoginOpen] = useState(false);

	const token = searchParams.get("token");
	const rules = checkPasswordRules(password);
	const passwordsMatch = password.length > 0 && password === confirmPassword;
	const canSubmit = isPasswordValid(password) && passwordsMatch && !isSubmitting && Boolean(token);

	useEffect(() => {
		document.title = "Reset your password | Site of Many Things";
		setMetaDescription("Choose a new password for your Site of Many Things account.");
	}, []);

	const handleSubmit = async (event) => {
		event.preventDefault();
		if (!canSubmit) return;

		setIsSubmitting(true);
		setFormError(null);
		try {
			await resetPassword({ token, password });
			setIsDone(true);
		} catch (error) {
			setFormError(getUserMessage(error));
		} finally {
			setIsSubmitting(false);
		}
	};

	if (!token) {
		return (
			<main className="profile-page-wrapper">
				<div className="profile-page-content">
					<h1 className="profile-heading">That reset link isn&apos;t valid</h1>
					<p>
						The link is missing its token. Reset links expire after an hour and can only be used once —
						request a new one from the log in screen.
					</p>
					<div className="profile-actions">
						<button type="button" className="som-btn som-btn-primary" onClick={() => navigate("/profile")}>
							Go to my profile
						</button>
					</div>
				</div>
			</main>
		);
	}

	return (
		<main className="profile-page-wrapper">
			<div className="profile-page-content">
				{isDone ? (
					<>
						<h1 className="profile-heading">Password updated</h1>
						<p>
							Your password has been changed and you&apos;ve been signed out everywhere else. Log in with
							your new password to continue.
						</p>
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
				) : (
					<>
						<h1 className="profile-heading">Choose a new password</h1>

						{formError ? <p className="som-form-error">{formError}</p> : null}

						<form onSubmit={handleSubmit} style={{ maxWidth: "26rem" }}>
							<div className="som-field">
								<label className="som-field-label" htmlFor="reset-password">
									New password
								</label>
								<input
									id="reset-password"
									className="som-field-input"
									type="password"
									value={password}
									autoComplete="new-password"
									autoFocus
									onChange={(event) => setPassword(event.target.value)}
								/>
								<ul className="som-password-rules">
									{rules.map((rule) => (
										<li
											key={rule.id}
											className={`som-password-rule${rule.passed ? " som-password-rule-passed" : ""}`}
										>
											<span aria-hidden="true">{rule.passed ? "✓" : "○"}</span>
											{rule.label}
										</li>
									))}
								</ul>
							</div>

							<div className="som-field">
								<label className="som-field-label" htmlFor="reset-password-confirm">
									Confirm new password
								</label>
								<input
									id="reset-password-confirm"
									className="som-field-input"
									type="password"
									value={confirmPassword}
									autoComplete="new-password"
									onChange={(event) => setConfirmPassword(event.target.value)}
								/>
								<span
									className={`som-field-hint${
										confirmPassword.length === 0
											? ""
											: passwordsMatch
												? " som-field-hint-success"
												: " som-field-hint-error"
									}`}
								>
									{confirmPassword.length === 0 ? "" : passwordsMatch ? "Passwords match" : "Passwords don't match"}
								</span>
							</div>

							<button type="submit" className="som-btn som-btn-primary" disabled={!canSubmit}>
								{isSubmitting ? "Saving…" : "Set new password"}
							</button>
						</form>
					</>
				)}
			</div>

			<LoginModal
				isOpen={isLoginOpen}
				onClose={() => setIsLoginOpen(false)}
				onSwitchToSignUp={() => navigate("/profile", { state: { openSignup: true } })}
				onForgotPassword={() => setIsLoginOpen(false)}
				onLoggedIn={() => navigate("/profile")}
			/>
		</main>
	);
}
