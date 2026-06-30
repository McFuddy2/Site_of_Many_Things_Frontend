const isDev = import.meta.env.DEV;
const devApiBaseUrl = import.meta.env.VITE_DEV_API_BASE_URL || "";
const prodApiBaseUrl = import.meta.env.VITE_API_BASE_URL || "https://siteofmanythings-production.up.railway.app";
const API_BASE = isDev ? devApiBaseUrl : prodApiBaseUrl;

const SESSION_API = isDev && !devApiBaseUrl ? "/api/v1" : `${API_BASE}/api/v1`;

const WS_BASE = isDev
  ? (devApiBaseUrl ? devApiBaseUrl.replace(/^https?/, 'ws') : 'ws://localhost:8000')
  : prodApiBaseUrl.replace(/^https/, 'wss').replace(/^http(?!s)/, 'ws');

export function sessionWsUrl(code, role = 'joiner') {
  return `${WS_BASE}/api/v1/sessions/${code}/ws?role=${role}`;
}

export async function createSession(data) {
  const res = await fetch(`${SESSION_API}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create session');
  return res.json();
}

export async function getSession(code) {
  const res = await fetch(`${SESSION_API}/sessions/${code.toUpperCase()}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch session');
  return res.json();
}
