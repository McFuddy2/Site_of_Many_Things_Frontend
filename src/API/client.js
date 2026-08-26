// Shared fetch wrapper for the accounts API.
//
// Responsibilities:
//  - resolve the API base URL (same convention as the existing spell/session APIs)
//  - send credentials so the httpOnly refresh cookie travels with every request
//  - attach the in-memory access token
//  - on a 401, refresh once and retry the original request
//  - collapse concurrent 401s into a single refresh rather than a stampede
//
// No secrets belong in VITE_ variables — they are compiled into the public
// bundle. Only the API base URL is read here.

import { ApiError, ERROR_CODES, toApiError } from "./errors";
import { clearSession, getAccessToken, setAccessToken } from "../auth/session";

const isDev = import.meta.env.DEV;
const devApiBaseUrl = import.meta.env.VITE_DEV_API_BASE_URL || "";
const prodApiBaseUrl = import.meta.env.VITE_API_BASE_URL || "https://siteofmanythings-production.up.railway.app";
const API_BASE = isDev ? devApiBaseUrl : prodApiBaseUrl;

export const API_PREFIX = "/api/v1";

// In dev with no explicit API URL we go through Vite's /api proxy, which makes
// requests same-origin. Note that this differs from production, where the API is
// cross-site and the refresh cookie needs SameSite=None; Secure to survive.
export const API_ROOT = isDev && !devApiBaseUrl ? API_PREFIX : `${API_BASE}${API_PREFIX}`;

export const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === "true";

function buildUrl(path, query) {
	const url = `${API_ROOT}${path}`;
	if (!query) {
		return url;
	}
	const params = new URLSearchParams(
		Object.entries(query).filter(([, value]) => value !== undefined && value !== null),
	);
	const queryString = params.toString();
	return queryString ? `${url}?${queryString}` : url;
}

let refreshPromise = null;

async function performRefresh() {
	try {
		const response = await fetch(buildUrl("/auth/refresh"), {
			method: "POST",
			credentials: "include",
		});
		if (!response.ok) {
			return null;
		}
		const body = await response.json();
		const nextToken = body?.access_token ?? null;
		setAccessToken(nextToken);
		return nextToken;
	} catch {
		return null;
	}
}

// Concurrent callers all await the same in-flight refresh.
function refreshAccessToken() {
	if (!refreshPromise) {
		refreshPromise = performRefresh().finally(() => {
			refreshPromise = null;
		});
	}
	return refreshPromise;
}

/**
 * Perform an API request.
 *
 * @param {string} path      Path below /api/v1, e.g. "/spellbooks"
 * @param {object} options
 * @param {string} [options.method]    HTTP method, default GET
 * @param {any}    [options.body]      JSON-serialisable body, or a FormData instance
 * @param {object} [options.query]     Query parameters
 * @param {boolean}[options.skipAuth]  Public endpoint: don't attach a token, and
 *                                     treat a 401 as a real answer rather than an
 *                                     expired session to refresh.
 */
export async function apiFetch(path, options = {}) {
	return requestWithRetry(path, options, true);
}

async function requestWithRetry(path, options, mayRetry) {
	const { method = "GET", body, query, skipAuth = false, headers = {} } = options;

	const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
	const requestHeaders = { ...headers };

	if (body !== undefined && !isFormData) {
		requestHeaders["Content-Type"] = "application/json";
	}

	const token = getAccessToken();
	if (!skipAuth && token) {
		requestHeaders.Authorization = `Bearer ${token}`;
	}

	let response;
	try {
		response = await fetch(buildUrl(path, query), {
			method,
			credentials: "include",
			headers: requestHeaders,
			body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
		});
	} catch {
		throw new ApiError({ code: ERROR_CODES.NETWORK_ERROR });
	}

	if (response.status === 401 && !skipAuth && mayRetry) {
		const nextToken = await refreshAccessToken();
		if (nextToken) {
			return requestWithRetry(path, options, false);
		}
		clearSession();
		throw new ApiError({ code: ERROR_CODES.SESSION_EXPIRED, status: 401 });
	}

	if (!response.ok) {
		throw await toApiError(response);
	}

	if (response.status === 204) {
		return null;
	}

	try {
		return await response.json();
	} catch {
		return null;
	}
}
