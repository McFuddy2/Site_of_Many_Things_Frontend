// Auth and user endpoints from the §3 contract.
//
// Each function dispatches to the mock implementation when VITE_USE_MOCK_API is
// set, so the UI can be built and exercised before the backend exists. The two
// paths return identical shapes.
//
// Public endpoints pass skipAuth so that a 401 is treated as a real answer
// ("wrong password") rather than an expired session to silently refresh.

import { apiFetch, API_ROOT, USE_MOCK_API } from "./client";
import { mockAuth } from "./mockAuth";

export const VERIFY_ROUTE = "/verify";
export const RESET_PASSWORD_ROUTE = "/reset-password";

export async function checkUsernameAvailable(username) {
	if (USE_MOCK_API) {
		return mockAuth.usernameAvailable(username);
	}
	return apiFetch("/auth/username-available", { query: { username }, skipAuth: true });
}

export async function register({ username, email, password }) {
	if (USE_MOCK_API) {
		return mockAuth.register({ username, email, password });
	}
	return apiFetch("/auth/register", { method: "POST", body: { username, email, password }, skipAuth: true });
}

export async function login({ email, password }) {
	if (USE_MOCK_API) {
		return mockAuth.login({ email, password });
	}
	return apiFetch("/auth/login", { method: "POST", body: { email, password }, skipAuth: true });
}

export async function logout() {
	if (USE_MOCK_API) {
		return mockAuth.logout();
	}
	return apiFetch("/auth/logout", { method: "POST" });
}

export async function refresh() {
	if (USE_MOCK_API) {
		return mockAuth.refresh();
	}
	return apiFetch("/auth/refresh", { method: "POST", skipAuth: true });
}

// The contract lists no body for this endpoint, which works for a logged-in
// unverified user but not for someone who has just registered and has no session
// yet. The email is sent when we have it; flagged with the backend developer.
export async function resendVerification(email) {
	if (USE_MOCK_API) {
		return mockAuth.resendVerification(email);
	}
	return apiFetch("/auth/verify/resend", {
		method: "POST",
		body: email ? { email } : undefined,
		skipAuth: !!email,
	});
}

// May or may not return a session depending on how the backend implements it.
// Callers must handle both: use the access_token if one comes back, otherwise
// send the user to log in.
export async function verifyEmail(token) {
	if (USE_MOCK_API) {
		return mockAuth.verify({ token });
	}
	return apiFetch("/auth/verify", { method: "POST", body: { token }, skipAuth: true });
}

export async function forgotPassword(email) {
	if (USE_MOCK_API) {
		return mockAuth.forgotPassword({ email });
	}
	return apiFetch("/auth/forgot-password", { method: "POST", body: { email }, skipAuth: true });
}

export async function resetPassword({ token, password }) {
	if (USE_MOCK_API) {
		return mockAuth.resetPassword({ token, password });
	}
	return apiFetch("/auth/reset-password", { method: "POST", body: { token, password }, skipAuth: true });
}

export async function getCurrentUser() {
	if (USE_MOCK_API) {
		return mockAuth.getMe();
	}
	return apiFetch("/users/me");
}

export async function updateCurrentUser({ username }) {
	if (USE_MOCK_API) {
		return mockAuth.updateMe({ username });
	}
	return apiFetch("/users/me", { method: "PATCH", body: { username } });
}

export async function uploadProfilePicture(file) {
	if (USE_MOCK_API) {
		return mockAuth.uploadProfilePicture(file);
	}
	const formData = new FormData();
	formData.append("file", file);
	return apiFetch("/users/me/profile-picture", { method: "POST", body: formData });
}

// Full-page redirect: the backend hands off to Google and brings the user back.
export function startGoogleAuthorize(username) {
	if (USE_MOCK_API) {
		window.location.assign(mockAuth.googleAuthorizeUrl(username));
		return;
	}
	const query = new URLSearchParams({ username }).toString();
	// Absolute, because the API is on a different origin in production.
	window.location.assign(`${API_ROOT}/auth/google/authorize?${query}`);
}
