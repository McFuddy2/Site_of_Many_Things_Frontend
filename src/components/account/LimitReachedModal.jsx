// Shown when someone tries to create an item beyond their profile's limit.
//
// Parameterised by resource and tier so the same component covers spellbooks,
// initiative trackers and — later — combat managers. Also used for the
// `409 limit_exceeded` response path, for when the server refuses a write the
// client-side check thought was fine.

import { useNavigate } from "react-router-dom";
import Modal from "../ui/Modal";
import { GUEST_TIER, getResourceLabel, getResourceLimit, getTierLabel } from "../../config/tiers";

export default function LimitReachedModal({ isOpen, onClose, resource, tier }) {
	const navigate = useNavigate();

	const limit = getResourceLimit(tier, resource);
	const resourceLabel = getResourceLabel(resource, 2);
	const canUpgrade = tier === GUEST_TIER;

	// A Trailblazer is already on the highest tier, so there is nothing to offer
	// them but the fact that they're full.
	if (!canUpgrade) {
		return (
			<Modal
				isOpen={isOpen}
				onClose={onClose}
				title="You're at your limit"
				size="small"
				footer={
					<button type="button" className="som-btn som-btn-primary" onClick={onClose}>
						Close
					</button>
				}
			>
				<p>
					You&apos;ve hit your limit of {limit} {resourceLabel} for this {getTierLabel(tier)} profile. Delete
					one you no longer need to make room for a new one.
				</p>
			</Modal>
		);
	}

	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			title={`${resourceLabel} limit reached`}
			size="small"
			footer={
				<>
					<button type="button" className="som-btn som-btn-secondary" onClick={onClose}>
						No
					</button>
					<button
						type="button"
						className="som-btn som-btn-gold"
						onClick={() => {
							onClose?.();
							navigate("/profile", { state: { openSignup: true } });
						}}
					>
						Yes
					</button>
				</>
			}
		>
			<p>
				You&apos;ve hit your limit of {resourceLabel} for this {getTierLabel(tier)} profile. Would you like to
				upgrade to a Trailblazer to unlock more?
			</p>
		</Modal>
	);
}
