// B5: Use Bearer token in Authorization header; do not rely on cookies across ports
const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

// Token getter registered by Providers
let _getToken: (() => Promise<string | null>) | null = null;
export function setTokenGetter(fn: () => Promise<string | null>) { _getToken = fn; }

async function authHeaders(): Promise<HeadersInit> {
  if (!_getToken) return {};
  const token = await _getToken().catch(() => null);
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

async function get<T>(path: string): Promise<T> {
  const headers = await authHeaders();
  const response = await fetch(`${BASE}${path}`, { cache: 'no-store', headers });
  if (!response.ok) throw new Error(await response.text() || 'Backend request failed');
  return response.json();
}

async function patch(path: string, body: object): Promise<Response> {
  const headers = { ...(await authHeaders()), 'Content-Type': 'application/json' };
  return fetch(`${BASE}${path}`, { method: 'PATCH', headers, body: JSON.stringify(body) });
}

export const fetchIncidents = (query = '') => get<any>(`/api/incidents${query}`);
export const fetchHistory = (range = '24h') => get<any[]>(`/api/analytics/history?range=${range}`);
export const fetchHistoryField = (params: string) => get<any>(`/api/history?${params}`);
export const fetchHistoryBatched = (params: string) => get<any>(`/api/analytics/history?${params}`);
export const fetchCompliance = () => get<import('@/types').ComplianceRecord[]>('/api/analytics/compliance');
export const fetchHazards = (params = '') => get<any>(`/api/analytics/hazards${params}`);
export const fetchHealth = () => get<any>('/api/health');
export const fetchLatest = () => get<any>('/api/sensors/latest');
export const fetchMe = () => get<any>('/api/me');

export const acknowledgeAlert = async (id: string) => {
  const headers = { ...(await authHeaders()) };
  const r = await fetch(`${BASE}/api/incidents/${id}/acknowledge`, { method: 'PATCH', headers });
  if (!r.ok) throw new Error(await r.text() || 'Request failed');
  return r.json();
};

export const resolveIncident = async (id: string, note: string) => {
  const headers = { ...(await authHeaders()), 'Content-Type': 'application/json' };
  const r = await fetch(`${BASE}/api/incidents/${id}/resolve`, { method: 'PATCH', headers, body: JSON.stringify({ note }) });
  if (!r.ok) throw new Error(await r.text() || 'Request failed');
  return r.json();
};

export const updateMe = (body: object) => patch('/api/me', body);

export const exportSheets = async (body: object) => {
  const headers = { ...(await authHeaders()), 'Content-Type': 'application/json' };
  return fetch(`${BASE}/api/analytics/export/sheets`, { method: 'POST', headers, body: JSON.stringify(body) });
};
