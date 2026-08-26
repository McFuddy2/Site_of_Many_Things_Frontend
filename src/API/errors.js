// Normalised API errors and the user-facing copy for each error code.
//
// Raw error objects are never shown to the user. Anything that surfaces an error
// in the UI should call getUserMessage() rather than reading .code itself.

export class ApiError extends Error {
	constructor({ code, status, message, resource, limit, current, retryAfter }) {
		super(message || code || "request_failed");
		this.name = "ApiError";
		this.code = code || "unknown_error";
		this.status = status ?? null;
		this.resource = resource ?? null;
		this.limit = limit ?? null;
		this.current = current ?? null;
		// Seconds to wait before retrying a rate-limited request. Not part of the
		// agreed error shape — read from a `retry_after` field or the standard
		// Retry-After header when present, so the resend button can show a
		// countdown instead of a bare error.
		this.retryAfter = retryAfter ?? null;
	}
}

export const ERROR_CODES = {
	INVALID_CREDENTIALS: "invalid_credentials",
	USERNAME_TAKEN: "username_taken",
	USERNAME_INVALID: "username_invalid",
	NOT_VERIFIED: "not_verified",
	INVALID_TOKEN: "invalid_token",
	RATE_LIMITED: "rate_limited",
	FILE_TOO_LARGE: "file_too_large",
	INVALID_IMAGE: "invalid_image",
	LIMIT_EXCEEDED: "limit_exceeded",
	SESSION_EXPIRED: "session_expired",
	NETWORK_ERROR: "network_error",
	UNKNOWN: "unknown_error",
};

const USER_MESSAGES = {
	invalid_credentials: "That email or password doesn't match an account.",
	username_taken: "That username is already taken.",
	username_invalid: "That username isn't allowed. Use 3-20 letters, numbers, underscores or hyphens, starting with a letter or number.",
	not_verified: "Please verify your email address first. Check your inbox for the link.",
	invalid_token: "That link has expired or has already been used. Please request a new one.",
	rate_limited: "Too many attempts. Please wait a moment and try again.",
	file_too_large: "That image is too large. Please choose one under 5 MB.",
	invalid_image: "That file doesn't look like an image we can use. Try a JPG, PNG, GIF or WebP.",
	limit_exceeded: "You've reached the limit for your profile type.",
	session_expired: "Your session has expired. Please log in again.",
	network_error: "We couldn't reach the server. Check your connection and try again.",
	unknown_error: "Something went wrong. Please try again.",
};

export function getUserMessage(error) {
	if (error instanceof ApiError) {
		return USER_MESSAGES[error.code] || USER_MESSAGES.unknown_error;
	}
	return USER_MESSAGES.unknown_error;
}

// Builds an ApiError from a failed response. Reads the agreed contract shape
// ({ error, resource, limit, current }) and falls back to FastAPI's default
// { detail } so an endpoint that hasn't adopted the shape yet still degrades to
// a sensible generic message rather than throwing while parsing.
export async function toApiError(response) {
	let body = null;
	try {
		body = await response.json();
	} catch {
		body = null;
	}

	const code =
		body?.error ||
		(typeof body?.detail === "string" ? null : body?.detail?.error) ||
		null;

	const headerRetryAfter = Number(response.headers?.get?.("Retry-After"));

	return new ApiError({
		code: code || statusFallbackCode(response.status),
		status: response.status,
		resource: body?.resource ?? body?.detail?.resource ?? null,
		limit: body?.limit ?? body?.detail?.limit ?? null,
		current: body?.current ?? body?.detail?.current ?? null,
		retryAfter:
			body?.retry_after ??
			body?.detail?.retry_after ??
			(Number.isFinite(headerRetryAfter) && headerRetryAfter > 0 ? headerRetryAfter : null),
	});
}

function statusFallbackCode(status) {
	if (status === 401) return ERROR_CODES.INVALID_CREDENTIALS;
	if (status === 409) return ERROR_CODES.LIMIT_EXCEEDED;
	if (status === 413) return ERROR_CODES.FILE_TOO_LARGE;
	if (status === 429) return ERROR_CODES.RATE_LIMITED;
	return ERROR_CODES.UNKNOWN;
}
