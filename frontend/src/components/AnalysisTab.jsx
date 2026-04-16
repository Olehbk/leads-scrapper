import { useEffect, useState } from 'react';
import { leadsApi } from '../api/leadsApi';
import { TierBadge } from './TierBadge';

function ScoreBar({ label, value }) {
  if (!value) return null;
  const pct = Math.round((value / 10) * 100);
  const color = value >= 8 ? 'bg-emerald-500' : value >= 5 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <span className="text-zinc-500 text-xs w-24 shrink-0">{label}</span>
      <div className="flex-1 bg-zinc-800 rounded-full h-1.5">
        <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-zinc-400 text-xs w-4 text-right">{value}</span>
    </div>
  );
}

function FitScoreBadge({ score }) {
  if (!score) return null;
  const color = score >= 8 ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
    : score >= 5 ? 'text-amber-400 border-amber-500/30 bg-amber-500/10'
    : 'text-red-400 border-red-500/30 bg-red-500/10';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-sm font-semibold ${color}`}>
      {score}/10
    </span>
  );
}

function AnalysisCard({ lead }) {
  const [expanded, setExpanded] = useState(false);
  const breakdown = lead.fit_breakdown;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <FitScoreBadge score={lead.fit_score} />
            <TierBadge tier={lead.tier} />
            {lead.subreddit && (
              <span className="text-zinc-500 text-xs">r/{lead.subreddit}</span>
            )}
            {lead.source === 'remoteok' && (
              <span className="text-zinc-500 text-xs">RemoteOK</span>
            )}
          </div>
          <h3 className="text-zinc-100 text-sm font-medium leading-snug line-clamp-2">
            {lead.title}
          </h3>
          <p className="text-zinc-500 text-xs mt-0.5">{lead.author}</p>
        </div>
        <a
          href={lead.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-600 hover:text-zinc-400 text-xs shrink-0 mt-0.5"
        >
          ↗
        </a>
      </div>

      {/* Fit score bars */}
      {breakdown && (
        <div className="mt-3 space-y-1.5">
          <ScoreBar label="Budget" value={breakdown.budget} />
          <ScoreBar label="Scope fit" value={breakdown.scope_fit} />
          <ScoreBar label="Urgency" value={breakdown.urgency} />
          <ScoreBar label="Company stage" value={breakdown.company_stage} />
        </div>
      )}

      {/* Tier reason */}
      {lead.tier_reason && (
        <p className="text-zinc-500 text-xs mt-3 italic">{lead.tier_reason}</p>
      )}

      {/* Expand button */}
      {(lead.demo_suggestion || lead.outreach_angle) && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="mt-3 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          {expanded ? '▲ Hide suggestions' : '▼ Show demo & outreach suggestions'}
        </button>
      )}

      {/* Expanded: demo suggestion + outreach angle */}
      {expanded && (
        <div className="mt-3 space-y-3">
          {lead.demo_suggestion && (
            <div className="bg-zinc-800/60 rounded p-3">
              <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wide mb-1">Demo idea</p>
              <p className="text-zinc-300 text-sm">{lead.demo_suggestion}</p>
            </div>
          )}
          {lead.outreach_angle && (
            <div className="bg-zinc-800/60 rounded p-3">
              <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wide mb-1">Outreach angle</p>
              <p className="text-zinc-300 text-sm">{lead.outreach_angle}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const TIERS = ['all', '1', '2', '3'];
const TIER_LABELS = { all: 'All tiers', '1': 'Tier 1 — Hot', '2': 'Tier 2 — Warm', '3': 'Tier 3 — Cold' };

export function AnalysisTab() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [minScore, setMinScore] = useState(1);
  const [tierFilter, setTierFilter] = useState('all');
  const [contactedFilter, setContactedFilter] = useState('all'); // 'all' | 'yes' | 'no'

  useEffect(() => {
    setLoading(true);
    leadsApi.getAnalysis({ minScore })
      .then(data => setLeads(data.leads || []))
      .catch(() => setLeads([]))
      .finally(() => setLoading(false));
  }, [minScore]);

  const filtered = leads.filter(l => {
    if (tierFilter !== 'all' && l.tier !== tierFilter) return false;
    if (contactedFilter === 'yes' && !l.contacted) return false;
    if (contactedFilter === 'no' && l.contacted) return false;
    return true;
  });

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <p className="text-zinc-500 text-sm">
          {loading ? 'Loading...' : `${filtered.length} leads · sorted by newest`}
        </p>

        <div className="flex items-center gap-4 flex-wrap">
          {/* Min score filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-500 text-xs">Score</span>
            {[1, 5, 7, 8].map(s => (
              <button
                key={s}
                onClick={() => setMinScore(s)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  minScore === s
                    ? 'bg-zinc-700 text-zinc-100'
                    : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300 border border-zinc-800'
                }`}
              >
                {s === 1 ? 'All' : `${s}+`}
              </button>
            ))}
          </div>

          <div className="w-px h-4 bg-zinc-800" />

          {/* Tier filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-500 text-xs">Tier</span>
            {TIERS.map(t => (
              <button
                key={t}
                onClick={() => setTierFilter(t)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  tierFilter === t
                    ? 'bg-zinc-700 text-zinc-100'
                    : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300 border border-zinc-800'
                }`}
              >
                {t === 'all' ? 'All' : `T${t}`}
              </button>
            ))}
          </div>

          <div className="w-px h-4 bg-zinc-800" />

          {/* Contacted filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-500 text-xs">Contacted</span>
            {[['all', 'All'], ['yes', 'Yes'], ['no', 'No']].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setContactedFilter(val)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  contactedFilter === val
                    ? 'bg-zinc-700 text-zinc-100'
                    : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300 border border-zinc-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="text-zinc-600 text-sm">Loading analysis...</div>
      ) : filtered.length === 0 ? (
        <div className="text-zinc-600 text-sm">
          No leads match the current filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {filtered.map(lead => (
            <AnalysisCard key={lead.id} lead={lead} />
          ))}
        </div>
      )}
    </div>
  );
}
