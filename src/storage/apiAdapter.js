// Backend-backed adapter — the verified Trailblazer path.
//
// Translates between the flat objects features use and the { id, name, data }
// envelope from the API contract. Errors propagate as ApiError; callers surface
// them through getUserMessage() rather than reading them directly.

import { apiFetch } from "../API/client";

function toEnvelope(resource, item) {
	return resource.toEnvelope ? resource.toEnvelope(item) : item;
}

function fromEnvelope(resource, envelope) {
	if (!envelope) {
		return null;
	}
	return resource.fromEnvelope ? resource.fromEnvelope(envelope) : envelope;
}

export const apiAdapter = {
	name: "api",

	async list(resource) {
		const body = await apiFetch(resource.endpoint);
		const items = Array.isArray(body) ? body : body?.items || [];
		return items.map((envelope) => fromEnvelope(resource, envelope));
	},

	async get(resource, id) {
		const envelope = await apiFetch(`${resource.endpoint}/${encodeURIComponent(id)}`);
		return fromEnvelope(resource, envelope);
	},

	async create(resource, item) {
		const envelope = await apiFetch(resource.endpoint, {
			method: "POST",
			body: toEnvelope(resource, item),
		});
		return fromEnvelope(resource, envelope);
	},

	async update(resource, id, item) {
		const envelope = await apiFetch(`${resource.endpoint}/${encodeURIComponent(id)}`, {
			method: "PUT",
			body: toEnvelope(resource, item),
		});
		return fromEnvelope(resource, envelope);
	},

	async remove(resource, id) {
		await apiFetch(`${resource.endpoint}/${encodeURIComponent(id)}`, { method: "DELETE" });
		return true;
	},

	// The contract has no bulk-replace endpoint, so this is expressed as the
	// difference between what the server holds and what it should hold.
	async replaceAll(resource, items) {
		const existing = await this.list(resource);
		const nextIds = new Set(items.map((item) => item.id).filter(Boolean));

		await Promise.all(
			existing
				.filter((item) => !nextIds.has(item.id))
				.map((item) => this.remove(resource, item.id)),
		);

		const results = [];
		for (const item of items) {
			if (item.id && existing.some((existingItem) => existingItem.id === item.id)) {
				results.push(await this.update(resource, item.id, item));
			} else {
				results.push(await this.create(resource, item));
			}
		}
		return results;
	},

	// Bulk import of a Guest's local data into a freshly verified account.
	async migrate(payload) {
		return apiFetch("/migrate", { method: "POST", body: payload });
	},

	async getDocument(resource) {
		const body = await apiFetch(resource.endpoint);
		return body?.data ?? {};
	},

	async saveDocument(resource, value) {
		const body = await apiFetch(resource.endpoint, { method: "PUT", body: { data: value } });
		return body?.data ?? value;
	},
};
