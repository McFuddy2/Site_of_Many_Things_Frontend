// Profile tier configuration.
//
// TIER_LIMITS is the single source of truth for what each profile type may hold.
// Nothing else in the frontend should contain a bare limit literal — import from
// here instead. These checks exist for UI feedback only; the backend enforces the
// real limits and can still answer any write with `409 limit_exceeded`.

export const GUEST_TIER = "guest";
export const TRAILBLAZER_TIER = "trailblazer";

export const TIER_LIMITS = {
	guest: { initiativeTrackers: 1, spellbooks: 1, combatManagers: 1, customProfilePicture: false, spellRatings: false },
	trailblazer: { initiativeTrackers: 3, spellbooks: 8, combatManagers: 3, customProfilePicture: true, spellRatings: true },
};

export const TIER_LABELS = {
	guest: "Guest",
	trailblazer: "Trailblazer",
};

// Facts about a tier that aren't caps — kept out of TIER_LIMITS so that object
// stays exactly the agreed shape, but still available to the comparison UI.
export const TIER_DESCRIPTORS = {
	guest: {
		storage: "Saved in this browser only",
		cost: "Free, no account needed",
	},
	trailblazer: {
		storage: "Saved to your account, on every device",
		cost: "Free, requires an account",
	},
};

// Display names for each countable resource in TIER_LIMITS.
const RESOURCE_LABELS = {
	initiativeTrackers: { singular: "Initiative Tracker", plural: "Initiative Trackers" },
	spellbooks: { singular: "Spell Book", plural: "Spell Books" },
	combatManagers: { singular: "Combat Manager", plural: "Combat Managers" },
};

// Display text for each boolean perk in TIER_LIMITS.
const FLAG_LABELS = {
	customProfilePicture: { enabled: "Custom profile picture", disabled: "No custom profile picture" },
	spellRatings: { enabled: "Rate spells with star ratings", disabled: "No spell star ratings" },
};

export function isKnownTier(tier) {
	return Object.prototype.hasOwnProperty.call(TIER_LIMITS, tier);
}

// Anything unrecognised is treated as a Guest — the least-privileged tier.
export function normalizeTier(tier) {
	return isKnownTier(tier) ? tier : GUEST_TIER;
}

export function getTierLabel(tier) {
	return TIER_LABELS[normalizeTier(tier)];
}

export function getTierLimits(tier) {
	return TIER_LIMITS[normalizeTier(tier)];
}

// Returns the numeric cap for a countable resource, or null when the resource
// isn't capped by this tier config.
export function getResourceLimit(tier, resource) {
	const limit = getTierLimits(tier)[resource];
	return typeof limit === "number" ? limit : null;
}

export function getResourceLabel(resource, count = 2) {
	const label = RESOURCE_LABELS[resource];
	if (!label) {
		return resource;
	}
	return count === 1 ? label.singular : label.plural;
}

// Whether a boolean perk (customProfilePicture, spellRatings) is on for a tier.
export function hasFeature(tier, feature) {
	return getTierLimits(tier)[feature] === true;
}

export function isWithinLimit(tier, resource, currentCount) {
	const limit = getResourceLimit(tier, resource);
	return limit === null || currentCount < limit;
}

// Builds the bulleted perk list shown on the Profile page and in the tier
// comparison, derived from TIER_LIMITS rather than written out by hand.
export function getTierPerks(tier) {
	const normalizedTier = normalizeTier(tier);
	const limits = getTierLimits(normalizedTier);
	const perks = [];

	Object.entries(limits).forEach(([key, value]) => {
		if (typeof value === "number") {
			perks.push(`${value} ${getResourceLabel(key, value)}`);
			return;
		}
		const flagLabel = FLAG_LABELS[key];
		if (flagLabel) {
			perks.push(value ? flagLabel.enabled : flagLabel.disabled);
		}
	});

	const descriptor = TIER_DESCRIPTORS[normalizedTier];
	if (descriptor) {
		perks.push(descriptor.storage);
	}

	return perks;
}
