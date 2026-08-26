// In-memory stand-in for the backend, toggled with VITE_USE_MOCK_API=true.
//
// Implements the same interface as apiAdapter so UI work can proceed before the
// real endpoints exist, including the 409 limit_exceeded path.
//
// State is held in sessionStorage purely so a dev page reload doesn't wipe the
// scenario under test. NO TOKEN OR CREDENTIAL EVER GOES HERE — this holds mock
// resource rows only, and the whole module is inert unless the env flag is set.

import { ApiError, ERROR_CODES } from "../API/errors";
import { getEffectiveTier } from "../auth/session";
import { getResourceLimit } from "../config/tiers";
import { RESOURCES } from "./resources";

const MOCK_STATE_KEY = "__mock_api_state__";
const MOCK_LATENCY_MS = 180;

function readState() {
	try {
		const raw = sessionStorage.getItem(MOCK_STATE_KEY);
		return raw ? JSON.parse(raw) : {};
	} catch {
		return {};
	}
}

function writeState(state) {
	try {
		sessionStorage.setItem(MOCK_STATE_KEY, JSON.stringify(state));
	} catch (error) {
		console.error("Mock API state could not be persisted:", error);
	}
}

function delay() {
	return new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));
}

function nowIso() {
	return new Date().toISOString();
}

function mockId() {
	return `mock-${Math.random().toString(36).slice(2, 10)}`;
}

function readCollection(resource) {
	const state = readState();
	return Array.isArray(state[resource.name]) ? state[resource.name] : [];
}

function writeCollection(resource, items) {
	const state = readState();
	state[resource.name] = items;
	writeState(state);
}

// Mirrors the server-side enforcement the real backend performs, so the 409
// handling path gets exercised during UI development.
function assertWithinLimit(resource, currentCount) {
	const limit = getResourceLimit(getEffectiveTier(), resource.limitKey);
	if (limit !== null && currentCount >= limit) {
		throw new ApiError({
			code: ERROR_CODES.LIMIT_EXCEEDED,
			status: 409,
			resource: resource.name,
			limit,
			current: currentCount,
		});
	}
}

export const mockAdapter = {
	name: "mock",

	async list(resource) {
		await delay();
		return readCollection(resource).map((envelope) => resource.fromEnvelope(envelope));
	},

	async get(resource, id) {
		await delay();
		const envelope = readCollection(resource).find((item) => item.id === id);
		return envelope ? resource.fromEnvelope(envelope) : null;
	},

	async create(resource, item) {
		await delay();
		const items = readCollection(resource);
		assertWithinLimit(resource, items.length);
		const envelope = {
			...resource.toEnvelope(item),
			id: mockId(),
			created_at: nowIso(),
			updated_at: nowIso(),
		};
		writeCollection(resource, [...items, envelope]);
		return resource.fromEnvelope(envelope);
	},

	async update(resource, id, item) {
		await delay();
		const items = readCollection(resource);
		const index = items.findIndex((existing) => existing.id === id);
		if (index === -1) {
			return null;
		}
		const envelope = { ...items[index], ...resource.toEnvelope(item), id, updated_at: nowIso() };
		const nextItems = [...items];
		nextItems[index] = envelope;
		writeCollection(resource, nextItems);
		return resource.fromEnvelope(envelope);
	},

	async remove(resource, id) {
		await delay();
		const items = readCollection(resource);
		const nextItems = items.filter((item) => item.id !== id);
		writeCollection(resource, nextItems);
		return nextItems.length !== items.length;
	},

	// Bulk replace bypasses the per-item cap deliberately: a merge is allowed to
	// land over the limit and is then resolved by the trimming flow.
	async replaceAll(resource, items) {
		await delay();
		const envelopes = items.map((item) => ({
			...resource.toEnvelope(item),
			id: item.id || mockId(),
			created_at: item.created_at || nowIso(),
			updated_at: nowIso(),
		}));
		writeCollection(resource, envelopes);
		return envelopes.map((envelope) => resource.fromEnvelope(envelope));
	},

	// Mirrors POST /migrate. Deliberately exempt from the per-item cap: an import
	// is allowed to land over the limit and is resolved by the trimming flow.
	async migrate(payload) {
		await delay();
		const state = readState();
		const imported = {};

		Object.values(RESOURCES).forEach((resource) => {
			const incoming = payload?.[resource.migrateKey];
			if (incoming === undefined || incoming === null) return;

			if (resource.kind === "collection") {
				const existing = Array.isArray(state[resource.name]) ? state[resource.name] : [];
				const envelopes = incoming.map((item) => ({
					...resource.toEnvelope(item),
					id: mockId(),
					created_at: item.created_at || nowIso(),
					updated_at: nowIso(),
				}));
				state[resource.name] = [...existing, ...envelopes];
				imported[resource.migrateKey] = envelopes.length;
			} else {
				state[resource.name] = { ...(state[resource.name] || {}), ...incoming };
				imported[resource.migrateKey] = Object.keys(incoming).length;
			}
		});

		writeState(state);
		return { imported };
	},

	async getDocument(resource) {
		await delay();
		const state = readState();
		return state[resource.name] || {};
	},

	async saveDocument(resource, value) {
		await delay();
		const state = readState();
		state[resource.name] = value;
		writeState(state);
		return value;
	},
};

export function resetMockApiState() {
	try {
		sessionStorage.removeItem(MOCK_STATE_KEY);
	} catch {
		// Nothing to do — a browser that won't let us clear it will also not have set it.
	}
}
