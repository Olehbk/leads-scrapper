import { useLeadsStore } from '../store/leadsStore';

const TABS = [
  { id: 'all', label: 'All leads' },
  { id: 'new', label: 'New' },
  { id: 'database', label: 'Database' },
  { id: 'analysis', label: 'Analysis' },
  { id: 'info', label: 'Info' },
];

export function Tabs() {
  const { activeTab, setActiveTab, newCount } = useLeadsStore();

  return (
    <div className="flex items-center gap-1">
      {TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            activeTab === tab.id
              ? 'bg-zinc-800 text-zinc-100'
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'
          }`}
        >
          {tab.label}
          {tab.id === 'new' && newCount > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center bg-emerald-500 text-white text-xs font-bold rounded-full w-4 h-4">
              {newCount > 9 ? '9+' : newCount}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
