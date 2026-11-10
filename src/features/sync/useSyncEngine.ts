import { useEffect } from 'react';
import { useAppStore } from '../../app/store';
import { LOCAL_CHANGE_EVENT } from './events';
import { useSyncStore } from './store';

/**
 * Keeps local data aligned with the encrypted gist while the app is open.
 * Pushes are debounced; pulls happen on focus and on a slow interval.
 */
export function useSyncEngine(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    let timer: number | undefined;
    const sync = () => {
      void useSyncStore.getState().syncNow();
    };
    const schedule = () => {
      if (timer !== undefined) window.clearTimeout(timer);
      timer = window.setTimeout(sync, 2000);
    };

    const unsubscribe = useAppStore.subscribe((state, previous) => {
      if (
        state.tasks !== previous.tasks ||
        state.milestones !== previous.milestones ||
        state.blocks !== previous.blocks ||
        state.spaces !== previous.spaces
      ) {
        schedule();
      }
    });

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') sync();
    }, 30000);

    const onFocus = () => sync();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') sync();
    };

    window.addEventListener('focus', onFocus);
    window.addEventListener(LOCAL_CHANGE_EVENT, schedule);
    document.addEventListener('visibilitychange', onVisibility);
    sync();

    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
      window.clearInterval(interval);
      unsubscribe();
      window.removeEventListener('focus', onFocus);
      window.removeEventListener(LOCAL_CHANGE_EVENT, schedule);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled]);
}
