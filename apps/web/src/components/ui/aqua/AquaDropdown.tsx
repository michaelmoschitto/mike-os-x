import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

interface AquaDropdownItem {
  label: string;
  value: string;
}

interface AquaDropdownProps {
  items: AquaDropdownItem[];
  value?: string;
  onValueChange: (value: string) => void;
  trigger: React.ReactNode;
  placeholder?: string;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'bottom';
  sideOffset?: number;
}

export const AquaDropdown = ({
  items,
  value,
  onValueChange,
  trigger,
  placeholder: _placeholder = 'Select...',
  align = 'start',
  side = 'bottom',
  sideOffset = 4,
}: AquaDropdownProps) => {
  const _selectedItem = items.find((item) => item.value === value);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="aqua-dropdown-menu font-ui max-h-[300px] min-w-[200px] overflow-y-auto p-1"
          style={{
            zIndex: 10000,
          }}
          align={align}
          side={side}
          sideOffset={sideOffset}
        >
          {items.map((item) => {
            const isSelected = value === item.value;
            return (
              <DropdownMenu.Item
                key={item.value}
                className="aqua-dropdown-item justify-between rounded"
                onSelect={() => {
                  onValueChange(item.value);
                }}
              >
                <span>{item.label}</span>
                {isSelected && (
                  <span className="ml-2 text-[10px]" style={{ color: 'inherit' }}>
                    ✓
                  </span>
                )}
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};
