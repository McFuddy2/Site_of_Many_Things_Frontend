// Resource descriptors for the storage layer.
//
// Each entry says where a resource lives locally, where it lives on the API, and
// how to translate between the flat object features already use and the
// { id, name, data } envelope the API contract specifies.
//
// Adding a resource later (combat managers, character sheets) means adding an
// entry here — not touching the adapters.

import { createKeyedCollectionStore, createKeyedDocumentStore } from "./localStore";
import { createTrackerLocalStore } from "../utils/initiative/trackerDocument";

export const SPELLBOOKS_STORAGE_KEY = "spellbooks_v1";
export const SPELL_RATINGS_STORAGE_KEY = "spell_ratings_v1";

// Spellbooks are stored locally as flat objects that carry their own id and name
// alongside their contents. The API wraps that same object in an envelope, so the
// server's id and name win on the way back out.
const spellbookEnvelope = {
	toEnvelope(spellbook) {
		return { name: spellbook.name, data: spellbook };
	},
	fromEnvelope(envelope) {
		return { ...(envelope.data || {}), id: envelope.id, name: envelope.name };
	},
};

// Tracker documents are already in envelope shape locally.
const identityEnvelope = {
	toEnvelope(tracker) {
		return { name: tracker.name, data: tracker.data };
	},
	fromEnvelope(envelope) {
		return { id: envelope.id, name: envelope.name, data: envelope.data || {}, created_at: envelope.created_at, updated_at: envelope.updated_at };
	},
};

export const RESOURCES = {
	spellbooks: {
		name: "spellbooks",
		kind: "collection",
		endpoint: "/spellbooks",
		limitKey: "spellbooks",
		migrateKey: "spellbooks",
		localStore: createKeyedCollectionStore(SPELLBOOKS_STORAGE_KEY),
		...spellbookEnvelope,
	},
	initiativeTrackers: {
		name: "initiativeTrackers",
		kind: "collection",
		endpoint: "/initiative-trackers",
		limitKey: "initiativeTrackers",
		migrateKey: "initiative_trackers",
		localStore: createTrackerLocalStore(),
		...identityEnvelope,
	},
	// There is no /spell-ratings endpoint, and there isn't going to be one in this
	// shape: ratings have been reframed as a larger "personal + community ratings"
	// feature that is still in the backlog. Until that lands, ratings stay on this
	// device for every tier — `localOnly` pins them to the local adapter, and with
	// no migrateKey they are left out of the /migrate payload and out of the
	// local-data clear that follows a migration. Sending them to the API instead
	// would 404, and the swallowed error would make a Trailblazer's ratings look
	// saved right up until they vanished.
	//
	// The Trailblazer-only gate on the rating UI is unaffected and stays as it is.
	spellRatings: {
		name: "spellRatings",
		kind: "document",
		localOnly: true,
		migrateKey: null,
		localStore: createKeyedDocumentStore(SPELL_RATINGS_STORAGE_KEY, {}),
	},
};

export const COLLECTION_RESOURCES = Object.values(RESOURCES).filter((resource) => resource.kind === "collection");
export const ALL_RESOURCES = Object.values(RESOURCES);

// The resources that live on the account once a session is backend-backed, and
// so are the ones a migration moves and reconciles. A localOnly resource never
// leaves the device, so it takes no part in any of that.
export const MIGRATABLE_RESOURCES = ALL_RESOURCES.filter((resource) => !resource.localOnly);

// The localStorage keys cleared once a migration is confirmed. Deliberately only
// the migratable resources: clearing a localOnly key would delete data the
// backend was never sent.
export function getMigratableLocalKeys() {
	return MIGRATABLE_RESOURCES.flatMap((resource) => resource.localStore.keys);
}
