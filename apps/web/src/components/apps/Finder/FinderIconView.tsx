import FinderItem from '@/components/apps/Finder/FinderItem';
import type { FinderItemData } from '@/lib/finderContent';

interface FinderIconViewProps {
  items: FinderItemData[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onOpen: (item: FinderItemData) => void;
}

const FinderIconView = ({ items, selectedId, onSelect, onOpen }: FinderIconViewProps) => {
  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2">
        {items.map((item) => (
          <FinderItem
            key={item.id}
            name={item.name}
            type={item.type}
            icon={item.icon}
            isSelected={selectedId === item.id}
            onClick={() => onSelect(item.id)}
            onDoubleClick={() => onOpen(item)}
          />
        ))}
      </div>
    </div>
  );
};

export default FinderIconView;
