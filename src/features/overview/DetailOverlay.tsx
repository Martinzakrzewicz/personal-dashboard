import { CalendarDays, ListTodo, StickyNote } from 'lucide-react';
import { useCallback, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore, type DetailView } from '../../app/store';
import { FullScreenView } from '../../components/ui/FullScreenView';
import { TasksOverview } from './TasksOverview';
import { CalendarOverview } from './CalendarOverview';
import { NotesOverview } from './NotesOverview';

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
      {detailView === 'tasks' ? <TasksOverview /> : null}
      {detailView === 'calendar' ? <CalendarOverview /> : null}
      {detailView === 'notes' ? <NotesOverview /> : null}
    </FullScreenView>
  );
}
