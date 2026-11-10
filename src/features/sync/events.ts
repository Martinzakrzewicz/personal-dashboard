export const LOCAL_CHANGE_EVENT = 'pd:local-change';

/** Tell the sync engine that a write bypassed the active-space Zustand store. */
export function notifyLocalChange(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(LOCAL_CHANGE_EVENT));
  }
}
