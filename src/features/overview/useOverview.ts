import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { loadOverview, type OverviewSnapshot } from '../../db/overview.repo';
import { useToastStore } from '../../app/toast';

export function useOverview() {
  const { t } = useTranslation();
  const pushToast = useToastStore((state) => state.push);
  const [snapshot, setSnapshot] = useState<OverviewSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const next = await loadOverview();
      setSnapshot(next);
    } catch {
      pushToast(t('errors.loadSpaces'), 'error');
    } finally {
      setLoading(false);
    }
  }, [pushToast, t]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { snapshot, loading, reload };
}
