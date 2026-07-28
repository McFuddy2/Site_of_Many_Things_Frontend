// localStorage persistence for the Character Sheet tool.
// Follows the same pattern as spellbookStorage.js: versioned key, try/catch around
// every read/write, and success/failure return values instead of thrown errors.

export const CHARACTER_SHEETS_STORAGE_KEY = "character_sheets_v1";

export function getSavedCharacterSheets() {
	try {
		const raw = localStorage.getItem(CHARACTER_SHEETS_STORAGE_KEY);
		const parsed = raw ? JSON.parse(raw) : [];
		return Array.isArray(parsed) ? parsed : [];
	} catch (error) {
		console.error("Error reading saved character sheets:", error);
		return [];
	}
}

// Returns the sheet with the given id, or null if it isn't saved.
export function getCharacterSheet(sheetId) {
	return getSavedCharacterSheets().find((sheet) => sheet.id === sheetId) || null;
}

// Saves a sheet, replacing any saved sheet with the same id (used by autosave).
// Returns true on success, false if storage failed.
export function upsertCharacterSheet(sheet) {
	try {
		const existingSheets = getSavedCharacterSheets();
		const index = existingSheets.findIndex((existing) => existing.id === sheet.id);
		const updatedSheets = [...existingSheets];
		if (index === -1) {
			updatedSheets.push(sheet);
		} else {
			updatedSheets[index] = sheet;
		}
		localStorage.setItem(CHARACTER_SHEETS_STORAGE_KEY, JSON.stringify(updatedSheets));
		return true;
	} catch (error) {
		console.error("Error saving character sheet:", error);
		return false;
	}
}

// Returns the updated sheet on success, or null if it couldn't be found/saved.
export function updateCharacterSheet(sheetId, updater) {
	try {
		const existingSheets = getSavedCharacterSheets();
		const index = existingSheets.findIndex((sheet) => sheet.id === sheetId);
		if (index === -1) {
			return null;
		}

		const updatedSheet = updater(existingSheets[index]);
		const updatedSheets = [...existingSheets];
		updatedSheets[index] = updatedSheet;
		localStorage.setItem(CHARACTER_SHEETS_STORAGE_KEY, JSON.stringify(updatedSheets));
		return updatedSheet;
	} catch (error) {
		console.error("Error updating character sheet:", error);
		return null;
	}
}

// Deletes a saved sheet. Returns true on success, false if it couldn't be found/saved.
export function deleteCharacterSheet(sheetId) {
	try {
		const existingSheets = getSavedCharacterSheets();
		const updatedSheets = existingSheets.filter((sheet) => sheet.id !== sheetId);
		if (updatedSheets.length === existingSheets.length) {
			return false;
		}
		localStorage.setItem(CHARACTER_SHEETS_STORAGE_KEY, JSON.stringify(updatedSheets));
		return true;
	} catch (error) {
		console.error("Error deleting character sheet:", error);
		return false;
	}
}
