// frontend/tools/initiative/src/API/spell_search/config.js

const API_BASE = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE) {
  throw new Error(
    "VITE_API_BASE_URL is not defined. Copy .env.example to .env.local and set the value."
  );
}

export const SPELL_SEARCH_URL = `${API_BASE}/api/v1`;