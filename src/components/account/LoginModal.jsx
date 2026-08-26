// Log in.
//
// Failures show one generic message regardless of whether the email exists —
// the server does the same, and contradicting it here would leak the difference.

import { useEffect, useState } from "react";
import Modal from "../ui/Modal";
import { useAuth } from "../../auth/AuthContext";
import { isEmailFormatValid } from "../../auth/validation";
import { getUserMessage } from "../../API/errors";

export default function LoginModal({ isOpen, onClose, onSwitchToSignUp, onForgotPassword, onLoggedIn }) {
	const { signIn } = useAuth();

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [formError, setFormError] = useState(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	useEffect(() => {
		if (isOpen) {
			setEmail("");
			setPassword("");
			setFormError(null);
			setIsSubmitting(false);
		}
	}, [isOpen]);

	const canSubmit = isEmailFormatValid(email) && password.length > 0 && !isSubmitting;

	const handleSubmit = async (event) => {
		event.preventDefault();
		if (!canSubmit) return;

		setIsSubmitting(true);
		setFormError(null);
		try {
			const user = await signIn({ email: email.trim(), password });
			onLoggedIn?.(user);
			onClose?.();
		} catch (error) {
			setFormError(getUserMessage(error));
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Modal isOpen={isOpen} onClose={onClose} title="Log in" size="small">
			{formError ? <p className="som-form-error">{formError}</p> : null}

			<form onSubmit={handleSubmit}>
				<div className="som-field">
					<label className="som-field-label" htmlFor="login-email">
						Email
					</label>
					<input
						id="login-email"
						className="som-field-input"
						type="email"
						value={email}
						autoComplete="email"
						autoFocus
						onChange={(event) => setEmail(event.target.value)}
					/>
				</div>

				<div className="som-field">
					<label className="som-field-label" htmlFor="login-password">
						Password
					</label>
					<input
						id="login-password"
						className="som-field-input"
						type="password"
						value={password}
						autoComplete="current-password"
						onChange={(event) => setPassword(event.target.value)}
					/>
				</div>

				<button type="submit" className="som-btn som-btn-primary" style={{ width: "100%" }} disabled={!canSubmit}>
					{isSubmitting ? "Logging in…" : "Log in"}
				</button>
			</form>

			<p style={{ marginTop: "1rem", fontSize: "0.9rem" }}>
				<button type="button" className="som-btn-link" onClick={onForgotPassword}>
					Forgot your password?
				</button>
			</p>

			<p style={{ fontSize: "0.9rem" }}>
				Don&apos;t have an account?{" "}
				<button type="button" className="som-btn-link" onClick={onSwitchToSignUp}>
					Sign up
				</button>
			</p>
		</Modal>
	);
}
