import { useEffect, useCallback } from 'react';
import { leadsApi } from '../api/leadsApi';
import { useLeadsStore } from '../store/leadsStore';

export function useStats() {
  const { activeSource, setStats } = useLeadsStore();

  const loadStats = useCallback(async () => {
    try {
      const stats = await leadsApi.getStats(activeSource);
      setStats(stats);
    } catch {
      // Non-fatal
    }
  }, [activeSource, setStats]);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, [loadStats]);

  return { loadStats };
}
