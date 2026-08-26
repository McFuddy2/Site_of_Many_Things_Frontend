// "Manage Profile Type".
//
// Guests get a Guest vs Trailblazer comparison and the two signup routes.
// Trailblazers are already on the best tier, so there is nothing to manage.
//
// Both perk lists are generated from TIER_LIMITS, so changing a cap in config
// updates this modal without anyone editing copy.

import Modal from "../ui/Modal";
import { GUEST_TIER, TRAILBLAZER_TIER, getTierLabel, getTierPerks } from "../../config/tiers";
import { startGoogleAuthorize } from "../../API/auth";

function TierColumn({ tier, isCurrent, isHighlight }) {
	return (
		<div className={`tier-comparison-column${isHighlight ? " tier-comparison-column-highlight" : ""}`}>
			<h3 className="tier-comparison-title">
				{getTierLabel(tier)}
				{isCurrent ? " (you)" : ""}
			</h3>
			<ul className="tier-comparison-list">
				{getTierPerks(tier).map((perk) => (
					<li key={perk}>{perk}</li>
				))}
			</ul>
		</div>
	);
}

export default function ManageProfileTypeModal({ isOpen, onClose, effectiveTier, username, onSignUpWithEmail }) {
	const isTrailblazer = effectiveTier === TRAILBLAZER_TIER;

	if (isTrailblazer) {
		return (
			<Modal
				isOpen={isOpen}
				onClose={onClose}
				title="Your profile type"
				size="small"
				footer={
					<button type="button" className="som-btn som-btn-primary" onClick={onClose}>
						Close
					</button>
				}
			>
				<p>You currently have the best profile option. Enjoy your perks!</p>
			</Modal>
		);
	}

	return (
		<Modal isOpen={isOpen} onClose={onClose} title="Manage Profile Type" size="large">
			<div className="tier-comparison">
				<TierColumn tier={GUEST_TIER} isCurrent />
				<TierColumn tier={TRAILBLAZER_TIER} isHighlight />
			</div>

			<p>
				Becoming a <strong>Trailblazer</strong> is completely free — it only requires signing up with an
				email address. Your saved work moves to your account, so it survives clearing your browser and
				follows you to any device.
			</p>

			<div className="tier-signup-actions">
				<button type="button" className="som-btn som-btn-gold" onClick={onSignUpWithEmail}>
					Sign up with email
				</button>
				<button
					type="button"
					className="som-btn som-btn-google"
					onClick={() => {
						// Google signup still needs a username first, so it goes
						// through the same flow rather than redirecting from here.
						if (username) {
							startGoogleAuthorize(username);
						} else {
							onSignUpWithEmail();
						}
					}}
				>
					Sign up with Google
				</button>
			</div>
		</Modal>
	);
}
