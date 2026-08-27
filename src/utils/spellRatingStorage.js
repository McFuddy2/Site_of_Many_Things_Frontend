// Spell rating persistence.
//
// Ratings are a map of spell id -> 1-5 stars. They stay on the device for every
// tier — there is no ratings endpoint, and the feature is being reworked into
// personal + community ratings — but they still go through the storage layer
// rather than touching localStorage directly, so the day that endpoint arrives
// only the resource descriptor changes. See RESOURCES.spellRatings.

import { storage } from "../storage";
import { SPELL_RATINGS_STORAGE_KEY } from "../storage/resources";
import { getEffectiveTier } from "../auth/session";
import { hasFeature } from "../config/tiers";

export { SPELL_RATINGS_STORAGE_KEY };

export async function getStoredSpellRatings() {
	try {
		const ratings = await storage.spellRatings.get();
		return ratings && typeof ratings === "object" && !Array.isArray(ratings) ? ratings : {};
	} catch (error) {
		console.error("Error reading spell ratings:", error);
		return {};
	}
}

// Star ratings are a tier perk. The UI gates this too, but the check lives here
// as well so no path can write ratings for a profile type that can't have them.
export function canRateSpells(tier = getEffectiveTier()) {
	return hasFeature(tier, "spellRatings");
}

// Sets a spell's rating (1-5). Passing 0 clears the rating. Returns the updated ratings map.
export async function saveSpellRating(spellId, rating) {
	if (!canRateSpells()) {
		return getStoredSpellRatings();
	}
	try {
		const ratings = await getStoredSpellRatings();
		const nextRatings = { ...ratings };
		if (rating > 0) {
			nextRatings[spellId] = rating;
		} else {
			delete nextRatings[spellId];
		}
		await storage.spellRatings.save(nextRatings);
		return nextRatings;
	} catch (error) {
		console.error("Error saving spell rating:", error);
		return getStoredSpellRatings();
	}
}
