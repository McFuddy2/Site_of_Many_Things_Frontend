import { SPELL_SEARCH_URL } from "./config";
import axios from "axios";
import { apiFetch } from "../client";
import { ERROR_CODES } from "../errors";

export const getSpells = async () => {
  try {
    const response = await axios.get(`${SPELL_SEARCH_URL}/spells?sort=level&order=asc`);
    return response.data;
  } catch (error) {
    console.error("Error fetching spells:", error);
    throw error;
  }
};


// Goes through apiFetch rather than axios so a signed-in user's access token is
// attached: accounts on the backend's FULL_SPELL_ACCESS_EMAILS allowlist get full
// descriptions the same way the owner key does. apiFetch also refreshes an
// expired token and retries, which the backend asks for with a 401.
export const getSpell = async (spellId, ownerKey = "") => {
  const options = {
    headers: ownerKey ? { "x-owner-key": ownerKey } : {},
    timeoutMs: 15000,
  };
  try {
    return await apiFetch(`/spells/${spellId}`, options);
  } catch (error) {
    // The session died and couldn't be renewed. Still show the spell, as a guest.
    if (error?.code === ERROR_CODES.SESSION_EXPIRED) {
      return apiFetch(`/spells/${spellId}`, { ...options, skipAuth: true });
    }
    console.error("Error fetching spell:", error);
    throw error;
  }
};

export const getSources = async () => {
  try {
    const response = await axios.get(`${SPELL_SEARCH_URL}/spells/sources`);
    return response.data;
  } catch (error) {
    console.error("Error fetching sources:", error);
    throw error;
  }
};

export const queryAdvancedSpells = async (query) => {
  try {
    const response = await axios.post(`${SPELL_SEARCH_URL}/spells/query`, query);
    return response.data;
  } catch (error) {
    console.error("Error searching advanced spells:", error);
    throw error;
  }
};
