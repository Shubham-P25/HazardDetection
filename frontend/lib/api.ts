const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

async function get<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE}${path}`, { cache: 'no-store', credentials: 'include' });
  if (!response.ok) throw new Error(await response.text() || 'Backend request failed');
  return response.json();
}

export const fetchIncidents = (query = '') => get<any>(`/api/incidents${query}`);
export const fetchHistory = (range = '24h') => get<any[]>(`/api/analytics/history?range=${range}`);
export const fetchHistoryField = (params: string) => get<any>(`/api/history?${params}`);
export const fetchCompliance = () => get<import('@/types').ComplianceRecord[]>('/api/analytics/compliance');
export const fetchHazards = (params = '') => get<any>(`/api/analytics/hazards${params}`);
export const fetchHealth = () => get<any>('/api/health');
export const fetchLatest = () => get<any>('/api/sensors/latest');
export const acknowledgeAlert = (id: string) => fetch(`${BASE}/api/incidents/${id}/acknowledge`, { method: 'PATCH', credentials: 'include' }).then((r) => r.json());
export const resolveIncident = (id: string, note: string) => fetch(`${BASE}/api/incidents/${id}/resolve`, {
  method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ note }),
}).then((r) => r.json());
export const exportSheets = (body: object) => fetch(`${BASE}/api/export/sheets`, {
  method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});
