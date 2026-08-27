// Moving a Guest's local data onto their account, and reconciling the two when
// both hold something.
//
// The cardinal rule throughout: local data is only ever cleared after the
// backend has confirmed it holds the data. Every failure path leaves
// localStorage exactly as it was so the user can retry.

import { storage, readAllLocalData, clearAllLocalData, MIGRATABLE_RESOURCES, COLLECTION_RESOURCES } from "./index";
import { getResourceLimit } from "../config/tiers";
import { getEffectiveTier } from "../auth/session";

// Local data keyed by resource name rather than by the wire format's migrate key.
//
// Only the migratable resources: a localOnly resource lives on this device on
// both sides of a login, so it is neither moved nor something the user could be
// asked to choose between.
export function getLocalSnapshot() {
	const snapshot = {};
	MIGRATABLE_RESOURCES.forEach((resource) => {
		snapshot[resource.name] =
			resource.kind === "collection" ? resource.localStore.readAll() : resource.localStore.read();
	});
	return snapshot;
}

export function isSnapshotEmpty(snapshot) {
	return MIGRATABLE_RESOURCES.every((resource) => {
		const value = snapshot[resource.name];
		if (resource.kind === "collection") {
			return !Array.isArray(value) || value.length === 0;
		}
		return !value || Object.keys(value).length === 0;
	});
}

export function hasLocalData() {
	return !isSnapshotEmpty(getLocalSnapshot());
}

// Reads everything the account currently holds. Used to decide whether there is
// a conflict, and as the base for a merge.
export async function getAccountSnapshot() {
	const snapshot = {};
	await Promise.all(
		MIGRATABLE_RESOURCES.map(async (resource) => {
			if (resource.kind === "collection") {
				snapshot[resource.name] = await storage[resource.name].list();
			} else {
				snapshot[resource.name] = await storage[resource.name].get();
			}
		}),
	);
	return snapshot;
}

/**
 * Works out what needs to happen now that the session is backend-backed.
 *
 * - "none"     nothing local to move
 * - "migrate"  local data, empty account: move it straight across
 * - "conflict" both hold data: the user has to choose
 */
export async function detectSyncAction() {
	const local = getLocalSnapshot();
	if (isSnapshotEmpty(local)) {
		return { action: "none", local: null, account: null };
	}

	const account = await getAccountSnapshot();
	if (isSnapshotEmpty(account)) {
		return { action: "migrate", local, account };
	}

	return { action: "conflict", local, account };
}

// One key per migration attempt, minted by the caller and reused across every
// retry of that attempt. crypto.randomUUID needs a secure context, which
// localhost and production both are; the fallback covers anything else.
export function createIdempotencyKey() {
	if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
		return crypto.randomUUID();
	}
	return `migrate-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// POST /migrate with everything held locally, then — and only then — clear the
// migrated keys. A failure anywhere leaves local data untouched.
//
// `idempotencyKey` identifies the migration attempt, not the request: the caller
// holds one key for an attempt and passes the same one back on every retry, so a
// request that actually succeeded before the response was lost can't import the
// data twice.
export async function migrateLocalToAccount(idempotencyKey) {
	const payload = readAllLocalData();
	const result = await storage.migrate(payload, { idempotencyKey });
	clearAllLocalData();
	return result;
}

// "Keep my account data" — destructive to local data, so the caller confirms first.
export async function keepAccountData() {
	// The account already holds what it holds; nothing is written. Local data is
	// simply discarded.
	clearAllLocalData();
}

// "Keep this device's data" — destructive to account data, confirmed by the caller.
export async function keepDeviceData() {
	const local = getLocalSnapshot();

	for (const resource of COLLECTION_RESOURCES) {
		await storage[resource.name].replaceAll(local[resource.name] || []);
	}

	// Only once every write has come back clean.
	clearAllLocalData();
}

// "Merge both" — additive. Nothing is dropped, which means the result may exceed
// the tier limit; the caller routes into the trimming flow afterwards.
export async function mergeData() {
	const local = getLocalSnapshot();
	const account = await getAccountSnapshot();

	for (const resource of COLLECTION_RESOURCES) {
		const accountItems = account[resource.name] || [];
		const localItems = local[resource.name] || [];
		await storage[resource.name].replaceAll([...accountItems, ...localItems]);
	}

	clearAllLocalData();
}

/**
 * Resources currently holding more than the tier allows.
 *
 * Used after a merge, and by the Phase D gate that makes the user trim back
 * under the cap before continuing.
 */
export async function getOverLimitResources(tier = getEffectiveTier()) {
	const overLimit = [];

	await Promise.all(
		COLLECTION_RESOURCES.map(async (resource) => {
			const limit = getResourceLimit(tier, resource.limitKey);
			if (limit === null) return;
			const items = await storage[resource.name].list();
			if (items.length > limit) {
				overLimit.push({ resource: resource.name, limitKey: resource.limitKey, count: items.length, limit });
			}
		}),
	);

	return overLimit;
}

// Counts for the conflict prompt, so the user can see what they're choosing between.
export function summarizeSnapshot(snapshot) {
	if (!snapshot) return { spellbooks: 0, initiativeTrackers: 0 };
	return {
		spellbooks: (snapshot.spellbooks || []).length,
		initiativeTrackers: (snapshot.initiativeTrackers || []).length,
	};
}
