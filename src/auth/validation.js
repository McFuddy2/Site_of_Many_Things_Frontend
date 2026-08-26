// Client-side validation for the auth forms.
//
// This exists for immediate feedback while typing. The server is the real check
// in every case — in particular the username availability endpoint is
// authoritative, since only it knows about reserved names and other accounts.

// Password policy from the spec: at least 8 characters, 1 uppercase, 1 number.
export const PASSWORD_RULES = [
	{ id: "length", label: "At least 8 characters", test: (value) => value.length >= 8 },
	{ id: "uppercase", label: "At least 1 uppercase letter", test: (value) => /[A-Z]/.test(value) },
	{ id: "number", label: "At least 1 number", test: (value) => /\d/.test(value) },
];

export function checkPasswordRules(password) {
	const value = password || "";
	return PASSWORD_RULES.map((rule) => ({ ...rule, passed: rule.test(value) }));
}

export function isPasswordValid(password) {
	return checkPasswordRules(password).every((rule) => rule.passed);
}

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;

// Format check only, so we don't fire an availability request for input that
// can't possibly be valid. Returns an error message, or null when the format is
// acceptable and the server should be asked.
export function getUsernameFormatError(username) {
	const value = username || "";
	if (value.length === 0) {
		return null;
	}
	if (value.length < USERNAME_MIN_LENGTH || value.length > USERNAME_MAX_LENGTH) {
		return `Usernames are ${USERNAME_MIN_LENGTH}-${USERNAME_MAX_LENGTH} characters.`;
	}
	if (!/^[a-zA-Z0-9]/.test(value)) {
		return "Usernames must start with a letter or number.";
	}
	if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
		return "Usernames can only use letters, numbers, underscores and hyphens.";
	}
	return null;
}

export function isUsernameFormatValid(username) {
	return Boolean(username) && getUsernameFormatError(username) === null;
}

// Deliberately permissive: the address is confirmed by the verification email,
// so anything stricter only rejects valid addresses.
export function isEmailFormatValid(email) {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || "");
}

// Turns the `reason` from GET /auth/username-available into display copy.
const UNAVAILABLE_REASONS = {
	username_taken: "That username is already taken.",
	username_reserved: "That username isn't available.",
	username_invalid: "That username isn't allowed.",
};

export function getUsernameUnavailableMessage(reason) {
	return UNAVAILABLE_REASONS[reason] || "That username isn't available.";
}
