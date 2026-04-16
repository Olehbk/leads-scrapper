const BASE = '/api';

async function fetchJson(url, options = {}) {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

export const leadsApi = {
  getLeads: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
    ).toString();
    return fetchJson(`/leads${qs ? `?${qs}` : ''}`);
  },

  updateLead: (id, fields) =>
    fetchJson(`/leads/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(fields),
    }),

  getStats: (source) => {
    const qs = source ? `?source=${source}` : '';
    return fetchJson(`/stats${qs}`);
  },

  triggerScrape: (source = 'reddit', options = {}) =>
    fetchJson('/scrape/run', {
      method: 'POST',
      body: JSON.stringify({ source, ...options }),
    }),

  getScrapeRuns: () => fetchJson('/scrape/runs'),

  getScrapeStatus: () => fetchJson('/scrape/status'),

  requalify: (source = null) =>
    fetchJson('/scrape/requalify', {
      method: 'POST',
      body: JSON.stringify(source ? { source } : {}),
    }),

  purgeUnqualified: () =>
    fetchJson('/scrape/unqualified', { method: 'DELETE' }),

  getInfo: () => fetchJson('/info'),

  enrichProfiles: () => fetchJson('/info/enrich', { method: 'POST' }),

  getAnalysis: ({ source, minScore } = {}) => {
    const params = new URLSearchParams(
      Object.entries({ source, minScore }).filter(([, v]) => v !== undefined && v !== '')
    ).toString();
    return fetchJson(`/analysis${params ? `?${params}` : ''}`);
  },
};
