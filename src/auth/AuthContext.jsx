// React binding for the session store.
//
// The store in session.js is the source of truth; this provider subscribes to it
// and exposes the actions that write to it. Components read `effectiveTier` from
// here — never "is there a user" — so an unverified account is correctly treated
// as a Guest everywhere.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import * as authApi from "../API/auth";
import { clearSession, getSnapshot, markSessionReady, setAccessToken, setSession, subscribe } from "./session";
import { GUEST_TIER } from "../config/tiers";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
	const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
	// True until the initial "am I already logged in?" check finishes, so the UI
	// doesn't flash the Guest state for a returning user with a valid cookie.
	const [isBootstrapping, setIsBootstrapping] = useState(true);

	useEffect(() => {
		let isStale = false;

		(async () => {
			try {
				// The refresh cookie is httpOnly, so the only way to find out whether
				// a session exists is to ask.
				const refreshed = await authApi.refresh();
				if (isStale) return;
				setAccessToken(refreshed?.access_token ?? null);

				const user = await authApi.getCurrentUser();
				if (isStale) return;
				setSession({ accessToken: refreshed?.access_token ?? null, user });
			} catch {
				// No session, or it has expired. Staying a Guest is the correct
				// outcome, not an error worth surfacing.
				if (!isStale) {
					clearSession();
				}
			} finally {
				if (!isStale) {
					// Releases the storage layer, which holds every read and write
					// until the tier is known.
					markSessionReady();
					setIsBootstrapping(false);
				}
			}
		})();

		return () => {
			isStale = true;
		};
	}, []);

	const signIn = useCallback(async ({ email, password }) => {
		const result = await authApi.login({ email, password });
		setSession({ accessToken: result?.access_token ?? null, user: result?.user ?? null });
		return result?.user ?? null;
	}, []);

	const signOut = useCallback(async () => {
		try {
			await authApi.logout();
		} catch (error) {
			// Even if the server call fails, drop the local session — the user asked
			// to be logged out and the access token is only held in memory.
			console.error("Logout request failed:", error);
		}
		clearSession();
	}, []);

	const signUp = useCallback(async ({ username, email, password }) => {
		await authApi.register({ username, email, password });
	}, []);

	// Applies whatever POST /auth/verify returned. If it carried a session, the
	// user is logged in from here; if it didn't, they stay a Guest and the
	// verification page sends them to log in.
	const applyVerificationResult = useCallback(async (result) => {
		if (result?.access_token) {
			setAccessToken(result.access_token);
			const user = result.user ?? (await authApi.getCurrentUser());
			setSession({ accessToken: result.access_token, user });
			return user;
		}
		return null;
	}, []);

	// Re-reads the user after something changes it server-side (a new profile
	// picture, a username change, or verification completing elsewhere).
	const refreshUser = useCallback(async () => {
		const user = await authApi.getCurrentUser();
		setSession({ user });
		return user;
	}, []);

	const updateUser = useCallback((partialUser) => {
		setSession({ user: { ...getSnapshot().user, ...partialUser } });
	}, []);

	const value = useMemo(
		() => ({
			user: snapshot.user,
			effectiveTier: snapshot.effectiveTier,
			isAuthenticated: snapshot.isAuthenticated,
			// Logged in but not yet verified: a Guest by tier, but they do have a
			// session, so the UI greets them by name and offers a resend prompt.
			isUnverified: snapshot.isAuthenticated && snapshot.effectiveTier === GUEST_TIER,
			isBootstrapping,
			signIn,
			signOut,
			signUp,
			refreshUser,
			updateUser,
			applyVerificationResult,
		}),
		[snapshot, isBootstrapping, signIn, signOut, signUp, refreshUser, updateUser, applyVerificationResult],
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error("useAuth must be used inside an AuthProvider");
	}
	return context;
}
