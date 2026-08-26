// Sign-up flow.
//
// Username comes first so the email and Google paths share one entry point and
// neither can create an account without a username. Three steps live inside one
// modal: username -> credentials -> check your email.

import { useEffect, useState } from "react";
import Modal from "../ui/Modal";
import { useAuth } from "../../auth/AuthContext";
import { useUsernameAvailability } from "../../auth/useUsernameAvailability";
import { checkPasswordRules, isEmailFormatValid, isPasswordValid } from "../../auth/validation";
import { resendVerification, startGoogleAuthorize } from "../../API/auth";
import { ERROR_CODES, getUserMessage } from "../../API/errors";

const DEFAULT_RESEND_COOLDOWN_SECONDS = 60;

function PasswordRules({ password }) {
	const rules = checkPasswordRules(password);
	return (
		<ul className="som-password-rules">
			{rules.map((rule) => (
				<li key={rule.id} className={`som-password-rule${rule.passed ? " som-password-rule-passed" : ""}`}>
					<span aria-hidden="true">{rule.passed ? "✓" : "○"}</span>
					{rule.label}
				</li>
			))}
		</ul>
	);
}

export default function SignUpModal({ isOpen, onClose, onSwitchToLogin }) {
	const { signUp } = useAuth();

	const [step, setStep] = useState("username");
	const [username, setUsername] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [formError, setFormError] = useState(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const [resendCooldown, setResendCooldown] = useState(0);
	const [resendNotice, setResendNotice] = useState(null);

	const availability = useUsernameAvailability(username);

	// Reset everything when the modal is reopened, so a previous attempt doesn't
	// leak into a new one.
	useEffect(() => {
		if (isOpen) {
			setStep("username");
			setUsername("");
			setEmail("");
			setPassword("");
			setFormError(null);
			setIsSubmitting(false);
			setResendCooldown(0);
			setResendNotice(null);
		}
	}, [isOpen]);

	useEffect(() => {
		if (resendCooldown <= 0) return undefined;
		const timeoutId = setTimeout(() => setResendCooldown((seconds) => seconds - 1), 1000);
		return () => clearTimeout(timeoutId);
	}, [resendCooldown]);

	const canContinueFromUsername = availability.isAvailable && !availability.isChecking;
	const canSubmitCredentials = isEmailFormatValid(email) && isPasswordValid(password) && !isSubmitting;

	const handleCreateAccount = async (event) => {
		event.preventDefault();
		if (!canSubmitCredentials) return;

		setIsSubmitting(true);
		setFormError(null);
		try {
			await signUp({ username: username.trim(), email: email.trim(), password });
			setStep("check-email");
			// The account was just created, so a resend right away would be
			// pointless and would burn the rate limit.
			setResendCooldown(DEFAULT_RESEND_COOLDOWN_SECONDS);
		} catch (error) {
			setFormError(getUserMessage(error));
			// A username taken between the availability check and submit sends the
			// user back to pick another one.
			if (error?.code === ERROR_CODES.USERNAME_TAKEN) {
				setStep("username");
			}
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleResend = async () => {
		setResendNotice(null);
		try {
			await resendVerification(email.trim());
			setResendCooldown(DEFAULT_RESEND_COOLDOWN_SECONDS);
			setResendNotice("Verification email sent. Check your inbox.");
		} catch (error) {
			if (error?.code === ERROR_CODES.RATE_LIMITED) {
				// A countdown, not an error — the user did nothing wrong.
				setResendCooldown(error.retryAfter || DEFAULT_RESEND_COOLDOWN_SECONDS);
				return;
			}
			setResendNotice(getUserMessage(error));
		}
	};

	const titles = {
		username: "Choose your username",
		credentials: "Create your account",
		"check-email": "Check your email",
	};

	return (
		<Modal isOpen={isOpen} onClose={onClose} title={titles[step]} size="small">
			{formError ? <p className="som-form-error">{formError}</p> : null}

			{step === "username" ? (
				<>
					<div className="som-field">
						<label className="som-field-label" htmlFor="signup-username">
							Username
						</label>
						<input
							id="signup-username"
							className="som-field-input"
							type="text"
							value={username}
							autoComplete="username"
							autoFocus
							maxLength={20}
							onChange={(event) => setUsername(event.target.value)}
						/>
						<span
							className={`som-field-hint${
								availability.status === "available"
									? " som-field-hint-success"
									: availability.status === "checking"
										? " som-field-hint-checking"
										: availability.status === "idle"
											? ""
											: " som-field-hint-error"
							}`}
						>
							{availability.message}
						</span>
					</div>

					<button
						type="button"
						className="som-btn som-btn-primary"
						style={{ width: "100%" }}
						disabled={!canContinueFromUsername}
						onClick={() => setStep("credentials")}
					>
						Continue
					</button>

					<div className="som-form-divider">or</div>

					<button
						type="button"
						className="som-btn som-btn-google"
						style={{ width: "100%" }}
						disabled={!canContinueFromUsername}
						onClick={() => startGoogleAuthorize(username.trim())}
					>
						Sign up with Google
					</button>

					<p style={{ marginTop: "1rem", fontSize: "0.9rem" }}>
						Already have an account?{" "}
						<button type="button" className="som-btn-link" onClick={onSwitchToLogin}>
							Log in
						</button>
					</p>
				</>
			) : null}

			{step === "credentials" ? (
				<form onSubmit={handleCreateAccount}>
					<p style={{ fontSize: "0.9rem" }}>
						Signing up as <strong>{username}</strong>.{" "}
						<button type="button" className="som-btn-link" onClick={() => setStep("username")}>
							Change
						</button>
					</p>

					<div className="som-field">
						<label className="som-field-label" htmlFor="signup-email">
							Email
						</label>
						<input
							id="signup-email"
							className="som-field-input"
							type="email"
							value={email}
							autoComplete="email"
							autoFocus
							onChange={(event) => setEmail(event.target.value)}
						/>
					</div>

					<div className="som-field">
						<label className="som-field-label" htmlFor="signup-password">
							Password
						</label>
						<input
							id="signup-password"
							className="som-field-input"
							type="password"
							value={password}
							autoComplete="new-password"
							onChange={(event) => setPassword(event.target.value)}
						/>
						<PasswordRules password={password} />
					</div>

					<button
						type="submit"
						className="som-btn som-btn-primary"
						style={{ width: "100%" }}
						disabled={!canSubmitCredentials}
					>
						{isSubmitting ? "Creating account…" : "Create account"}
					</button>
				</form>
			) : null}

			{step === "check-email" ? (
				<>
					<p>
						We&apos;ve sent a verification link to <strong>{email}</strong>. Click it to finish setting up
						your Trailblazer profile.
					</p>
					<p style={{ fontSize: "0.9rem" }}>
						Your Trailblazer perks unlock once your email is verified. Until then your profile works
						exactly like a Guest profile.
					</p>

					<button
						type="button"
						className="som-btn som-btn-secondary"
						disabled={resendCooldown > 0}
						onClick={handleResend}
					>
						{resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend verification email"}
					</button>

					{resendNotice ? <p className="profile-status-message">{resendNotice}</p> : null}
				</>
			) : null}
		</Modal>
	);
}
