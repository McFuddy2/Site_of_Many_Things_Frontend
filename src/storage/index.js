// The single data-access layer every feature uses for persistence.
//
//   await storage.spellbooks.list();
//   await storage.spellbooks.get(id);
//   await storage.spellbooks.save(spellbook);
//   await storage.spellbooks.delete(id);
//
// Whether a call lands in localStorage or on the API is decided here, from the
// session's effective tier — Guests (including registered-but-unverified users)
// stay local, verified Trailblazers go to the backend. Feature components must
// never branch on that themselves; that is the whole reason this layer exists.
//
// The exception is a resource marked localOnly, which has no endpoint behind it
// and stays on localStorage for every tier. See RESOURCES.spellRatings.

import { RESOURCES, COLLECTION_RESOURCES, MIGRATABLE_RESOURCES, getMigratableLocalKeys } from "./resources";
import { localAdapter } from "./localAdapter";
import { apiAdapter } from "./apiAdapter";
import { mockAdapter } from "./mockAdapter";
import { USE_MOCK_API } from "../API/client";
import { removeKeys } from "./localStore";
import { getEffectiveTier, isBackendBacked, subscribe as subscribeToSession, waitForSessionReady } from "../auth/session";
import { getResourceLimit } from "../config/tiers";

function getRemoteAdapter() {
	return USE_MOCK_API ? mockAdapter : apiAdapter;
}

function getAdapter(resource) {
	// A localOnly resource has no endpoint behind it, so it stays on localStorage
	// whatever the tier. Everything else follows the session.
	if (resource?.localOnly) {
		return localAdapter;
	}
	return isBackendBacked() ? getRemoteAdapter() : localAdapter;
}

// Every read and write waits for the session to finish restoring, so a component
// that loads on mount can't race the auth bootstrap and read localStorage when
// the visitor actually has an account. Resolves immediately once ready.
async function getReadyAdapter(resource) {
	await waitForSessionReady();
	return getAdapter(resource);
}

// Change notification, so independent consumers (the Library, the header
// breadcrumb badge, the Profile page) stay in step after a mutation without
// polling or prop-drilling.
const listeners = new Set();

export function subscribeToStorage(listener) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

function notifyChange(resourceName) {
	listeners.forEach((listener) => {
		try {
			listener(resourceName);
		} catch (error) {
			console.error("Storage listener failed:", error);
		}
	});
}

// Logging in or out swaps which backend every resource reads from, so it counts
// as a change to all of them.
subscribeToSession(() => notifyChange(null));

function createCollectionApi(resource) {
	return {
		resource,

		async list() {
			return (await getReadyAdapter(resource)).list(resource);
		},

		async get(id) {
			return (await getReadyAdapter(resource)).get(resource, id);
		},

		async create(item) {
			const created = await (await getReadyAdapter(resource)).create(resource, item);
			notifyChange(resource.name);
			return created;
		},

		async update(id, item) {
			const updated = await (await getReadyAdapter(resource)).update(resource, id, item);
			notifyChange(resource.name);
			return updated;
		},

		// Create-or-update convenience. An item carrying an id that the store
		// doesn't know about is created with that id preserved, which keeps
		// locally-generated ids stable for Guests.
		async save(item) {
			if (item?.id) {
				let updated = null;
				try {
					updated = await (await getReadyAdapter(resource)).update(resource, item.id, item);
				} catch (error) {
					if (error?.status !== 404) {
						throw error;
					}
				}
				if (updated) {
					notifyChange(resource.name);
					return updated;
				}
			}
			return this.create(item);
		},

		async delete(id) {
			const removed = await (await getReadyAdapter(resource)).remove(resource, id);
			notifyChange(resource.name);
			return removed;
		},

		// Used by the merge and trimming flows, which need to set the whole
		// collection at once rather than item by item.
		async replaceAll(items) {
			const result = await (await getReadyAdapter(resource)).replaceAll(resource, items);
			notifyChange(resource.name);
			return result;
		},

		async count() {
			const items = await this.list();
			return items.length;
		},

		// UI-only convenience. The backend is the real gate and can still answer
		// any write with 409 limit_exceeded even when this says there's room.
		getLimit(tier = getEffectiveTier()) {
			return getResourceLimit(tier, resource.limitKey);
		},

		async isAtLimit(tier = getEffectiveTier()) {
			const limit = this.getLimit(tier);
			if (limit === null) {
				return false;
			}
			return (await this.count()) >= limit;
		},

		// Local data regardless of the active adapter — the migration and conflict
		// flows need to read what's on this device while logged in.
		readLocal() {
			return resource.localStore.readAll();
		},

		hasLocalData() {
			return resource.localStore.readAll().length > 0;
		},
	};
}

function createDocumentApi(resource) {
	return {
		resource,

		async get() {
			return (await getReadyAdapter(resource)).getDocument(resource);
		},

		async save(value) {
			const saved = await (await getReadyAdapter(resource)).saveDocument(resource, value);
			notifyChange(resource.name);
			return saved;
		},

		readLocal() {
			return resource.localStore.read();
		},

		hasLocalData() {
			return Object.keys(resource.localStore.read() || {}).length > 0;
		},
	};
}

export const storage = {
	spellbooks: createCollectionApi(RESOURCES.spellbooks),
	initiativeTrackers: createCollectionApi(RESOURCES.initiativeTrackers),
	spellRatings: createDocumentApi(RESOURCES.spellRatings),

	// Bulk import of a Guest's local data into their account. Only meaningful on
	// a backend-backed session; the caller clears local data once this resolves.
	async migrate(payload, options) {
		const result = await getRemoteAdapter().migrate(payload, options);
		notifyChange(null);
		return result;
	},
};

// Bulk import of local data into the account. Only meaningful on a
// backend-backed session; the caller clears local data after this resolves.
// Everything held locally, in the shape POST /migrate expects.
export function readAllLocalData() {
	const payload = {};
	MIGRATABLE_RESOURCES.forEach((resource) => {
		const value =
			resource.kind === "collection" ? resource.localStore.readAll() : resource.localStore.read();
		payload[resource.migrateKey] = value;
	});
	return payload;
}

// True when this browser holds anything worth migrating or reconciling.
export function hasAnyLocalData() {
	return MIGRATABLE_RESOURCES.some((resource) =>
		resource.kind === "collection"
			? resource.localStore.readAll().length > 0
			: Object.keys(resource.localStore.read() || {}).length > 0,
	);
}

// Only ever called after the backend has confirmed a migration succeeded.
export function clearAllLocalData() {
	removeKeys(getMigratableLocalKeys());
	notifyChange(null);
}

export { RESOURCES, COLLECTION_RESOURCES, MIGRATABLE_RESOURCES };
