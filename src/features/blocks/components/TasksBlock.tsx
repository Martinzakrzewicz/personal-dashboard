import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../../app/store';
import type { Block } from '../../../db/types';
import { TaskList } from '../../tasks/TaskList';
import { tasksBlockConfigSchema } from '../definitions';

export interface BlockComponentProps {
  block: Block;
  editMode: boolean;
}

export function TasksBlock({ block, editMode }: BlockComponentProps) {
  const { t } = useTranslation();
  const updateBlock = useAppStore((state) => state.updateBlock);
  const parsed = tasksBlockConfigSchema.safeParse(block.config);
  const config = parsed.success ? parsed.data : { version: 1 as const, showCompleted: true };

  return (
    <div className="space-y-3">
      {editMode ? (
        <label className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg px-1 text-xs font-medium text-muted">
          <input
            type="checkbox"
            checked={config.showCompleted}
            onChange={(event) =>
              void updateBlock(block.id, {
                config: { ...config, showCompleted: event.target.checked },
              })
            }
            className="h-4 w-4 accent-[color:var(--space-accent)]"
          />
          {t('tasks.showCompleted')}
        </label>
      ) : null}
      <TaskList showCompletedSection={config.showCompleted} />
    </div>
  );
}
