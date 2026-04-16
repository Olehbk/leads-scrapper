import { useLeads } from './hooks/useLeads';
import { useStats } from './hooks/useStats';
import { StatsBar } from './components/StatsBar';
import { FilterBar } from './components/FilterBar';
import { LeadTable } from './components/LeadTable';
import { LeadsDatabase } from './components/LeadsDatabase';
import { AnalysisTab } from './components/AnalysisTab';
import { InfoTab } from './components/InfoTab';
import { RunScrapeButton, RequalifyButton } from './components/RunScrapeButton';
import { Tabs } from './components/Tabs';
import { useLeadsStore } from './store/leadsStore';

export default function App() {
  useLeads();
  useStats();
  const activeTab = useLeadsStore(s => s.activeTab);

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-zinc-100">Off Piste — Lead Pipeline</h1>
            <StatsBar />
          </div>
          <div className="flex items-center gap-3">
            <RequalifyButton />
            <RunScrapeButton />
          </div>
        </div>
      </div>

      {/* Tabs + Filters */}
      <div className="border-b border-zinc-800 bg-zinc-900/30">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-6 flex-wrap">
          <Tabs />
          {activeTab === 'all' && <FilterBar />}
        </div>
      </div>

      {/* Content */}
      <div className={`mx-auto px-6 py-6 ${activeTab === 'database' ? 'max-w-7xl' : 'max-w-5xl'}`}>
        {activeTab === 'database' ? <LeadsDatabase />
          : activeTab === 'analysis' ? <AnalysisTab />
          : activeTab === 'info' ? <InfoTab />
          : <LeadTable />}
      </div>
    </div>
  );
}
