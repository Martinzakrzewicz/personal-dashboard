import { Check, LayoutGrid, Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../app/store';
import { Button } from '../../components/ui/Button';
import { BlockCatalogDialog } from './BlockCatalogDialog';

export function LayoutToolbar() {
  const { t } = useTranslation();
  const editMode = useAppStore((state) => state.editMode);
  const setEditMode = useAppStore((state) => state.setEditMode);
  const [catalogOpen, setCatalogOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {editMode ? (
        <Button variant="secondary" size="sm" onClick={() => setCatalogOpen(true)}>
          <Plus size={16} aria-hidden="true" />
          {t('blocks.add')}
        </Button>
      ) : null}
      <Button
        variant={editMode ? 'primary' : 'secondary'}
        size="sm"
        onClick={() => setEditMode(!editMode)}
        aria-pressed={editMode}
      >
        {editMode ? (
          <Check size={16} aria-hidden="true" />
        ) : (
          <LayoutGrid size={16} aria-hidden="true" />
        )}
        {editMode ? t('nav.layoutDone') : t('nav.layoutEdit')}
      </Button>
      <BlockCatalogDialog open={catalogOpen} onClose={() => setCatalogOpen(false)} />
    </div>
  );
}
