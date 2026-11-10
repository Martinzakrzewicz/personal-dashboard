import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../app/store';
import { BlockFrame, blockWrapperStyle } from './BlockFrame';

export function GridRenderer() {
  const { t } = useTranslation();
  const blocks = useAppStore((state) => state.blocks);
  const editMode = useAppStore((state) => state.editMode);

  const visible = [...blocks]
    .sort((a, b) => a.order - b.order)
    .filter((block) => editMode || block.visible);

  if (visible.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-surface px-4 py-10 text-center text-sm text-muted">
        {t('blocks.empty')}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-12 md:gap-4">
      {visible.map((block) => (
        <div key={block.id} className="block-wrapper" style={blockWrapperStyle(block)}>
          <BlockFrame block={block} editMode={editMode} />
        </div>
      ))}
    </div>
  );
}
