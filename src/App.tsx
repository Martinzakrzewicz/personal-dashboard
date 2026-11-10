import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from './app/store';
import { CaptureBar } from './features/capture/CaptureBar';
import { GridRenderer } from './features/blocks/GridRenderer';
import { LayoutToolbar } from './features/blocks/LayoutToolbar';
import { SettingsSheet } from './features/settings/SettingsSheet';
import { getSpaceIcon } from './features/spaces/icons';
import { SpaceSwitcher } from './features/spaces/SpaceSwitcher';
import { ToastViewport } from './components/ui/ToastViewport';

function Splash() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background text-muted">
      <Loader2 size={28} className="animate-spin text-[color:var(--space-accent)]" aria-hidden="true" />
      <p className="text-sm">{t('common.loading')}</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-12 md:gap-4" aria-hidden="true">
      <div className="h-64 animate-pulse rounded-2xl bg-surface2 md:col-span-8" />
      <div className="h-64 animate-pulse rounded-2xl bg-surface2 md:col-span-4" />
      <div className="h-40 animate-pulse rounded-2xl bg-surface2 md:col-span-6" />
      <div className="h-40 animate-pulse rounded-2xl bg-surface2 md:col-span-6" />
    </div>
  );
}

export default function App() {
  const { t } = useTranslation();
  const init = useAppStore((state) => state.init);
  const initialized = useAppStore((state) => state.initialized);
  const loadingSpace = useAppStore((state) => state.loadingSpace);
  const activeSpaceId = useAppStore((state) => state.activeSpaceId);
  const spaces = useAppStore((state) => state.spaces);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    void init();
  }, [init]);

  if (!initialized) return <Splash />;

  const activeSpace = spaces.find((space) => space.id === activeSpaceId) ?? null;
  const ActiveIcon = activeSpace ? getSpaceIcon(activeSpace.icon) : null;

  return (
    <div className="min-h-dvh md:flex">
      <SpaceSwitcher variant="sidebar" onOpenSettings={() => setSettingsOpen(true)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <SpaceSwitcher variant="bar" onOpenSettings={() => setSettingsOpen(true)} />

        <main className="mx-auto w-full max-w-6xl flex-1 px-3 pb-44 md:px-6 md:pb-8">
          <CaptureBar />

          {activeSpace ? (
            <>
              <header className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  {ActiveIcon ? (
                    <span
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                      style={{
                        backgroundColor: `color-mix(in srgb, ${activeSpace.color} 18%, transparent)`,
                      }}
                    >
                      <ActiveIcon size={22} style={{ color: activeSpace.color }} aria-hidden="true" />
                    </span>
                  ) : null}
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                      {t('nav.dashboard')}
                    </p>
                    <h1 className="truncate text-xl font-semibold text-ink md:text-2xl">
                      {activeSpace.name}
                    </h1>
                  </div>
                </div>
                <LayoutToolbar />
              </header>

              {loadingSpace ? <DashboardSkeleton /> : <GridRenderer />}
            </>
          ) : (
            <div className="py-16 text-center">
              <p className="text-sm text-muted">{t('spaces.noSpaces')}</p>
            </div>
          )}
        </main>
      </div>

      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <ToastViewport />
    </div>
  );
}
