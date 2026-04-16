import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { TierBadge } from './TierBadge';
import { useLeads } from '../hooks/useLeads';

export function LeadCard({ lead }) {
  const { markContacted, updateNotes, overrideTier } = useLeads();
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(lead.notes || '');
  const [savingNotes, setSavingNotes] = useState(false);

  const timeAgo = lead.scraped_at
    ? formatDistanceToNow(new Date(lead.scraped_at * 1000), { addSuffix: true })
    : '';

  const postAge = lead.created_at
    ? formatDistanceToNow(new Date(lead.created_at * 1000), { addSuffix: true })
    : '';

  async function handleSaveNotes() {
    setSavingNotes(true);
    await updateNotes(lead.id, notes);
    setSavingNotes(false);
  }

  return (
    <div className={`bg-zinc-900 border rounded-lg p-4 transition-all ${
      lead.tier === '1' ? 'border-red-500/30' :
      lead.tier === '2' ? 'border-yellow-500/30' :
      'border-zinc-800'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <TierBadge tier={lead.tier} />
            {!!lead.contacted && (
              <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                Contacted
              </span>
            )}
            <span className="text-xs text-zinc-500">r/{lead.subreddit}</span>
            <span className="text-xs text-zinc-600">{postAge}</span>
          </div>
          <a
            href={lead.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-zinc-100 hover:text-white line-clamp-2 leading-snug"
          >
            {lead.title}
          </a>
          <div className="text-xs text-zinc-500 mt-1">{lead.author}</div>
        </div>

        <button
          onClick={() => setExpanded(e => !e)}
          className="text-zinc-500 hover:text-zinc-300 text-xs shrink-0 mt-1"
        >
          {expanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {/* AI Reason */}
      {lead.tier_reason && (
        <p className="text-xs text-zinc-500 mt-2 italic">{lead.tier_reason}</p>
      )}

      {/* Expanded body */}
      {expanded && (
        <div className="mt-3 space-y-3">
          {lead.body && (
            <p className="text-sm text-zinc-400 whitespace-pre-wrap bg-zinc-950 rounded p-3 max-h-48 overflow-y-auto">
              {lead.body}
            </p>
          )}

          {/* Notes */}
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-zinc-300 resize-none h-20 focus:outline-none focus:border-zinc-600"
              placeholder="Add notes..."
            />
            <button
              onClick={handleSaveNotes}
              disabled={savingNotes}
              className="mt-1 text-xs text-zinc-400 hover:text-zinc-200 disabled:opacity-50"
            >
              {savingNotes ? 'Saving...' : 'Save notes'}
            </button>
          </div>

          {/* Override tier */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">Override tier:</span>
            {['1', '2', '3'].map(t => (
              <button
                key={t}
                onClick={() => overrideTier(lead.id, t)}
                className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                  lead.tier === t
                    ? 'bg-zinc-700 border-zinc-600 text-zinc-200'
                    : 'border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
                }`}
              >
                T{t}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800">
        <div className="flex gap-3">
          <a
            href={lead.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            View post
          </a>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-600">Scraped {timeAgo}</span>
          {!lead.contacted && (
            <button
              onClick={() => markContacted(lead.id)}
              className="text-xs text-emerald-500 hover:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded hover:border-emerald-500/40 transition-colors"
            >
              Mark contacted
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
