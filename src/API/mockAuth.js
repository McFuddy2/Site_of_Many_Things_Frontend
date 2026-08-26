// In-memory stand-in for the accounts API, enabled with VITE_USE_MOCK_API=true.
//
// Implements the §3 auth and user endpoints so the whole signup -> verify ->
// login -> upload -> logout flow is clickable before the backend exists. It is a
// fake with no security properties whatsoever; it exists only so UI work isn't
// blocked, and it is unreachable unless the env flag is set.
//
// Verification and reset links are printed to the console as full URLs, since
// there is no email to receive them.

import { ApiError, ERROR_CODES } from "./errors";

const MOCK_AUTH_KEY = "__mock_auth_state__";
const MOCK_LATENCY_MS = 220;
const RESEND_COOLDOWN_SECONDS = 30;

// Reserved names the real backend blocks. Mirrored here so the mock rejects the
// same inputs; the server remains authoritative.
const RESERVED_USERNAMES = new Set([
	"admin", "administrator", "mod", "moderator", "support", "help", "staff",
	"system", "root", "owner", "official", "guest", "trailblazer",
	"siteofmanythings", "null", "undefined", "me", "you", "anonymous", "deleted",
]);

function delay() {
	return new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));
}

function readState() {
	try {
		const raw = sessionStorage.getItem(MOCK_AUTH_KEY);
		const parsed = raw ? JSON.parse(raw) : null;
		return parsed || { users: [], sessionUserId: null, verifyTokens: {}, resetTokens: {}, lastResendAt: {} };
	} catch {
		return { users: [], sessionUserId: null, verifyTokens: {}, resetTokens: {}, lastResendAt: {} };
	}
}

function writeState(state) {
	try {
		sessionStorage.setItem(MOCK_AUTH_KEY, JSON.stringify(state));
	} catch (error) {
		console.error("Mock auth state could not be persisted:", error);
	}
}

// Not a security measure — just so this fake never writes a readable password
// anywhere, and nobody mistakes the pattern for something to copy.
function digest(value) {
	let hash = 0;
	for (let i = 0; i < value.length; i += 1) {
		hash = (hash << 5) - hash + value.charCodeAt(i);
		hash |= 0;
	}
	return `mockdigest:${hash}`;
}

function randomToken() {
	return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

function toPublicUser(user) {
	return {
		id: user.id,
		username: user.username,
		email: user.email,
		tier: user.tier,
		is_verified: user.is_verified,
		// The rule that matters: unverified accounts are Guests.
		effective_tier: user.is_verified ? user.tier : "guest",
		profile_picture_url: user.profile_picture_url ?? null,
	};
}

function findByEmail(state, email) {
	return state.users.find((user) => user.email.toLowerCase() === String(email).toLowerCase()) || null;
}

function findByUsername(state, username) {
	return state.users.find((user) => user.username.toLowerCase() === String(username).toLowerCase()) || null;
}

function logLink(label, path) {
	const url = `${window.location.origin}${path}`;
	console.info(`[mock auth] ${label}: ${url}`);
}

export const mockAuth = {
	async usernameAvailable(username) {
		await delay();
		const state = readState();
		const normalized = String(username).toLowerCase();
		if (RESERVED_USERNAMES.has(normalized)) {
			return { available: false, reason: "username_reserved" };
		}
		if (findByUsername(state, username)) {
			return { available: false, reason: "username_taken" };
		}
		return { available: true, reason: null };
	},

	async register({ username, email, password }) {
		await delay();
		const state = readState();
		if (findByUsername(state, username)) {
			throw new ApiError({ code: ERROR_CODES.USERNAME_TAKEN, status: 409 });
		}
		// The real backend returns the same response whether or not the email is
		// already registered, so account existence isn't leaked.
		if (!findByEmail(state, email)) {
			const user = {
				id: randomToken().slice(0, 12),
				username,
				email,
				passwordDigest: digest(password),
				tier: "trailblazer",
				is_verified: false,
				profile_picture_url: null,
			};
			state.users.push(user);
			const token = randomToken();
			state.verifyTokens[token] = user.id;
			writeState(state);
			logLink("verification link", `/verify?token=${token}`);
		}
		return null;
	},

	async login({ email, password }) {
		await delay();
		const state = readState();
		const user = findByEmail(state, email);
		// One generic answer regardless of whether the email exists.
		if (!user || user.passwordDigest !== digest(password)) {
			throw new ApiError({ code: ERROR_CODES.INVALID_CREDENTIALS, status: 401 });
		}
		state.sessionUserId = user.id;
		writeState(state);
		return { access_token: `mock-access-${randomToken().slice(0, 10)}`, user: toPublicUser(user) };
	},

	async logout() {
		await delay();
		const state = readState();
		state.sessionUserId = null;
		writeState(state);
		return null;
	},

	async refresh() {
		await delay();
		const state = readState();
		if (!state.sessionUserId) {
			throw new ApiError({ code: ERROR_CODES.SESSION_EXPIRED, status: 401 });
		}
		return { access_token: `mock-access-${randomToken().slice(0, 10)}` };
	},

	async resendVerification(email) {
		await delay();
		const state = readState();
		// After register the user has no session yet, so the email they just typed
		// is how we identify them. A logged-in unverified user needs no email.
		const user = email
			? findByEmail(state, email)
			: state.users.find((candidate) => candidate.id === state.sessionUserId);
		if (!user) {
			// Same answer either way, so account existence isn't revealed.
			return null;
		}
		const lastSentAt = state.lastResendAt[user.id] || 0;
		const elapsedSeconds = (Date.now() - lastSentAt) / 1000;
		if (elapsedSeconds < RESEND_COOLDOWN_SECONDS) {
			throw new ApiError({
				code: ERROR_CODES.RATE_LIMITED,
				status: 429,
				retryAfter: Math.ceil(RESEND_COOLDOWN_SECONDS - elapsedSeconds),
			});
		}
		const token = randomToken();
		state.verifyTokens[token] = user.id;
		state.lastResendAt[user.id] = Date.now();
		writeState(state);
		logLink("verification link (resent)", `/verify?token=${token}`);
		return null;
	},

	async verify({ token }) {
		await delay();
		const state = readState();
		const userId = state.verifyTokens[token];
		if (!userId) {
			throw new ApiError({ code: ERROR_CODES.INVALID_TOKEN, status: 400 });
		}
		const user = state.users.find((candidate) => candidate.id === userId);
		if (!user) {
			throw new ApiError({ code: ERROR_CODES.INVALID_TOKEN, status: 400 });
		}
		user.is_verified = true;
		// Single use.
		delete state.verifyTokens[token];
		state.sessionUserId = user.id;
		writeState(state);
		// The real endpoint may or may not return a session; the mock returns one so
		// the migration-on-verification path can be exercised end to end.
		return { access_token: `mock-access-${randomToken().slice(0, 10)}`, user: toPublicUser(user) };
	},

	async forgotPassword({ email }) {
		await delay();
		const state = readState();
		const user = findByEmail(state, email);
		if (user) {
			const token = randomToken();
			state.resetTokens[token] = user.id;
			writeState(state);
			logLink("password reset link", `/reset-password?token=${token}`);
		}
		// Always the same answer, so account existence isn't revealed.
		return null;
	},

	async resetPassword({ token, password }) {
		await delay();
		const state = readState();
		const userId = state.resetTokens[token];
		if (!userId) {
			throw new ApiError({ code: ERROR_CODES.INVALID_TOKEN, status: 400 });
		}
		const user = state.users.find((candidate) => candidate.id === userId);
		if (!user) {
			throw new ApiError({ code: ERROR_CODES.INVALID_TOKEN, status: 400 });
		}
		user.passwordDigest = digest(password);
		delete state.resetTokens[token];
		// A password change invalidates the session.
		state.sessionUserId = null;
		writeState(state);
		return null;
	},

	async getMe() {
		await delay();
		const state = readState();
		const user = state.users.find((candidate) => candidate.id === state.sessionUserId);
		if (!user) {
			throw new ApiError({ code: ERROR_CODES.SESSION_EXPIRED, status: 401 });
		}
		return toPublicUser(user);
	},

	async updateMe({ username }) {
		await delay();
		const state = readState();
		const user = state.users.find((candidate) => candidate.id === state.sessionUserId);
		if (!user) {
			throw new ApiError({ code: ERROR_CODES.SESSION_EXPIRED, status: 401 });
		}
		const existing = findByUsername(state, username);
		if (existing && existing.id !== user.id) {
			throw new ApiError({ code: ERROR_CODES.USERNAME_TAKEN, status: 409 });
		}
		user.username = username;
		writeState(state);
		return toPublicUser(user);
	},

	async uploadProfilePicture(file) {
		await delay();
		const state = readState();
		const user = state.users.find((candidate) => candidate.id === state.sessionUserId);
		if (!user) {
			throw new ApiError({ code: ERROR_CODES.SESSION_EXPIRED, status: 401 });
		}
		if (!user.is_verified) {
			throw new ApiError({ code: ERROR_CODES.NOT_VERIFIED, status: 403 });
		}
		if (!file.type.startsWith("image/")) {
			throw new ApiError({ code: ERROR_CODES.INVALID_IMAGE, status: 400 });
		}
		const dataUrl = await new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(reader.result);
			reader.onerror = () => reject(new ApiError({ code: ERROR_CODES.INVALID_IMAGE, status: 400 }));
			reader.readAsDataURL(file);
		});
		user.profile_picture_url = dataUrl;
		writeState(state);
		return { profile_picture_url: dataUrl };
	},

	googleAuthorizeUrl(username) {
		// There is no Google to redirect to in mock mode. Create the account
		// straight away as a verified Google user and land on the profile page.
		const state = readState();
		let user = findByUsername(state, username);
		if (!user) {
			user = {
				id: randomToken().slice(0, 12),
				username,
				email: `${username}@mock-google.test`,
				passwordDigest: null,
				tier: "trailblazer",
				is_verified: true,
				profile_picture_url: null,
			};
			state.users.push(user);
		}
		state.sessionUserId = user.id;
		writeState(state);
		return "/profile?mock_google=1";
	},
};

export function resetMockAuthState() {
	try {
		sessionStorage.removeItem(MOCK_AUTH_KEY);
	} catch {
		// A browser that won't let us clear it also won't have let us set it.
	}
}
