// The blocking gate for a resource that's over its profile limit.
//
// Existing users may hold up to 8 spellbooks locally while the Guest cap is now
// 1, so they have to resolve that before carrying on. Not dismissible: there is
// no "×", escape and outside clicks are ignored, and the overlay sits above the
// header so nothing behind it can be clicked.
//
// Parameterised by resource. Spellbooks are the only one that needs it today —
// the only resource where existing users exceed the new limits — but nothing
// here is spellbook-specific.

import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "../ui/Modal";
import "./OverLimitGate.css";
import { storage } from "../../storage";
import { useOverLimit } from "../../storage/OverLimitContext";
import { useAuth } from "../../auth/AuthContext";
import { getUserMessage } from "../../API/errors";
import {
	GUEST_TIER,
	TRAILBLAZER_TIER,
	getResourceLabel,
	getResourceLimit,
	getTierLabel,
} from "../../config/tiers";

export default function OverLimitGate({ resource }) {
	const navigate = useNavigate();
	const { effectiveTier } = useAuth();
	const { getOverLimitEntry, refresh } = useOverLimit();

	const entry = getOverLimitEntry(resource);
	const isGuest = effectiveTier === GUEST_TIER;

	// Guests get the choice of upgrading instead of trimming. A Trailblazer over
	// the cap (after merging two saves) has nothing to upgrade to, so they go
	// straight to trimming.
	const [step, setStep] = useState(isGuest ? "intro" : "trim");
	const [items, setItems] = useState([]);
	const [selectedIds, setSelectedIds] = useState(() => new Set());
	const [isBusy, setIsBusy] = useState(false);
	const [errorMessage, setErrorMessage] = useState(null);

	const limit = getResourceLimit(effectiveTier, resource) ?? 0;
	const singular = getResourceLabel(resource, 1);
	const plural = getResourceLabel(resource, 2);

	const loadItems = useCallback(async () => {
		try {
			setItems(await storage[resource].list());
		} catch (error) {
			console.error(`Could not load ${resource}:`, error);
			setErrorMessage(getUserMessage(error));
		}
	}, [resource]);

	useEffect(() => {
		loadItems();
	}, [loadItems]);

	useEffect(() => {
		setStep(isGuest ? "intro" : "trim");
	}, [isGuest]);

	if (!entry) {
		return null;
	}

	// Exactly the tier's allowance must remain — no deleting everything.
	const requiredSelectionCount = Math.max(items.length - limit, 0);
	const canDelete = selectedIds.size === requiredSelectionCount && requiredSelectionCount > 0;
	const selectedItems = items.filter((item) => selectedIds.has(item.id));

	const toggleSelected = (id) => {
		setSelectedIds((previous) => {
			const next = new Set(previous);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const goToSignUp = () => navigate("/profile", { state: { openSignup: true } });

	const handleDelete = async () => {
		setIsBusy(true);
		setErrorMessage(null);
		try {
			for (const item of selectedItems) {
				await storage[resource].delete(item.id);
			}
			setSelectedIds(new Set());
			await loadItems();
			await refresh();
		} catch (error) {
			console.error(`Could not delete ${resource}:`, error);
			setErrorMessage(getUserMessage(error));
			setStep("trim");
		} finally {
			setIsBusy(false);
		}
	};

	if (step === "intro") {
		return (
			<Modal
				isOpen
				dismissible={false}
				size="medium"
				title="A quick change to profiles"
				footer={
					<>
						<button type="button" className="som-btn som-btn-secondary" onClick={() => setStep("trim")}>
							Keep {getTierLabel(GUEST_TIER)}
						</button>
						<button type="button" className="som-btn som-btn-gold" onClick={goToSignUp}>
							Upgrade to {getTierLabel(TRAILBLAZER_TIER)}
						</button>
					</>
				}
			>
				<p>
					We&apos;ve recently added profiles to the site, and different profile types come with different
					perks. Your profile is currently the <strong>{getTierLabel(GUEST_TIER)}</strong> type, and a{" "}
					{getTierLabel(GUEST_TIER)} profile can have a maximum of {limit} saved {limit === 1 ? singular : plural}.
				</p>
				<p>
					You can keep your current profile and delete your extra {plural}, or upgrade to a{" "}
					<strong>{getTierLabel(TRAILBLAZER_TIER)}</strong> — it&apos;s free, and only requires creating a
					login. {getTierLabel(TRAILBLAZER_TIER)}s can save up to{" "}
					{getResourceLimit(TRAILBLAZER_TIER, resource)} {plural}, along with other perks.
				</p>
				<p>What would you like to do?</p>
			</Modal>
		);
	}

	if (step === "confirm") {
		return (
			<Modal
				isOpen
				dismissible={false}
				size="medium"
				title="Delete these permanently?"
				footer={
					<>
						<button
							type="button"
							className="som-btn som-btn-secondary"
							disabled={isBusy}
							onClick={() => setStep("trim")}
						>
							Go back
						</button>
						<button type="button" className="som-btn som-btn-danger" disabled={isBusy} onClick={handleDelete}>
							{isBusy ? "Deleting…" : `Delete ${selectedItems.length}`}
						</button>
					</>
				}
			>
				{errorMessage ? <p className="som-form-error">{errorMessage}</p> : null}
				<p>
					You&apos;re about to permanently delete {selectedItems.length}{" "}
					{selectedItems.length === 1 ? singular : plural}:
				</p>
				<ul className="over-limit-confirm-list">
					{selectedItems.map((item) => (
						<li key={item.id}>{item.name}</li>
					))}
				</ul>
				<p>
					This can&apos;t be undone — once deleted, {selectedItems.length === 1 ? "it's" : "they're"} gone for
					good.
				</p>
			</Modal>
		);
	}

	return (
		<Modal
			isOpen
			dismissible={false}
			size="medium"
			title={`Choose which ${plural} to keep`}
			footer={
				<>
					{isGuest ? (
						<button type="button" className="som-btn som-btn-gold" onClick={goToSignUp}>
							Upgrade Profile
						</button>
					) : null}
					<button
						type="button"
						className="som-btn som-btn-danger"
						disabled={!canDelete || isBusy}
						onClick={() => setStep("confirm")}
					>
						Delete Selected
					</button>
				</>
			}
		>
			{errorMessage ? <p className="som-form-error">{errorMessage}</p> : null}

			<p>
				You have {items.length} {items.length === 1 ? singular : plural} and your profile can keep {limit}.
				Tick the {requiredSelectionCount === 1 ? "one" : requiredSelectionCount} you want to{" "}
				<strong>delete</strong>.
			</p>

			<ul className="over-limit-list">
				{items.map((item) => (
					<li key={item.id}>
						<label className="over-limit-item">
							<input
								type="checkbox"
								checked={selectedIds.has(item.id)}
								// Once enough are ticked, the rest lock — deleting more
								// would leave fewer than the profile is allowed to keep.
								disabled={!selectedIds.has(item.id) && selectedIds.size >= requiredSelectionCount}
								onChange={() => toggleSelected(item.id)}
							/>
							<span
								className="over-limit-item-swatch"
								style={{ backgroundColor: item.spineColor || "var(--dark-purple-text)" }}
								aria-hidden="true"
							/>
							<span className="over-limit-item-name">{item.name}</span>
							{Array.isArray(item.spells) ? (
								<span className="over-limit-item-count">
									{item.spells.length} {item.spells.length === 1 ? "spell" : "spells"}
								</span>
							) : null}
						</label>
					</li>
				))}
			</ul>

			<p className="over-limit-status">
				{selectedIds.size} of {requiredSelectionCount} selected
				{canDelete
					? ` — you'll keep ${limit} ${limit === 1 ? singular : plural}.`
					: `. Select ${requiredSelectionCount - selectedIds.size} more to continue.`}
			</p>
		</Modal>
	);
}
