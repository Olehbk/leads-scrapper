import { useState, useEffect, useMemo } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { leadsApi } from '../api/leadsApi';

const TIER_STYLES = {
  '1': 'bg-red-500/20 text-red-400 border-red-500/30',
  '2': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  '3': 'bg-zinc-700/50 text-zinc-400 border-zinc-600',
  'unqualified': 'bg-zinc-800 text-zinc-500 border-zinc-700',
};

const TIER_ACTIVE_STYLES = {
  '1': 'bg-red-500/40 text-red-300 border-red-400',
  '2': 'bg-yellow-500/40 text-yellow-300 border-yellow-400',
  '3': 'bg-zinc-600 text-zinc-200 border-zinc-500',
  'unqualified': 'bg-zinc-700 text-zinc-300 border-zinc-500',
};

const TIER_LABELS = { '1': 'Hot', '2': 'Warm', '3': 'Cold', 'unqualified': 'Unqualified' };

const SUBREDDITS = [
  'startups', 'SaaS', 'smallbusiness', 'Entrepreneur',
  'webdev', 'nextjs', 'reactjs', 'indiehackers', 'forhire', 'slavelabour',
];

const COLUMNS = [
  { key: 'tier',        label: 'Tier',      sortable: true,  width: 'w-24' },
  { key: 'title',       label: 'Thread',    sortable: false, width: 'flex-1' },
  { key: 'subreddit',   label: 'Subreddit', sortable: true,  width: 'w-32' },
  { key: 'author',      label: 'Author',    sortable: true,  width: 'w-32' },
  { key: 'contacted',   label: 'Contacted', sortable: true,  width: 'w-28' },
  { key: 'scraped_at',  label: 'Scraped',   sortable: true,  width: 'w-32' },
];

const CONTACTED_CYCLE = ['all', 'yes', 'no'];
const CONTACTED_LABELS = { all: 'Contacted: All', yes: 'Contacted: Yes', no: 'Contacted: No' };
const CONTACTED_STYLES = {
  all: 'border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200',
  yes: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400',
  no: 'border-zinc-600 text-zinc-400 bg-zinc-800',
};

function exportCsv(leads) {
  const headers = ['Tier', 'Title', 'Subreddit', 'Author', 'URL', 'Contacted', 'Scraped At', 'Notes'];
  const rows = leads.map(l => [
    TIER_LABELS[l.tier] || l.tier,
    `"${(l.title || '').replace(/"/g, '""')}"`,
    l.subreddit || '',
    l.author || '',
    l.url || '',
    l.contacted ? 'Yes' : 'No',
    l.scraped_at ? format(new Date(l.scraped_at * 1000), 'yyyy-MM-dd HH:mm') : '',
    `"${(l.notes || '').replace(/"/g, '""')}"`,
  ]);
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `leads-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const DEFAULT_FILTERS = { tiers: [], subreddits: [], contacted: 'all' };

function toggleItem(arr, item) {
  return arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item];
}

export function LeadsDatabase() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState({ key: 'scraped_at', dir: 'desc' });
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  useEffect(() => {
    setLoading(true);
    leadsApi.getLeads({ limit: 10000 })
      .then(d => setLeads(d.leads))
      .finally(() => setLoading(false));
  }, []);

  async function toggleContacted(lead) {
    const next = lead.contacted ? 0 : 1;
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, contacted: next } : l));
    await leadsApi.updateLead(lead.id, { contacted: !!next });
  }

  function cycleContacted() {
    setFilters(f => {
      const idx = CONTACTED_CYCLE.indexOf(f.contacted);
      return { ...f, contacted: CONTACTED_CYCLE[(idx + 1) % CONTACTED_CYCLE.length] };
    });
  }

  function resetFilters() {
    setFilters(DEFAULT_FILTERS);
    setSearch('');
  }

  const hasActiveFilters = filters.tiers.length > 0 || filters.subreddits.length > 0 || filters.contacted !== 'all' || search;

  const filtered = useMemo(() => {
    let rows = leads;

    if (search) {
      const s = search.toLowerCase();
      rows = rows.filter(l =>
        (l.title || '').toLowerCase().includes(s) ||
        (l.subreddit || '').toLowerCase().includes(s) ||
        (l.author || '').toLowerCase().includes(s)
      );
    }

    if (filters.tiers.length > 0) {
      rows = rows.filter(l => filters.tiers.includes(l.tier));
    }

    if (filters.subreddits.length > 0) {
      rows = rows.filter(l => filters.subreddits.includes(l.subreddit));
    }

    if (filters.contacted !== 'all') {
      const want = filters.contacted === 'yes';
      rows = rows.filter(l => !!l.contacted === want);
    }

    rows = [...rows].sort((a, b) => {
      let av = a[sort.key] ?? '';
      let bv = b[sort.key] ?? '';
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return sort.dir === 'asc' ? -1 : 1;
      if (av > bv) return sort.dir === 'asc' ? 1 : -1;
      return 0;
    });

    return rows;
  }, [leads, search, filters, sort]);

  function handleSort(key) {
    setSort(s => s.key === key
      ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' }
      : { key, dir: 'asc' }
    );
  }

  if (loading) {
    return <div className="text-center py-16 text-zinc-500">Loading database...</div>;
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Filters */}
      <div className="flex flex-col gap-2 bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-3">
        {/* Row 1: Tier buttons + Contacted toggle + Reset */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-zinc-500 font-medium w-14 shrink-0">Tier</span>
          {Object.entries(TIER_LABELS).map(([value, label]) => {
            const active = filters.tiers.includes(value);
            return (
              <button
                key={value}
                onClick={() => setFilters(f => ({ ...f, tiers: toggleItem(f.tiers, value) }))}
                className={`px-2.5 py-0.5 rounded text-xs font-medium border transition-colors ${
                  active ? TIER_ACTIVE_STYLES[value] : TIER_STYLES[value] + ' opacity-60 hover:opacity-100'
                }`}
              >
                {label}
              </button>
            );
          })}

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={cycleContacted}
              className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${CONTACTED_STYLES[filters.contacted]}`}
            >
              {CONTACTED_LABELS[filters.contacted]}
            </button>

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="px-3 py-1 rounded text-xs font-medium border border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Subreddit buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-zinc-500 font-medium w-14 shrink-0">Sub</span>
          {SUBREDDITS.map(sub => {
            const active = filters.subreddits.includes(sub);
            return (
              <button
                key={sub}
                onClick={() => setFilters(f => ({ ...f, subreddits: toggleItem(f.subreddits, sub) }))}
                className={`px-2 py-0.5 rounded text-xs border transition-colors ${
                  active
                    ? 'bg-zinc-600 border-zinc-400 text-zinc-100'
                    : 'border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300'
                }`}
              >
                r/{sub}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search + count + export */}
      <div className="flex items-center justify-between gap-3">
        <input
          type="text"
          placeholder="Search all leads..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 w-64"
        />
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-500">{filtered.length} leads</span>
          <button
            onClick={() => exportCsv(filtered)}
            className="px-3 py-1.5 text-xs font-medium border border-zinc-700 text-zinc-400 rounded hover:border-zinc-500 hover:text-zinc-200 transition-colors"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="border border-zinc-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-zinc-900 border-b border-zinc-800">
                {COLUMNS.map(col => (
                  <th
                    key={col.key}
                    onClick={() => col.sortable && handleSort(col.key)}
                    className={`px-3 py-2.5 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide select-none ${col.width} ${col.sortable ? 'cursor-pointer hover:text-zinc-300' : ''}`}
                  >
                    {col.label}
                    {col.sortable && sort.key === col.key && (
                      <span className="ml-1">{sort.dir === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length} className="px-3 py-12 text-center text-zinc-500">
                    No leads found.
                  </td>
                </tr>
              ) : filtered.map((lead, i) => (
                <tr
                  key={lead.id}
                  className={`border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors ${i % 2 === 0 ? '' : 'bg-zinc-900/20'}`}
                >
                  {/* Tier */}
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${TIER_STYLES[lead.tier] || TIER_STYLES['unqualified']}`}>
                      {TIER_LABELS[lead.tier] || 'Unqualified'}
                    </span>
                  </td>

                  {/* Title */}
                  <td className="px-3 py-2.5 max-w-0">
                    <a
                      href={lead.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-200 hover:text-white truncate block leading-snug"
                      title={lead.title}
                    >
                      {lead.title}
                    </a>
                    {lead.tier_reason && (
                      <span className="text-xs text-zinc-600 truncate block">{lead.tier_reason}</span>
                    )}
                  </td>

                  {/* Subreddit */}
                  <td className="px-3 py-2.5 text-zinc-400 text-xs">
                    r/{lead.subreddit}
                  </td>

                  {/* Author */}
                  <td className="px-3 py-2.5 text-zinc-400 text-xs truncate">
                    {lead.author}
                  </td>

                  {/* Contacted */}
                  <td className="px-3 py-2.5">
                    <button
                      onClick={() => toggleContacted(lead)}
                      className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                        lead.contacted
                          ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                          : 'border-zinc-700 text-zinc-600 hover:border-zinc-500 hover:text-zinc-400'
                      }`}
                    >
                      {lead.contacted ? 'Yes' : 'No'}
                    </button>
                  </td>

                  {/* Scraped */}
                  <td className="px-3 py-2.5 text-zinc-500 text-xs whitespace-nowrap">
                    {lead.scraped_at
                      ? formatDistanceToNow(new Date(lead.scraped_at * 1000), { addSuffix: true })
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
