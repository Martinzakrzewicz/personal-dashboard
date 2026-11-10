import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../app/store';
import type { Milestone, MilestoneType } from '../../db/types';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { Field, Select, TextInput } from '../../components/ui/Field';
import { todayISO } from '../../lib/dates';
import { MILESTONE_TYPES_ORDER } from './icons';

interface MilestoneFormProps {
  milestone?: Milestone | null;
  onClose: () => void;
}

export function MilestoneForm({ milestone, onClose }: MilestoneFormProps) {
  const { t } = useTranslation();
  const createMilestone = useAppStore((state) => state.createMilestone);
  const updateMilestone = useAppStore((state) => state.updateMilestone);
  const tasks = useAppStore((state) => state.tasks);

  const [title, setTitle] = useState(milestone?.title ?? '');
  const [date, setDate] = useState(milestone?.date ?? todayISO());
  const [type, setType] = useState<MilestoneType>(milestone?.type ?? 'event');
  const [linkedTaskId, setLinkedTaskId] = useState(milestone?.linkedTaskId ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      setError(t('milestones.nameRequired'));
      return;
    }
    setSaving(true);
    setError('');

    if (milestone) {
      const ok = await updateMilestone(milestone.id, {
        title: title.trim(),
        date,
        type,
        linkedTaskId: linkedTaskId || null,
      });
      setSaving(false);
      if (ok) onClose();
      return;
    }

    const created = await createMilestone({
      title: title.trim(),
      date,
      type,
      linkedTaskId: linkedTaskId || null,
    });
    setSaving(false);
    if (created) onClose();
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={milestone ? t('milestones.editTitle') : t('milestones.newTitle')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" type="submit" form="milestone-form" disabled={saving}>
            {t('milestones.save')}
          </Button>
        </>
      }
    >
      <form id="milestone-form" onSubmit={onSubmit} className="space-y-4">
        <Field label={t('milestones.name')} htmlFor="milestone-title">
          <TextInput
            id="milestone-title"
            value={title}
            maxLength={200}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t('milestones.namePlaceholder')}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('milestones.date')} htmlFor="milestone-date">
            <TextInput
              id="milestone-date"
              type="date"
              value={date}
              required
              onChange={(event) => setDate(event.target.value)}
            />
          </Field>
          <Field label={t('milestones.type')} htmlFor="milestone-type">
            <Select
              id="milestone-type"
              value={type}
              onChange={(event) => setType(event.target.value as MilestoneType)}
            >
              {MILESTONE_TYPES_ORDER.map((option) => (
                <option key={option} value={option}>
                  {t(`milestones.types.${option}`)}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label={t('milestones.linkedTask')} htmlFor="milestone-task">
          <Select
            id="milestone-task"
            value={linkedTaskId}
            onChange={(event) => setLinkedTaskId(event.target.value)}
          >
            <option value="">{t('milestones.noTask')}</option>
            {tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title}
              </option>
            ))}
          </Select>
        </Field>
        {error ? (
          <p role="alert" className="text-sm font-medium text-danger">
            {error}
          </p>
        ) : null}
      </form>
    </Dialog>
  );
}
