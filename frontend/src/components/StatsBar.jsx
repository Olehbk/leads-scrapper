import { useLeadsStore } from '../store/leadsStore';

export function StatsBar() {
  const stats = useLeadsStore(s => s.stats);

  if (!stats) return null;

  const tierCount = (tier) =>
    stats.byTier?.find(t => t.tier === tier)?.count || 0;

  return (
    <div className="flex items-center gap-6 text-sm">
      <div className="text-zinc-400">
        <span className="text-white font-semibold">{stats.total}</span> total
      </div>
      <div className="text-zinc-400">
        <span className="text-red-400 font-semibold">{tierCount('1')}</span> hot
      </div>
      <div className="text-zinc-400">
        <span className="text-yellow-400 font-semibold">{tierCount('2')}</span> warm
      </div>
      <div className="text-zinc-400">
        <span className="text-zinc-300 font-semibold">{stats.newToday}</span> today
      </div>
    </div>
  );
}
