// "Switch Account".
//
// Unlike the old behaviour, opening this does not log the current account out.
// Signing in successfully swaps the session over (signIn just overwrites it);
// choosing "Nevermind" or otherwise closing the modal leaves the current
// account signed in.

import { useEffect, useState } from "react";
import Modal from "../ui/Modal";
import { useAuth } from "../../auth/AuthContext";
import { isEmailFormatValid } from "../../auth/validation";
import { getUserMessage } from "../../API/errors";

export default function SwitchAccountModal({ isOpen, onClose, onSwitched }) {
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
			onSwitched?.(user);
			onClose?.();
		} catch (error) {
			setFormError(getUserMessage(error));
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Modal isOpen={isOpen} onClose={onClose} title="Switch Account" size="small">
			<p>Log in with a different account. You'll stay logged in as you are now until this succeeds.</p>

			{formError ? <p className="som-form-error">{formError}</p> : null}

			<form onSubmit={handleSubmit}>
				<div className="som-field">
					<label className="som-field-label" htmlFor="switch-account-email">
						Email
					</label>
					<input
						id="switch-account-email"
						className="som-field-input"
						type="email"
						value={email}
						autoComplete="email"
						autoFocus
						onChange={(event) => setEmail(event.target.value)}
					/>
				</div>

				<div className="som-field">
					<label className="som-field-label" htmlFor="switch-account-password">
						Password
					</label>
					<input
						id="switch-account-password"
						className="som-field-input"
						type="password"
						value={password}
						autoComplete="current-password"
						onChange={(event) => setPassword(event.target.value)}
					/>
				</div>

				<div style={{ display: "flex", gap: "0.6rem" }}>
					<button
						type="button"
						className="som-btn som-btn-secondary"
						style={{ flex: 1 }}
						onClick={onClose}
						disabled={isSubmitting}
					>
						Nevermind
					</button>
					<button type="submit" className="som-btn som-btn-primary" style={{ flex: 1 }} disabled={!canSubmit}>
						{isSubmitting ? "Switching…" : "Switch"}
					</button>
				</div>
			</form>
		</Modal>
	);
}
