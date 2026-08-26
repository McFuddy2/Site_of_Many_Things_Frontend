// Shown when a Guest reaches for something their profile type doesn't include.
//
// Deliberately generic — the message is passed in — so the same component covers
// a locked feature and, in Phase D, hitting a resource limit. Sign up and Log in
// both land on the Profile page with the matching modal already open.

import { useNavigate } from "react-router-dom";
import Modal from "../ui/Modal";

export default function UpgradePromptModal({
	isOpen,
	onClose,
	title = "Upgrade to unlock this",
	message,
	dismissLabel = "Not now",
}) {
	const navigate = useNavigate();

	const goToProfile = (modalToOpen) => {
		onClose?.();
		navigate("/profile", { state: modalToOpen });
	};

	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			title={title}
			size="small"
			footer={
				<>
					<button type="button" className="som-btn som-btn-secondary" onClick={onClose}>
						{dismissLabel}
					</button>
					<button
						type="button"
						className="som-btn som-btn-secondary"
						onClick={() => goToProfile({ openLogin: true })}
					>
						Log in
					</button>
					<button
						type="button"
						className="som-btn som-btn-gold"
						onClick={() => goToProfile({ openSignup: true })}
					>
						Sign up
					</button>
				</>
			}
		>
			<p>{message}</p>
		</Modal>
	);
}
