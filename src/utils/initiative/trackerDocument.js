// Bundles the Initiative Tracker's twelve legacy localStorage keys into the
// single { id, name, data } document shape the API contract expects.
//
// The tracker has always been an implicit singleton spread across separate keys.
// Reading presents those keys as a one-item collection so the storage layer can
// treat local and backend trackers identically; writing fans the document back
// out to the same keys, so a Guest's data stays exactly where it has always been
// and nothing breaks if this feature is rolled back.
//
// Deliberately excluded: `initiative_own_data` and `session_hosting_code`. Those
// are live-session scratch state (a snapshot to restore after leaving a shared
// session, and the join code), not saved tracker content, and they should not
// travel to another device.

import { createDefaultTrackerData, DEFAULT_CONDITION_COLORS, DEFAULT_CONDITION_DESCRIPTIONS } from "./defaults";
import { readJson, writeJson, removeKeys } from "../../storage/localStore";

export const TRACKER_META_KEY = "initiative_tracker_meta_v1";

// document field -> legacy localStorage key
export const TRACKER_FIELD_KEYS = {
	rowData: "row-data",
	round: "round",
	rowVisibility: "row-visibility",
	overlayActive: "overlay-active",
	shiftedRowIndex: "shifted-row-index",
	customConditions: "custom-conditions",
	conditionColors: "condition-colors",
	conditionDescriptions: "condition-descriptions-v2",
	showArmorClass: "show-armor-class",
	showHitPoints: "show-hit-points",
};

export const TRACKER_LEGACY_KEYS = Object.values(TRACKER_FIELD_KEYS);
export const TRACKER_ALL_KEYS = [...TRACKER_LEGACY_KEYS, TRACKER_META_KEY];

export const DEFAULT_TRACKER_NAME = "My Tracker";

function createTrackerId() {
	return `initiative-tracker-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function readMeta() {
	const meta = readJson(TRACKER_META_KEY, null);
	if (meta && typeof meta === "object" && meta.id) {
		return meta;
	}
	const now = new Date().toISOString();
	return { id: createTrackerId(), name: DEFAULT_TRACKER_NAME, created_at: now, updated_at: now };
}

// True when any legacy key holds data — i.e. this browser has a tracker worth
// migrating, as opposed to a first-time visitor with nothing stored.
export function hasStoredTrackerData() {
	return TRACKER_LEGACY_KEYS.some((key) => {
		try {
			return localStorage.getItem(key) !== null;
		} catch {
			return false;
		}
	});
}

// Reads the twelve keys into one document body, falling back per-field so a
// partially-populated browser still produces a complete, valid tracker.
export function readTrackerData() {
	const defaults = createDefaultTrackerData();
	const data = {};

	Object.entries(TRACKER_FIELD_KEYS).forEach(([field, key]) => {
		data[field] = readJson(key, defaults[field]);
	});

	// Condition colours and descriptions are merged over the defaults rather than
	// replaced, so conditions added to the app after a user last saved still get
	// their built-in colour and text instead of coming back undefined.
	data.conditionColors = { ...DEFAULT_CONDITION_COLORS, ...(data.conditionColors || {}) };
	data.conditionDescriptions = { ...DEFAULT_CONDITION_DESCRIPTIONS, ...(data.conditionDescriptions || {}) };

	return data;
}

export function writeTrackerData(data) {
	Object.entries(TRACKER_FIELD_KEYS).forEach(([field, key]) => {
		if (data[field] !== undefined) {
			writeJson(key, data[field]);
		}
	});
	return true;
}

export function clearTrackerKeys() {
	removeKeys(TRACKER_ALL_KEYS);
}

// Presents the legacy keys as the one-item collection the storage layer expects.
export function createTrackerLocalStore() {
	return {
		keys: TRACKER_ALL_KEYS,
		readAll() {
			if (!hasStoredTrackerData()) {
				return [];
			}
			const meta = readMeta();
			return [{ ...meta, data: readTrackerData() }];
		},
		writeAll(items) {
			if (!items || items.length === 0) {
				clearTrackerKeys();
				return true;
			}
			// The local tracker is a singleton: only the first document is kept.
			// A Trailblazer's extra trackers exist on the backend only, which is
			// consistent with multi-tracker support being out of scope for now.
			const [tracker] = items;
			const now = new Date().toISOString();
			writeJson(TRACKER_META_KEY, {
				id: tracker.id || createTrackerId(),
				name: tracker.name || DEFAULT_TRACKER_NAME,
				created_at: tracker.created_at || now,
				updated_at: now,
			});
			writeTrackerData(tracker.data || {});
			return true;
		},
	};
}
