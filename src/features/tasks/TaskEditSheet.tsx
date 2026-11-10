import { useState, type FormEvent } from 'react';
import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../app/store';
import type { Importance, Milestone, Task, TaskStatus } from '../../db/types';
import { IMPORTANCE_LEVELS, TASK_STATUSES } from '../../db/types';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Dialog } from '../../components/ui/Dialog';
import { Field, Select, TextInput, Textarea } from '../../components/ui/Field';
import { MilestoneList } from '../milestones/MilestoneList';

interface TaskEditSheetProps {
  task: Task;
  onClose: () => void;
  spaceId?: string;
  milestones?: Milestone[];
  onChanged?: () => void;
}

export function TaskEditSheet({
  task,
  onClose,
  spaceId,
  milestones: milestonesProp,
  onChanged,
}: TaskEditSheetProps) {
  const { t } = useTranslation();
  const updateTask = useAppStore((state) => state.updateTask);
  const deleteTask = useAppStore((state) => state.deleteTask);
  const activeSpaceId = useAppStore((state) => state.activeSpaceId);
  const activeMilestones = useAppStore((state) => state.milestones);
  const milestones = milestonesProp ?? activeMilestones;
  const effectiveSpaceId = spaceId ?? activeSpaceId ?? task.spaceId;
  const canManageMilestones = effectiveSpaceId === activeSpaceId;

  const [title, setTitle] = useState(task.title);
  const [importance, setImportance] = useState<Importance>(task.importance);
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [dueDate, setDueDate] = useState(task.dueDate ?? '');
  const [notes, setNotes] = useState(task.notes);
  const [milestoneId, setMilestoneId] = useState(task.milestoneId ?? '');
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      setError(t('tasks.titleRequired'));
      return;
    }
    setSaving(true);
    setError('');
    const updated = await updateTask(
      task.id,
      {
        title: title.trim(),
        importance,
        status,
        dueDate: dueDate || null,
        notes,
        milestoneId: milestoneId || null,
      },
      effectiveSpaceId,
    );
    setSaving(false);
    if (updated) {
      onChanged?.();
      onClose();
    }
  };

  const onDelete = async () => {
    setConfirmDelete(false);
    const deleted = await deleteTask(task.id, effectiveSpaceId);
    if (deleted) {
      onChanged?.();
      onClose();
    }
  };

  return (
    <>
      <Dialog
        open
        onClose={onClose}
        title={t('tasks.editTitle')}
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" type="submit" form="task-edit-form" disabled={saving}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <form id="task-edit-form" onSubmit={onSubmit} className="space-y-4">
          <Field label={t('tasks.title')} htmlFor="task-title">
            <TextInput
              id="task-title"
              value={title}
              maxLength={200}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t('tasks.titlePlaceholder')}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('tasks.importance')} htmlFor="task-importance">
              <Select
                id="task-importance"
                value={importance}
                onChange={(event) => setImportance(event.target.value as Importance)}
              >
                {IMPORTANCE_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {t(`importance.${level}`)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('tasks.status')} htmlFor="task-status">
              <Select
                id="task-status"
                value={status}
                onChange={(event) => setStatus(event.target.value as TaskStatus)}
              >
                {TASK_STATUSES.map((option) => (
                  <option key={option} value={option}>
                    {t(`status.${option}`)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('tasks.dueDate')} htmlFor="task-due">
              <TextInput
                id="task-due"
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </Field>
            <Field label={t('tasks.milestone')} htmlFor="task-milestone">
              <Select
                id="task-milestone"
                value={milestoneId}
                onChange={(event) => setMilestoneId(event.target.value)}
              >
                <option value="">{t('tasks.noMilestone')}</option>
                {milestones.map((milestone) => (
                  <option key={milestone.id} value={milestone.id}>
                    {milestone.title}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label={t('tasks.notes')} htmlFor="task-notes">
            <Textarea
              id="task-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={t('tasks.notesPlaceholder')}
            />
          </Field>

          {canManageMilestones ? <MilestoneList /> : null}

          {error ? (
            <p role="alert" className="text-sm font-medium text-danger">
              {error}
            </p>
          ) : null}

          <div className="border-t border-line pt-3">
            <Button variant="danger" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={16} aria-hidden="true" />
              {t('tasks.delete')}
            </Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete}
        title={t('tasks.deleteConfirmTitle')}
        body={t('tasks.deleteConfirmBody')}
        confirmLabel={t('common.delete')}
        onConfirm={() => void onDelete()}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
