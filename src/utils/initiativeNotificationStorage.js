const NOTIFICATION_SETTINGS_STORAGE_KEY = "initiative_notification_settings_v1";
const NOTIFICATION_MODE_STORAGE_KEY = "initiative_notification_mode_v1";

// Settings map shape: { [rowIndex]: { notifyPrior: boolean, notifySelf: boolean } }
// Entries are only kept when at least one of the two flags is true.
export function getStoredNotificationSettings() {
	try {
		const raw = localStorage.getItem(NOTIFICATION_SETTINGS_STORAGE_KEY);
		const parsed = raw ? JSON.parse(raw) : {};
		return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
	} catch (error) {
		console.error("Error reading initiative notification settings:", error);
		return {};
	}
}

export function saveNotificationSettings(settings) {
	try {
		localStorage.setItem(NOTIFICATION_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
	} catch (error) {
		console.error("Error saving initiative notification settings:", error);
	}
	return settings;
}

export function getStoredNotificationMode() {
	try {
		const raw = localStorage.getItem(NOTIFICATION_MODE_STORAGE_KEY);
		return raw === "desktop" ? "desktop" : "onscreen";
	} catch (error) {
		console.error("Error reading initiative notification mode:", error);
		return "onscreen";
	}
}

export function saveNotificationMode(mode) {
	try {
		localStorage.setItem(NOTIFICATION_MODE_STORAGE_KEY, mode === "desktop" ? "desktop" : "onscreen");
	} catch (error) {
		console.error("Error saving initiative notification mode:", error);
	}
}
