const SPELL_RATINGS_STORAGE_KEY = "spell_ratings_v1";

export function getStoredSpellRatings() {
	try {
		const raw = localStorage.getItem(SPELL_RATINGS_STORAGE_KEY);
		const parsed = raw ? JSON.parse(raw) : {};
		return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
	} catch (error) {
		console.error("Error reading spell ratings:", error);
		return {};
	}
}

// Sets a spell's rating (1-5). Passing 0 clears the rating. Returns the updated ratings map.
export function saveSpellRating(spellId, rating) {
	try {
		const ratings = getStoredSpellRatings();
		const nextRatings = { ...ratings };
		if (rating > 0) {
			nextRatings[spellId] = rating;
		} else {
			delete nextRatings[spellId];
		}
		localStorage.setItem(SPELL_RATINGS_STORAGE_KEY, JSON.stringify(nextRatings));
		return nextRatings;
	} catch (error) {
		console.error("Error saving spell rating:", error);
		return getStoredSpellRatings();
	}
}
