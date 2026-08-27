// Reconciles this device's local data with the account, whenever the session
// becomes backend-backed.
//
// Both of the flows in the spec funnel through here, because both end in the
// same state — a verified Trailblazer session on a device that may still hold
// Guest data:
//
//   verification -> account is empty  -> migrate straight across
//   login        -> account has data  -> ask the user which save to keep
//
// Local data is never cleared until the backend has confirmed it holds the data,
// so every failure path here is retryable with nothing lost.

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "../ui/Modal";
import { useAuth } from "../../auth/AuthContext";
import { getUserMessage } from "../../API/errors";
import {
	createIdempotencyKey,
	detectSyncAction,
	getOverLimitResources,
	keepAccountData,
	keepDeviceData,
	mergeData,
	migrateLocalToAccount,
	summarizeSnapshot,
} from "../../storage/migration";
import { TRAILBLAZER_TIER, getResourceLabel } from "../../config/tiers";

function SnapshotSummary({ title, snapshot }) {
	const counts = summarizeSnapshot(snapshot);
	return (
		<div className="tier-comparison-column">
			<h3 className="tier-comparison-title">{title}</h3>
			<ul className="tier-comparison-list">
				<li>
					{counts.spellbooks} {getResourceLabel("spellbooks", counts.spellbooks)}
				</li>
				<li>
					{counts.initiativeTrackers} {getResourceLabel("initiativeTrackers", counts.initiativeTrackers)}
				</li>
			</ul>
		</div>
	);
}

export default function AccountDataSync() {
	const navigate = useNavigate();
	const { user, effectiveTier, isBootstrapping } = useAuth();

	const [status, setStatus] = useState("idle");
	const [snapshots, setSnapshots] = useState({ local: null, account: null });
	const [pendingChoice, setPendingChoice] = useState(null);
	const [errorMessage, setErrorMessage] = useState(null);

	// One reconciliation per account per session. Without this, every re-render
	// that touches the tier would kick off another check.
	const handledForUserRef = useRef(null);

	// The idempotency key for the migration attempt in progress. It is minted
	// once and deliberately survives the "Try again" button: the backend
	// deduplicates on this key, so a retry that reuses it can't double-import
	// data that a first attempt actually landed before the response was lost.
	// Cleared only once the attempt has finished for good.
	const migrationKeyRef = useRef(null);

	const isBackendBacked = effectiveTier === TRAILBLAZER_TIER;

	// After any resolution, an over-limit resource hands off to the trimming flow.
	const finishAndCheckLimits = useCallback(async () => {
		const overLimit = await getOverLimitResources();
		setStatus("idle");
		if (overLimit.some((entry) => entry.resource === "spellbooks")) {
			// The Library is where the over-limit gate lives.
			navigate("/library");
		}
	}, [navigate]);

	const runMigration = useCallback(async () => {
		setStatus("migrating");
		setErrorMessage(null);
		// Only minted when there isn't one already, so a retry sends the same key
		// the failed attempt did.
		if (!migrationKeyRef.current) {
			migrationKeyRef.current = createIdempotencyKey();
		}
		try {
			await migrateLocalToAccount(migrationKeyRef.current);
			migrationKeyRef.current = null;
			await finishAndCheckLimits();
		} catch (error) {
			console.error("Migration failed:", error);
			// Local data is untouched, and the key is kept, so the user can retry.
			setErrorMessage(getUserMessage(error));
			setStatus("error");
		}
	}, [finishAndCheckLimits]);

	useEffect(() => {
		if (isBootstrapping) return;

		if (!isBackendBacked) {
			// Logged out or dropped back to Guest — allow a fresh check next time,
			// as a new session starts a new migration attempt.
			handledForUserRef.current = null;
			migrationKeyRef.current = null;
			setStatus("idle");
			return;
		}

		const userId = user?.id ?? "unknown";
		if (handledForUserRef.current === userId) return;
		handledForUserRef.current = userId;

		(async () => {
			setStatus("checking");
			try {
				const { action, local, account } = await detectSyncAction();
				if (action === "none") {
					setStatus("idle");
					return;
				}
				setSnapshots({ local, account });
				if (action === "migrate") {
					await runMigration();
				} else {
					setStatus("conflict");
				}
			} catch (error) {
				console.error("Could not check for local data to sync:", error);
				setErrorMessage(getUserMessage(error));
				setStatus("error");
			}
		})();
	}, [isBackendBacked, isBootstrapping, user?.id, runMigration]);

	const applyChoice = async (choice) => {
		setStatus("resolving");
		setErrorMessage(null);
		try {
			if (choice === "merge") await mergeData();
			else if (choice === "device") await keepDeviceData();
			else await keepAccountData();
			setPendingChoice(null);
			await finishAndCheckLimits();
		} catch (error) {
			console.error("Could not resolve the data conflict:", error);
			setErrorMessage(getUserMessage(error));
			setStatus("error");
		}
	};

	if (status === "idle" || status === "checking") {
		return null;
	}

	if (status === "migrating" || status === "resolving") {
		return (
			<Modal
				isOpen
				dismissible={false}
				size="small"
				title={status === "migrating" ? "Moving your saved work" : "Applying your choice"}
			>
				<p>
					{status === "migrating"
						? "We're copying everything saved in this browser onto your account. This only takes a moment."
						: "Updating your saved work. This only takes a moment."}
				</p>
			</Modal>
		);
	}

	if (status === "error") {
		return (
			<Modal
				isOpen
				dismissible={false}
				size="small"
				title="We couldn't finish that"
				footer={
					<>
						<button
							type="button"
							className="som-btn som-btn-secondary"
							onClick={() => setStatus(snapshots.account ? "conflict" : "idle")}
						>
							Not now
						</button>
						<button
							type="button"
							className="som-btn som-btn-primary"
							onClick={() => (pendingChoice ? applyChoice(pendingChoice) : runMigration())}
						>
							Try again
						</button>
					</>
				}
			>
				<p>{errorMessage}</p>
				<p>
					Nothing has been lost — everything saved in this browser is still exactly where it was. You can
					try again now or next time you log in.
				</p>
			</Modal>
		);
	}

	// Destructive choices get a confirmation listing what goes away.
	if (status === "conflict" && pendingChoice && pendingChoice !== "merge") {
		const isKeepDevice = pendingChoice === "device";
		const discarded = isKeepDevice ? snapshots.account : snapshots.local;
		return (
			<Modal
				isOpen
				dismissible={false}
				size="small"
				title="Are you sure?"
				footer={
					<>
						<button type="button" className="som-btn som-btn-secondary" onClick={() => setPendingChoice(null)}>
							Go back
						</button>
						<button type="button" className="som-btn som-btn-danger" onClick={() => applyChoice(pendingChoice)}>
							{isKeepDevice ? "Replace my account data" : "Discard this device's data"}
						</button>
					</>
				}
			>
				<p>
					{isKeepDevice
						? "This will replace what's saved on your account with what's saved in this browser."
						: "This will discard what's saved in this browser and keep your account as it is."}
				</p>
				<p>
					<strong>This permanently deletes:</strong>
				</p>
				<div className="tier-comparison">
					<SnapshotSummary title={isKeepDevice ? "Your account data" : "This device's data"} snapshot={discarded} />
				</div>
				<p>This can&apos;t be undone.</p>
			</Modal>
		);
	}

	return (
		<Modal isOpen dismissible={false} size="large" title="We noticed there are two different saves">
			<p>What would you like to keep?</p>

			<div className="tier-comparison">
				<SnapshotSummary title="This device" snapshot={snapshots.local} />
				<SnapshotSummary title="Your account" snapshot={snapshots.account} />
			</div>

			<div className="tier-signup-actions">
				<button type="button" className="som-btn som-btn-gold" onClick={() => applyChoice("merge")}>
					Merge both
				</button>
				<button type="button" className="som-btn som-btn-secondary" onClick={() => setPendingChoice("device")}>
					Keep this device&apos;s data
				</button>
				<button type="button" className="som-btn som-btn-secondary" onClick={() => setPendingChoice("account")}>
					Keep my account data
				</button>
			</div>

			<p style={{ marginTop: "1rem", fontSize: "0.85rem" }}>
				Merging keeps everything. If that puts you over your profile&apos;s limit, we&apos;ll help you tidy
				up straight afterwards — nothing is deleted without asking.
			</p>
		</Modal>
	);
}
