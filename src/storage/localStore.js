// localStorage primitives shared by the storage layer's local adapter.
//
// Follows the existing house pattern from spellbookStorage.js: every read and
// write is wrapped, failures are logged and degrade to a sensible empty value
// rather than throwing into the UI.

export function readJson(key, fallback) {
	try {
		const raw = localStorage.getItem(key);
		if (raw === null) {
			return fallback;
		}
		const parsed = JSON.parse(raw);
		return parsed === null || parsed === undefined ? fallback : parsed;
	} catch (error) {
		console.error(`Error reading "${key}" from local storage:`, error);
		return fallback;
	}
}

export function writeJson(key, value) {
	try {
		localStorage.setItem(key, JSON.stringify(value));
		return true;
	} catch (error) {
		console.error(`Error writing "${key}" to local storage:`, error);
		return false;
	}
}

export function removeKeys(keys) {
	keys.forEach((key) => {
		try {
			localStorage.removeItem(key);
		} catch (error) {
			console.error(`Error removing "${key}" from local storage:`, error);
		}
	});
}

// A collection stored as a single JSON array under one key — the shape used by
// spellbooks_v1 today.
export function createKeyedCollectionStore(key) {
	return {
		keys: [key],
		readAll() {
			const value = readJson(key, []);
			return Array.isArray(value) ? value : [];
		},
		writeAll(items) {
			return writeJson(key, items);
		},
	};
}

// A single JSON object stored under one key — the shape used by spell_ratings_v1.
export function createKeyedDocumentStore(key, fallback = {}) {
	return {
		keys: [key],
		read() {
			const value = readJson(key, fallback);
			return value && typeof value === "object" && !Array.isArray(value) ? value : fallback;
		},
		write(value) {
			return writeJson(key, value);
		},
	};
}
