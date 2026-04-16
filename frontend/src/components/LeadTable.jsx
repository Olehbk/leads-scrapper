import { useLeadsStore } from '../store/leadsStore';
import { LeadCard } from './LeadCard';

export function LeadTable() {
  const { leads, isLoading, error, activeTab, newSince } = useLeadsStore();

  if (activeTab === 'new' && !newSince) {
    return (
      <div className="text-center py-16 text-zinc-500">
        Hit <span className="text-zinc-300">Scrape now</span> to find new leads — they'll appear here.
      </div>
    );
  }

  if (isLoading && leads.length === 0) {
    return <div className="text-center py-16 text-zinc-500">Loading leads...</div>;
  }

  if (error) {
    return <div className="text-center py-16 text-red-400">Error: {error}</div>;
  }

  if (leads.length === 0) {
    return (
      <div className="text-center py-16 text-zinc-500">
        {activeTab === 'new' ? 'No new leads from the last scrape.' : 'No leads found. Try adjusting your filters.'}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {leads.map(lead => (
        <LeadCard key={lead.id} lead={lead} />
      ))}
    </div>
  );
}
