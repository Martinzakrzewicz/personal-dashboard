import { CalendarDays, ListTodo, StickyNote } from 'lucide-react';
import { lazy, Suspense, useCallback, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore, type DetailView } from '../../app/store';
import { FullScreenView } from '../../components/ui/FullScreenView';

const TasksOverview = lazy(() =>
  import('./TasksOverview').then((module) => ({ default: module.TasksOverview })),
);
const CalendarOverview = lazy(() =>
  import('./CalendarOverview').then((module) => ({ default: module.CalendarOverview })),
);
const NotesOverview = lazy(() =>
  import('./NotesOverview').then((module) => ({ default: module.NotesOverview })),
);

export function DetailOverlay() {
  const { t } = useTranslation();
  const detailView = useAppStore((state) => state.detailView);
  const closeDetail = useAppStore((state) => state.closeDetail);
  const reloadFromDatabase = useAppStore((state) => state.reloadFromDatabase);

  const onClose = useCallback(() => {
    closeDetail();
    void reloadFromDatabase();
  }, [closeDetail, reloadFromDatabase]);

  if (!detailView) return null;

  const config: Record<DetailView, { title: string; icon: ReactNode }> = {
    tasks: {
      title: t('detail.tasksTitle'),
      icon: <ListTodo size={20} className="accent-text" aria-hidden="true" />,
    },
    calendar: {
      title: t('detail.calendarTitle'),
      icon: <CalendarDays size={20} className="accent-text" aria-hidden="true" />,
    },
    notes: {
      title: t('detail.notesTitle'),
      icon: <StickyNote size={20} className="accent-text" aria-hidden="true" />,
    },
  };

  return (
    <FullScreenView
      title={config[detailView].title}
      subtitle={t('detail.allSpacesSubtitle')}
      icon={config[detailView].icon}
      onClose={onClose}
    >
      <Suspense
        fallback={<p className="py-10 text-center text-sm text-muted">{t('detail.loading')}</p>}
      >
        {detailView === 'tasks' ? <TasksOverview /> : null}
        {detailView === 'calendar' ? <CalendarOverview /> : null}
        {detailView === 'notes' ? <NotesOverview /> : null}
      </Suspense>
    </FullScreenView>
  );
}
