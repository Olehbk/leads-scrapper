import { useEffect, useCallback } from 'react';
import { leadsApi } from '../api/leadsApi';
import { useLeadsStore } from '../store/leadsStore';

export function useLeads() {
  const {
    filters, activeTab, activeSource, newSince,
    setLeads, setLoading, setError, updateLeadLocally,
  } = useLeadsStore();

  const loadLeads = useCallback(async () => {
    // These tabs fetch their own data independently
    if (activeTab === 'database' || activeTab === 'analysis' || activeTab === 'info') return;

    // New tab with no scrape yet for this source — nothing to show
    if (activeTab === 'new' && !newSince[activeSource]) {
      setLeads([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const params = { source: activeSource };
      if (filters.tier) params.tier = filters.tier;
      if (filters.subreddit) params.subreddit = filters.subreddit;
      if (filters.contacted !== '') params.contacted = filters.contacted;
      if (filters.search) params.search = filters.search;
      if (activeTab === 'new' && newSince[activeSource]) params.since = newSince[activeSource];

      const data = await leadsApi.getLeads(params);
      setLeads(data.leads);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters, activeTab, activeSource, newSince, setLeads, setLoading, setError]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  // Poll every 30 seconds
  useEffect(() => {
    const interval = setInterval(loadLeads, 30000);
    return () => clearInterval(interval);
  }, [loadLeads]);

  const markContacted = useCallback(async (id) => {
    updateLeadLocally(id, { contacted: 1 });
    await leadsApi.updateLead(id, { contacted: true });
  }, [updateLeadLocally]);

  const updateNotes = useCallback(async (id, notes) => {
    updateLeadLocally(id, { notes });
    await leadsApi.updateLead(id, { notes });
  }, [updateLeadLocally]);

  const overrideTier = useCallback(async (id, tier) => {
    updateLeadLocally(id, { tier });
    await leadsApi.updateLead(id, { tier });
  }, [updateLeadLocally]);

  return { loadLeads, markContacted, updateNotes, overrideTier };
}
