// Shared "is anything over its limit?" state.
//
// Five places need this answer — both hamburger menus, both Spell Searcher
// links, the View Spellbooks button and the Library gate — so it's computed once
// here rather than each of them hitting storage independently (which for a
// Trailblazer would mean five API calls).
//
// Kept resource-generic: the breadcrumb currently only lights up for spellbooks,
// because that's the only resource where existing users exceed the new limits,
// but nothing here is spellbook-specific.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { subscribeToStorage } from "./index";
import { getOverLimitResources } from "./migration";
import { useAuth } from "../auth/AuthContext";

const OverLimitContext = createContext({ overLimit: [], isOverLimit: () => false, refresh: () => {} });

export function OverLimitProvider({ children }) {
	const { effectiveTier, isBootstrapping } = useAuth();
	const [overLimit, setOverLimit] = useState([]);

	const refresh = useCallback(async () => {
		try {
			setOverLimit(await getOverLimitResources());
		} catch (error) {
			// A failed check shouldn't break the page; it just means no breadcrumb
			// this time round.
			console.error("Could not check profile limits:", error);
			setOverLimit([]);
		}
	}, []);

	useEffect(() => {
		// Wait for the tier to be known — checking as a Guest when the visitor is
		// actually a Trailblazer would flag them over a cap that isn't theirs.
		if (isBootstrapping) return undefined;
		refresh();
		// Recheck whenever data changes, so deleting the last extra book clears
		// the breadcrumb everywhere at once.
		return subscribeToStorage(refresh);
	}, [refresh, isBootstrapping, effectiveTier]);

	const value = useMemo(() => {
		const isOverLimit = (resource) => overLimit.some((entry) => entry.resource === resource);
		return {
			overLimit,
			isOverLimit,
			getOverLimitEntry: (resource) => overLimit.find((entry) => entry.resource === resource) || null,
			hasAnyOverLimit: overLimit.length > 0,
			refresh,
		};
	}, [overLimit, refresh]);

	return <OverLimitContext.Provider value={value}>{children}</OverLimitContext.Provider>;
}

export function useOverLimit() {
	return useContext(OverLimitContext);
}
