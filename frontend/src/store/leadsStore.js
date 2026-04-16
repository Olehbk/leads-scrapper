import { create } from 'zustand';

export const useLeadsStore = create((set) => ({
  leads: [],
  stats: null,
  isLoading: false,
  error: null,
  activeSource: 'reddit',
  activeTab: 'all',
  // Per-source new lead tracking
  newSince: { reddit: null },
  newCount: { reddit: 0 },
  filters: {
    tier: '',
    subreddit: '',
    contacted: '',
    search: '',
  },

  setActiveSource: source =>
    set({ activeSource: source, activeTab: 'all' }),

  setActiveTab: tab => set({ activeTab: tab }),

  setNewSince: (source, timestamp, count) =>
    set(state => ({
      newSince: { ...state.newSince, [source]: timestamp },
      newCount: { ...state.newCount, [source]: count },
      activeTab: 'new',
    })),

  setFilter: (key, value) =>
    set(state => ({ filters: { ...state.filters, [key]: value } })),

  resetFilters: () =>
    set({ filters: { tier: '', subreddit: '', contacted: '', search: '' } }),

  setLeads: leads => set({ leads }),
  setStats: stats => set({ stats }),
  setLoading: isLoading => set({ isLoading }),
  setError: error => set({ error }),

  updateLeadLocally: (id, fields) =>
    set(state => ({
      leads: state.leads.map(l => (l.id === id ? { ...l, ...fields } : l)),
    })),
}));
