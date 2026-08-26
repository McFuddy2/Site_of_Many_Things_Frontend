// localStorage-backed adapter — the Guest path.
//
// Reads and writes are synchronous underneath, but the interface is async so
// that swapping in the API adapter changes nothing for callers.

function nowIso() {
	return new Date().toISOString();
}

// Matches the id format features already generate, so locally-created records
// look the same whether the component or this adapter minted the id.
const ID_PREFIXES = {
	spellbooks: "spellbook",
	initiativeTrackers: "initiative-tracker",
};

function createId(resource) {
	const prefix = ID_PREFIXES[resource.name] || resource.name;
	return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const localAdapter = {
	name: "local",

	async list(resource) {
		return resource.localStore.readAll();
	},

	async get(resource, id) {
		return resource.localStore.readAll().find((item) => item.id === id) || null;
	},

	async create(resource, item) {
		const items = resource.localStore.readAll();
		const created = {
			...item,
			id: item.id || createId(resource),
			created_at: item.created_at || nowIso(),
			updated_at: nowIso(),
		};
		resource.localStore.writeAll([...items, created]);
		return created;
	},

	async update(resource, id, item) {
		const items = resource.localStore.readAll();
		const index = items.findIndex((existing) => existing.id === id);
		if (index === -1) {
			return null;
		}
		const updated = { ...items[index], ...item, id, updated_at: nowIso() };
		const nextItems = [...items];
		nextItems[index] = updated;
		resource.localStore.writeAll(nextItems);
		return updated;
	},

	async remove(resource, id) {
		const items = resource.localStore.readAll();
		const nextItems = items.filter((item) => item.id !== id);
		if (nextItems.length === items.length) {
			return false;
		}
		resource.localStore.writeAll(nextItems);
		return true;
	},

	async replaceAll(resource, items) {
		resource.localStore.writeAll(items);
		return items;
	},

	async getDocument(resource) {
		return resource.localStore.read();
	},

	async saveDocument(resource, value) {
		resource.localStore.write(value);
		return value;
	},
};
