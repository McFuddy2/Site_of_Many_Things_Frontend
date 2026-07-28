export const SPELLBOOKS_STORAGE_KEY = "spellbooks_v1";
export const MAX_SAVED_SPELLBOOKS = 8;

export function getSavedSpellbooks() {
	try {
		const raw = localStorage.getItem(SPELLBOOKS_STORAGE_KEY);
		const parsed = raw ? JSON.parse(raw) : [];
		return Array.isArray(parsed) ? parsed : [];
	} catch (error) {
		console.error("Error reading saved spellbooks:", error);
		return [];
	}
}

// Returns true on success, false if the spellbook cap was reached or storage failed.
export function saveSpellbook(spellbook) {
	try {
		const existingSpellbooks = getSavedSpellbooks();
		if (existingSpellbooks.length >= MAX_SAVED_SPELLBOOKS) {
			return false;
		}

		const updatedSpellbooks = [...existingSpellbooks, spellbook];
		localStorage.setItem(SPELLBOOKS_STORAGE_KEY, JSON.stringify(updatedSpellbooks));
		return true;
	} catch (error) {
		console.error("Error saving spellbook:", error);
		return false;
	}
}

// Returns the updated spellbook on success, or null if it couldn't be found/saved.
export function updateSpellbook(spellbookId, updater) {
	try {
		const existingSpellbooks = getSavedSpellbooks();
		const index = existingSpellbooks.findIndex((book) => book.id === spellbookId);
		if (index === -1) {
			return null;
		}

		const updatedSpellbook = updater(existingSpellbooks[index]);
		const updatedSpellbooks = [...existingSpellbooks];
		updatedSpellbooks[index] = updatedSpellbook;
		localStorage.setItem(SPELLBOOKS_STORAGE_KEY, JSON.stringify(updatedSpellbooks));
		return updatedSpellbook;
	} catch (error) {
		console.error("Error updating spellbook:", error);
		return null;
	}
}

// Sets a boolean flag (e.g. "prepared" or "ritual") on one spell within a saved spellbook.
export function setSpellbookSpellFlag(spellbookId, spellId, flag, value) {
	return updateSpellbook(spellbookId, (book) => ({
		...book,
		spells: (book.spells || []).map((spell) =>
			spell.id === spellId ? { ...spell, [flag]: value } : spell
		),
	}));
}

// Sets multiple flags at once (e.g. { alwaysPrepared: true, prepared: true }) on one spell within a saved spellbook.
export function setSpellbookSpellFlags(spellbookId, spellId, flags) {
	return updateSpellbook(spellbookId, (book) => ({
		...book,
		spells: (book.spells || []).map((spell) =>
			spell.id === spellId ? { ...spell, ...flags } : spell
		),
	}));
}

// Sets the maximum number of spells that can be prepared for a saved spellbook. Returns the updated spellbook on success, or null if it couldn't be found/saved.
export function setSpellbookMaxPrepared(spellbookId, maxPrepared) {
	return updateSpellbook(spellbookId, (book) => ({
		...book,
		maxPrepared,
	}));
}

// Sets the number of available spell slots at a given level (1-9), resizing the "used" checkbox array to match. Returns the updated spellbook on success, or null if it couldn't be found/saved.
export function setSpellbookSpellSlotMax(spellbookId, level, max) {
	return updateSpellbook(spellbookId, (book) => {
		const existingSlots = book.spellSlots || {};
		const existingLevel = existingSlots[level] || { max: 0, used: [] };
		const nextMax = Number.isFinite(max) && max > 0 ? max : 0;
		const nextUsed = Array.from({ length: nextMax }, (_, index) => Boolean(existingLevel.used?.[index]));
		return {
			...book,
			spellSlots: {
				...existingSlots,
				[level]: { max: nextMax, used: nextUsed },
			},
		};
	});
}

// Toggles a single spell slot checkbox at the given level/index for a saved spellbook. Returns the updated spellbook on success, or null if it couldn't be found/saved.
export function toggleSpellbookSpellSlotUsed(spellbookId, level, index) {
	return updateSpellbook(spellbookId, (book) => {
		const existingSlots = book.spellSlots || {};
		const existingLevel = existingSlots[level] || { max: 0, used: [] };
		const nextUsed = [...(existingLevel.used || [])];
		nextUsed[index] = !nextUsed[index];
		return {
			...book,
			spellSlots: {
				...existingSlots,
				[level]: { ...existingLevel, used: nextUsed },
			},
		};
	});
}

// Marks every configured spell slot as unused again (does not change the configured max per level). Returns the updated spellbook on success, or null if it couldn't be found/saved.
export function replenishSpellbookSpellSlots(spellbookId) {
	return updateSpellbook(spellbookId, (book) => {
		const existingSlots = book.spellSlots || {};
		const nextSlots = {};
		Object.entries(existingSlots).forEach(([level, slot]) => {
			nextSlots[level] = { max: slot.max, used: (slot.used || []).map(() => false) };
		});
		return { ...book, spellSlots: nextSlots };
	});
}

// Renames a saved spellbook. Returns the updated spellbook on success, or null if it couldn't be found/saved.
export function renameSpellbook(spellbookId, newName) {
	return updateSpellbook(spellbookId, (book) => ({
		...book,
		name: newName,
	}));
}

// Updates the spine and/or font color of a saved spellbook. Returns the updated spellbook on success, or null if it couldn't be found/saved.
export function setSpellbookColors(spellbookId, { spineColor, fontColor } = {}) {
	return updateSpellbook(spellbookId, (book) => ({
		...book,
		...(spineColor ? { spineColor } : {}),
		...(fontColor ? { fontColor } : {}),
	}));
}

// Updates which optional sections (Pinned, Ritual) are shown for a saved spellbook. Returns the updated spellbook on success, or null if it couldn't be found/saved.
export function setSpellbookSectionSettings(spellbookId, { showPinnedSection, showRitualSection } = {}) {
	return updateSpellbook(spellbookId, (book) => ({
		...book,
		...(showPinnedSection !== undefined ? { showPinnedSection } : {}),
		...(showRitualSection !== undefined ? { showRitualSection } : {}),
	}));
}

// Adds spells to an existing spellbook, skipping any spell already present. Returns the updated spellbook on success, or null if it couldn't be found/saved.
export function addSpellsToSpellbook(spellbookId, spellsToAdd) {
	return updateSpellbook(spellbookId, (book) => {
		const existingSpells = book.spells || [];
		const existingSpellIds = new Set(existingSpells.map((spell) => spell.id));
		const newSpells = (spellsToAdd || []).filter((spell) => !existingSpellIds.has(spell.id));
		return {
			...book,
			spells: [...existingSpells, ...newSpells],
		};
	});
}

// Removes a single spell from a saved spellbook. Returns the updated spellbook on success, or null if it couldn't be found/saved.
export function removeSpellFromSpellbook(spellbookId, spellId) {
	return updateSpellbook(spellbookId, (book) => ({
		...book,
		spells: (book.spells || []).filter((spell) => spell.id !== spellId),
	}));
}

// Deletes a saved spellbook. Returns true on success, false if it couldn't be found/saved.
export function deleteSpellbook(spellbookId) {
	try {
		const existingSpellbooks = getSavedSpellbooks();
		const updatedSpellbooks = existingSpellbooks.filter((book) => book.id !== spellbookId);
		if (updatedSpellbooks.length === existingSpellbooks.length) {
			return false;
		}
		localStorage.setItem(SPELLBOOKS_STORAGE_KEY, JSON.stringify(updatedSpellbooks));
		return true;
	} catch (error) {
		console.error("Error deleting spellbook:", error);
		return false;
	}
}
