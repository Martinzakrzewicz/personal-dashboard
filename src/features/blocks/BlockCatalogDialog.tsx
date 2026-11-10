import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../app/store';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { cn } from '../../lib/cn';
import { BLOCK_CATALOG } from './registry';

interface BlockCatalogDialogProps {
  open: boolean;
  onClose: () => void;
}

export function BlockCatalogDialog({ open, onClose }: BlockCatalogDialogProps) {
  const { t } = useTranslation();
  const blocks = useAppStore((state) => state.blocks);
  const addBlock = useAppStore((state) => state.addBlock);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('blocks.catalog')}
      wide
      footer={
        <Button variant="secondary" onClick={onClose}>
          {t('common.close')}
        </Button>
      }
    >
      <ul className="space-y-2">
        {BLOCK_CATALOG.map((definition) => {
          const exists = blocks.some((block) => block.type === definition.type);
          const disabled = !definition.multiInstance && exists;
          const Icon = definition.Icon;
          return (
            <li
              key={definition.type}
              className={cn(
                'flex items-center gap-3 rounded-xl border border-line p-3',
                disabled && 'opacity-70',
              )}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl accent-soft">
                <Icon size={20} className="text-[color:var(--space-accent)]" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{t(definition.titleKey)}</p>
                <p className="text-xs text-muted">{t(definition.descriptionKey)}</p>
                {disabled ? (
                  <p className="mt-1 text-[11px] font-medium text-muted">
                    {t('blocks.alreadyAdded')}
                  </p>
                ) : null}
              </div>
              <Button
                variant={disabled ? 'secondary' : 'primary'}
                size="sm"
                disabled={disabled}
                onClick={() => void addBlock(definition.type)}
              >
                <Plus size={16} aria-hidden="true" />
                {t('blocks.add')}
              </Button>
            </li>
          );
        })}
      </ul>
    </Dialog>
  );
}
