import { create } from 'zustand';

export type ToastTone = 'error' | 'success';

export interface Toast {
  id: string;
  message: string;
  tone: ToastTone;
}

interface ToastStore {
  toasts: Toast[];
  push: (message: string, tone?: ToastTone) => void;
  dismiss: (id: string) => void;
}

let toastCounter = 0;

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (message, tone = 'error') => {
    toastCounter += 1;
    const toast: Toast = { id: `toast-${toastCounter}`, message, tone };
    set((state) => ({ toasts: [...state.toasts, toast] }));
    window.setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((entry) => entry.id !== toast.id) }));
    }, 5000);
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((entry) => entry.id !== id) })),
}));
