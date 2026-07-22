import { SPELL_SEARCH_URL } from "./config";
import axios from "axios";

export const getSpells = async () => {
  try {
    const response = await axios.get(`${SPELL_SEARCH_URL}/spells?sort=level&order=asc`);
    return response.data;
  } catch (error) {
    console.error("Error fetching spells:", error);
    throw error;
  }
};


export const getSpell = async (spellId, ownerKey = "") => {
  try {
    const headers = {};
    if (ownerKey) {
      headers["x-owner-key"] = ownerKey;
    }
    const response = await axios.get(`${SPELL_SEARCH_URL}/spells/${spellId}`, { headers, timeout: 15000 });
    return response.data;
  } catch (error) {
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
