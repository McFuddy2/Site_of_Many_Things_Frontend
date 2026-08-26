// In-memory session store.
//
// The access token lives here and ONLY here — never in localStorage or
// sessionStorage, both of which are readable by anything injected into the page.
// The refresh token is an httpOnly cookie the frontend cannot see or touch.
//
// This is a plain module (not a React context) so that non-React code — the fetch
// wrapper and the storage layer — can read the current session without being
// passed it. The React context in AuthProvider subscribes to this store and is
// the only thing that should write to it.

import { GUEST_TIER, normalizeTier } from "../config/tiers";

let accessToken = null;
let user = null;

const listeners = new Set();

function notify() {
	listeners.forEach((listener) => {
		try {
			listener();
		} catch (error) {
			console.error("Session listener failed:", error);
		}
	});
}

export function subscribe(listener) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

// Restoring a session is asynchronous (the refresh cookie is httpOnly, so the
// only way to know whether one exists is to ask the server). Until that answer
// arrives the tier is unknown, and anything reading data would wrongly see a
// Guest and read localStorage.
//
// The storage layer awaits this before every call, so feature components can
// load on mount without racing the bootstrap. Guarded by a timeout so a missing
// or broken AuthProvider degrades to "Guest" rather than hanging forever.
const SESSION_READY_TIMEOUT_MS = 8000;

let isSessionReady = false;
let resolveSessionReady;
const sessionReadyPromise = new Promise((resolve) => {
	resolveSessionReady = resolve;
});

const readyTimeoutId = setTimeout(() => {
	if (!isSessionReady) {
		console.warn("Session never finished bootstrapping; treating this visitor as a Guest.");
		markSessionReady();
	}
}, SESSION_READY_TIMEOUT_MS);

export function markSessionReady() {
	if (isSessionReady) return;
	isSessionReady = true;
	clearTimeout(readyTimeoutId);
	resolveSessionReady();
}

// Returns undefined once ready, so the common case costs nothing but a microtask.
export function waitForSessionReady() {
	return isSessionReady ? undefined : sessionReadyPromise;
}

export function getAccessToken() {
	return accessToken;
}

export function setAccessToken(nextAccessToken) {
	accessToken = nextAccessToken ?? null;
	// Deliberately no notify(): a token rotation during a silent refresh doesn't
	// change anything a component renders, and waking every subscriber for it
	// causes needless re-renders mid-request.
}

export function getUser() {
	return user;
}

// The snapshot object is cached so useSyncExternalStore sees a stable reference
// between notifications and doesn't loop.
let snapshot = { user: null, effectiveTier: GUEST_TIER, isAuthenticated: false };

function rebuildSnapshot() {
	snapshot = {
		user,
		effectiveTier: getEffectiveTier(),
		isAuthenticated: Boolean(user),
	};
}

export function getSnapshot() {
	return snapshot;
}

export function setSession({ accessToken: nextAccessToken, user: nextUser }) {
	if (nextAccessToken !== undefined) {
		accessToken = nextAccessToken ?? null;
	}
	if (nextUser !== undefined) {
		user = nextUser ?? null;
	}
	rebuildSnapshot();
	notify();
}

export function clearSession() {
	accessToken = null;
	user = null;
	rebuildSnapshot();
	notify();
}

// The critical rule from the spec: a registered but unverified user is a Guest.
// Every tier decision goes through here, so there is exactly one place that can
// get this wrong. Never infer the tier from "is there a logged-in user".
export function getEffectiveTier() {
	if (!user) {
		return GUEST_TIER;
	}
	return normalizeTier(user.effective_tier);
}

// Whether reads and writes should go to the backend rather than localStorage.
// Guests — including unverified accounts — stay on localStorage.
export function isBackendBacked() {
	return getEffectiveTier() !== GUEST_TIER;
}
