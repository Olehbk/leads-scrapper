import { useLeadsStore } from '../store/leadsStore';

const SUBREDDITS = [
  'startups', 'SaaS', 'smallbusiness', 'Entrepreneur', 'webdev',
  'nextjs', 'reactjs', 'indiehackers', 'forhire', 'slavelabour',
];

export function FilterBar() {
  const { filters, setFilter, resetFilters, activeSource } = useLeadsStore();
  const hasFilters = Object.values(filters).some(v => v !== '');

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Search */}
      <input
        type="text"
        placeholder="Search leads..."
        value={filters.search}
        onChange={e => setFilter('search', e.target.value)}
        className="bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 w-48"
      />

      {/* Tier filter */}
      <select
        value={filters.tier}
        onChange={e => setFilter('tier', e.target.value)}
        className="bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-sm text-zinc-300 focus:outline-none focus:border-zinc-600"
      >
        <option value="">All tiers</option>
        <option value="1">Tier 1 — Hot</option>
        <option value="2">Tier 2 — Warm</option>
        <option value="3">Tier 3 — Cold</option>
        <option value="unqualified">Unqualified</option>
      </select>

      {/* Subreddit filter — Reddit only */}
      {activeSource === 'reddit' && (
        <select
          value={filters.subreddit}
          onChange={e => setFilter('subreddit', e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-sm text-zinc-300 focus:outline-none focus:border-zinc-600"
        >
          <option value="">All subreddits</option>
          {SUBREDDITS.map(s => (
            <option key={s} value={s}>r/{s}</option>
          ))}
        </select>
      )}

      {/* Contacted filter */}
      <select
        value={filters.contacted}
        onChange={e => setFilter('contacted', e.target.value)}
        className="bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-sm text-zinc-300 focus:outline-none focus:border-zinc-600"
      >
        <option value="">Any status</option>
        <option value="false">Not contacted</option>
        <option value="true">Contacted</option>
      </select>

      {/* Reset */}
      {hasFilters && (
        <button
          onClick={resetFilters}
          className="text-xs text-zinc-500 hover:text-zinc-300"
        >
          Reset filters
        </button>
      )}
    </div>
  );
}
