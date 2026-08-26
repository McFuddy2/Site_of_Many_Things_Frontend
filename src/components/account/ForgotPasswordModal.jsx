// Request a password reset link.
//
// The confirmation is shown unconditionally, matching the server's always-202
// response — saying "no such account" here would leak which emails are registered.

import { useEffect, useState } from "react";
import Modal from "../ui/Modal";
import { forgotPassword } from "../../API/auth";
import { getUserMessage } from "../../API/errors";
import { isEmailFormatValid } from "../../auth/validation";

export default function ForgotPasswordModal({ isOpen, onClose, onBackToLogin }) {
	const [email, setEmail] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isSent, setIsSent] = useState(false);
	const [formError, setFormError] = useState(null);

	useEffect(() => {
		if (isOpen) {
			setEmail("");
			setIsSubmitting(false);
			setIsSent(false);
			setFormError(null);
		}
	}, [isOpen]);

	const handleSubmit = async (event) => {
		event.preventDefault();
		if (!isEmailFormatValid(email) || isSubmitting) return;

		setIsSubmitting(true);
		setFormError(null);
		try {
			await forgotPassword(email.trim());
			setIsSent(true);
		} catch (error) {
			// Only a transport or rate-limit failure reaches here; the endpoint
			// itself always succeeds.
			setFormError(getUserMessage(error));
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Modal isOpen={isOpen} onClose={onClose} title="Reset your password" size="small">
			{formError ? <p className="som-form-error">{formError}</p> : null}

			{isSent ? (
				<>
					<p>
						If an account exists for <strong>{email}</strong>, we&apos;ve sent it a link to reset the
						password. The link is good for one hour.
					</p>
					<button type="button" className="som-btn som-btn-secondary" onClick={onBackToLogin}>
						Back to log in
					</button>
				</>
			) : (
				<form onSubmit={handleSubmit}>
					<p style={{ fontSize: "0.9rem" }}>
						Enter your email address and we&apos;ll send you a link to set a new password.
					</p>

					<div className="som-field">
						<label className="som-field-label" htmlFor="forgot-email">
							Email
						</label>
						<input
							id="forgot-email"
							className="som-field-input"
							type="email"
							value={email}
							autoComplete="email"
							autoFocus
							onChange={(event) => setEmail(event.target.value)}
						/>
					</div>

					<button
						type="submit"
						className="som-btn som-btn-primary"
						style={{ width: "100%" }}
						disabled={!isEmailFormatValid(email) || isSubmitting}
					>
						{isSubmitting ? "Sending…" : "Send reset link"}
					</button>
				</form>
			)}
		</Modal>
	);
}
