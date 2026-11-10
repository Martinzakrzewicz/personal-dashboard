import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../app/store';
import type { Milestone } from '../../db/types';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { formatISODate } from '../../lib/dates';
import { MILESTONE_ICONS } from './icons';
import { MilestoneForm } from './MilestoneForm';

export function MilestoneList() {
  const { t, i18n } = useTranslation();
  const milestones = useAppStore((state) => state.milestones);
  const deleteMilestone = useAppStore((state) => state.deleteMilestone);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Milestone | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Milestone | null>(null);

  const sorted = [...milestones].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="border-t border-line pt-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
          {t('milestones.title')}
        </h3>
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="touch-target accent-text inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg px-1 text-xs font-semibold hover:bg-surface2"
        >
          <Plus size={14} aria-hidden="true" />
          {t('milestones.add')}
        </button>
      </div>

      {sorted.length === 0 ? (
        <p className="px-1 text-xs text-muted">{t('milestones.empty')}</p>
      ) : (
        <ul className="space-y-1">
          {sorted.map((milestone) => {
            const Icon = MILESTONE_ICONS[milestone.type];
            return (
              <li
                key={milestone.id}
                className="group flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-surface2"
              >
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full accent-soft"
                  aria-hidden="true"
                >
                  <Icon size={14} className="text-[color:var(--space-accent)]" />
                </span>
                <button
                  type="button"
                  onClick={() => setEditing(milestone)}
                  className="min-h-[44px] min-w-0 flex-1 text-left"
                >
                  <span className="block truncate text-sm text-ink">{milestone.title}</span>
                  <span className="block text-[11px] text-muted">
                    {formatISODate(milestone.date, i18n.language, {
                      month: 'short',
                      day: 'numeric',
                    })}{' '}
                    · {t(`milestones.types.${milestone.type}`)}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(milestone)}
                  aria-label={t('milestones.editTitle')}
                  className="flex h-11 w-11 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-ink"
                >
                  <Pencil size={14} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(milestone)}
                  aria-label={t('milestones.delete')}
                  className="flex h-11 w-11 items-center justify-center rounded-lg text-muted hover:bg-[var(--danger-soft)] hover:text-danger"
                >
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {formOpen ? <MilestoneForm onClose={() => setFormOpen(false)} /> : null}
      {editing ? <MilestoneForm milestone={editing} onClose={() => setEditing(null)} /> : null}
      <ConfirmDialog
        open={deleteTarget !== null}
        title={t('milestones.deleteConfirmTitle')}
        body={t('milestones.deleteConfirmBody')}
        confirmLabel={t('common.delete')}
        onConfirm={() => {
          if (deleteTarget) void deleteMilestone(deleteTarget.id);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
