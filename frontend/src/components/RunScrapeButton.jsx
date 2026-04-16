import { useState, useEffect, useRef } from 'react';
import { leadsApi } from '../api/leadsApi';
import { useLeadsStore } from '../store/leadsStore';
import { Toast } from './Toast';

export function RequalifyButton() {
  const [running, setRunning] = useState(false);
  const [toast, setToast] = useState(null);

  async function handleRequalify() {
    setRunning(true);
    try {
      const result = await leadsApi.requalify(null);
      setToast({ message: `${result.requalified} kept, ${result.removed} removed`, type: 'success', key: Date.now() });
    } catch (err) {
      setToast({ message: `Error: ${err.message}`, type: 'error', key: Date.now() });
    } finally {
      setRunning(false);
    }
  }

  async function handlePurge() {
    try {
      const result = await leadsApi.purgeUnqualified();
      setToast({ message: `Removed ${result.removed} unqualified leads`, type: 'success', key: Date.now() });
    } catch (err) {
      setToast({ message: `Error: ${err.message}`, type: 'error', key: Date.now() });
    }
  }

  return (
    <>
      {toast && <Toast key={toast.key} message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <div className="flex items-center gap-2">
        <button
          onClick={handlePurge}
          className="px-4 py-1.5 bg-zinc-800 text-zinc-500 text-sm font-medium rounded border border-zinc-700 hover:text-zinc-300 hover:bg-zinc-700 transition-colors"
        >
          Purge unqualified
        </button>
        <button
          onClick={handleRequalify}
          disabled={running}
          className="px-4 py-1.5 bg-zinc-800 text-zinc-300 text-sm font-medium rounded border border-zinc-700 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {running ? (
            <span className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 border-2 border-zinc-500 border-t-zinc-300 rounded-full animate-spin" />
              Requalifying...
            </span>
          ) : 'Requalify all'}
        </button>
      </div>
    </>
  );
}

export function RunScrapeButton() {
  const [running, setRunning] = useState(false);
  const [toast, setToast] = useState(null);
  const [mode, setMode] = useState('recent'); // 'recent' | 'date'
  const [maxAge, setMaxAge] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [scrapeStatus, setScrapeStatus] = useState('');
  const pollRef = useRef(null);
  const { setStats, setNewSince } = useLeadsStore();

  useEffect(() => {
    if (running) {
      pollRef.current = setInterval(async () => {
        try {
          const data = await leadsApi.getScrapeStatus();
          if (data.status) setScrapeStatus(data.status);
        } catch {}
      }, 1000);
    } else {
      clearInterval(pollRef.current);
      setScrapeStatus('');
    }
    return () => clearInterval(pollRef.current);
  }, [running]);

  function showToast(message, type) {
    setToast({ message, type, key: Date.now() });
  }

  async function handleRun() {
    setRunning(true);
    const scrapeStarted = Math.floor(Date.now() / 1000);

    let options = {};
    if (mode === 'recent') {
      if (maxAge !== '') options.maxPostAgeHours = Number(maxAge);
    } else if (mode === 'date' && selectedDate) {
      options.fromDate = `${selectedDate}T00:00:00.000Z`;
      options.toDate   = `${selectedDate}T23:59:59.999Z`;
    }

    try {
      const result = await leadsApi.triggerScrape('reddit', options);

      if (result.ok) {
        if (result.postsNew > 0) {
          showToast(`${result.postsNew} new lead${result.postsNew > 1 ? 's' : ''} found!`, 'success');
          setNewSince('reddit', scrapeStarted, result.postsNew);
        } else {
          showToast('No new leads this time — check back later', 'info');
        }
        const statsData = await leadsApi.getStats('reddit');
        setStats(statsData);
      } else {
        showToast(`Scrape failed: ${result.error}`, 'error');
      }
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setRunning(false);
    }
  }

  const label = 'Scrape Reddit';
  const canRun = mode === 'recent' || (mode === 'date' && selectedDate !== '');

  return (
    <>
      {toast && (
        <Toast
          key={toast.key}
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <div className="flex flex-col items-end gap-1">
        {/* Controls row */}
        <div className="flex items-center gap-2">
          {/* Mode toggle */}
          <div className="flex rounded overflow-hidden border border-zinc-700 text-sm">
            <button
              onClick={() => setMode('recent')}
              disabled={running}
              className={`px-3 py-1.5 transition-colors ${mode === 'recent' ? 'bg-zinc-600 text-zinc-100' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'}`}
            >
              Recent
            </button>
            <button
              onClick={() => setMode('date')}
              disabled={running}
              className={`px-3 py-1.5 transition-colors ${mode === 'date' ? 'bg-zinc-600 text-zinc-100' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'}`}
            >
              By date
            </button>
          </div>

          {/* Mode-specific input */}
          {mode === 'recent' && (
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="1"
                value={maxAge}
                onChange={e => setMaxAge(e.target.value)}
                placeholder="48"
                disabled={running}
                className="w-16 px-2 py-1.5 bg-zinc-800 text-zinc-100 text-sm rounded border border-zinc-700 placeholder-zinc-500 disabled:opacity-50 focus:outline-none focus:border-zinc-500"
              />
              <span className="text-zinc-500 text-sm">hrs</span>
            </div>
          )}

          {mode === 'date' && (
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              disabled={running}
              className="px-2 py-1.5 bg-zinc-800 text-zinc-100 text-sm rounded border border-zinc-700 disabled:opacity-50 focus:outline-none focus:border-zinc-500"
            />
          )}

          <button
            onClick={handleRun}
            disabled={running || !canRun}
            className="px-4 py-1.5 bg-zinc-100 text-zinc-900 text-sm font-medium rounded hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {running ? (
              <span className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 border-2 border-zinc-500 border-t-zinc-900 rounded-full animate-spin" />
                Scraping...
              </span>
            ) : label}
          </button>
        </div>

        {/* Status line — only visible while scraping */}
        {scrapeStatus && (
          <p className="text-zinc-500 text-xs">{scrapeStatus}</p>
        )}
      </div>
    </>
  );
}
