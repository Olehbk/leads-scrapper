const TIER_CONFIG = {
  '1': { label: 'Tier 1 — Hot', classes: 'bg-red-500/20 text-red-400 border border-red-500/30' },
  '2': { label: 'Tier 2 — Warm', classes: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' },
  '3': { label: 'Tier 3 — Cold', classes: 'bg-zinc-700/50 text-zinc-400 border border-zinc-600' },
  'unqualified': { label: 'Unqualified', classes: 'bg-zinc-800 text-zinc-500 border border-zinc-700' },
};

export function TierBadge({ tier }) {
  const config = TIER_CONFIG[tier] || TIER_CONFIG['unqualified'];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.classes}`}>
      {config.label}
    </span>
  );
}
