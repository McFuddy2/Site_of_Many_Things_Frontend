const isDev = import.meta.env.DEV;
const devApiBaseUrl = import.meta.env.VITE_DEV_API_BASE_URL || "";
const prodApiBaseUrl = import.meta.env.VITE_API_BASE_URL || "https://api.thesiteofmanythings.com";

const API_BASE = isDev ? devApiBaseUrl : prodApiBaseUrl;

export const SPELL_SEARCH_URL = isDev && !devApiBaseUrl ? "/api/v1" : `${API_BASE}/api/v1`;