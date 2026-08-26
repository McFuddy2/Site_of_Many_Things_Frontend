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
	// NOTE: /spell-ratings is not in the agreed API contract yet — it is proposed,
	// pending confirmation from the backend developer. Ratings are a map keyed by
	// spell id rather than a list, so they don't fit the REST collection shape.
	// If the backend settles on a different shape, this entry and the document
	// branch of apiAdapter are the only places that need to change.
	spellRatings: {
		name: "spellRatings",
		kind: "document",
		endpoint: "/spell-ratings",
		migrateKey: "spell_ratings",
		localStore: createKeyedDocumentStore(SPELL_RATINGS_STORAGE_KEY, {}),
	},
};

export const COLLECTION_RESOURCES = Object.values(RESOURCES).filter((resource) => resource.kind === "collection");
export const ALL_RESOURCES = Object.values(RESOURCES);

// Every localStorage key owned by the storage layer, used when clearing local
// data after a confirmed migration.
export function getAllLocalKeys() {
	return ALL_RESOURCES.flatMap((resource) => resource.localStore.keys);
}
