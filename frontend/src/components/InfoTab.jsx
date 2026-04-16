import { useEffect, useState } from 'react';
import { leadsApi } from '../api/leadsApi';
import { TierBadge } from './TierBadge';

function ConfidenceBadge({ score }) {
  if (!score) return null;
  const color = score >= 7 ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
    : score >= 4 ? 'text-amber-400 border-amber-500/30 bg-amber-500/10'
    : 'text-zinc-400 border-zinc-600 bg-zinc-800';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-semibold ${color}`}>
      {score}/10
    </span>
  );
}

function ContactRow({ label, value, href }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2">
      <span className="text-zinc-600 text-xs w-20 shrink-0 pt-0.5">{label}</span>
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer"
          className="text-zinc-300 text-xs hover:text-white break-all">
          {value}
        </a>
      ) : (
        <span className="text-zinc-300 text-xs break-all">{value}</span>
      )}
    </div>
  );
}

function InfoCard({ lead }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <ConfidenceBadge score={lead.contact_confidence} />
            <TierBadge tier={lead.tier} />
            {lead.subreddit && <span className="text-zinc-500 text-xs">r/{lead.subreddit}</span>}
          </div>
          <h3 className="text-zinc-100 text-sm font-medium leading-snug line-clamp-2">{lead.title}</h3>
          <p className="text-zinc-500 text-xs mt-0.5">{lead.author}</p>
        </div>
        <a href={lead.url} target="_blank" rel="noopener noreferrer"
          className="text-zinc-600 hover:text-zinc-400 text-xs shrink-0 mt-0.5">↗</a>
      </div>

      {/* Summary */}
      {lead.profile_summary && (
        <p className="text-zinc-400 text-xs mb-3 leading-relaxed">{lead.profile_summary}</p>
      )}

      {/* Contact info */}
      <div className="space-y-1.5 border-t border-zinc-800 pt-3">
        <ContactRow label="Company" value={lead.company_name} />
        <ContactRow label="Role" value={lead.role} />
        <ContactRow label="Email" value={lead.email} href={lead.email ? `mailto:${lead.email}` : null} />
        <ContactRow label="Website" value={lead.website} href={lead.website} />
        <ContactRow label="LinkedIn" value={lead.linkedin} href={lead.linkedin} />
        <ContactRow label="Twitter" value={lead.twitter} href={lead.twitter ? `https://twitter.com/${lead.twitter.replace('@', '')}` : null} />
      </div>

      {(!lead.company_name && !lead.email && !lead.website && !lead.linkedin && !lead.twitter) && (
        <p className="text-zinc-600 text-xs mt-2 italic">No direct contact info found — see summary above.</p>
      )}
    </div>
  );
}

export function InfoTab() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enriching, setEnriching] = useState(false);
  const [toast, setToast] = useState('');

  function load() {
    setLoading(true);
    leadsApi.getInfo()
      .then(data => setLeads(data.leads || []))
      .catch(() => setLeads([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleEnrich() {
    setEnriching(true);
    setToast('');
    try {
      const result = await leadsApi.enrichProfiles();
      setToast(`${result.enriched} profiles enriched`);
      load();
    } catch (err) {
      setToast(`Error: ${err.message}`);
    } finally {
      setEnriching(false);
    }
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <div>
          <p className="text-zinc-500 text-sm">
            {loading ? 'Loading...' : `${leads.length} profiles enriched · sorted by contact confidence`}
          </p>
          {toast && <p className="text-zinc-400 text-xs mt-0.5">{toast}</p>}
        </div>
        <button
          onClick={handleEnrich}
          disabled={enriching}
          className="px-4 py-1.5 bg-zinc-800 text-zinc-300 text-sm font-medium rounded border border-zinc-700 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {enriching ? (
            <span className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 border-2 border-zinc-500 border-t-zinc-300 rounded-full animate-spin" />
              Enriching profiles...
            </span>
          ) : 'Enrich profiles'}
        </button>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="text-zinc-600 text-sm">Loading...</div>
      ) : leads.length === 0 ? (
        <div className="text-zinc-600 text-sm">
          No enriched profiles yet — click "Enrich profiles" to analyse Tier 1 and Tier 2 leads.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {leads.map(lead => <InfoCard key={lead.id} lead={lead} />)}
        </div>
      )}
    </div>
  );
}
