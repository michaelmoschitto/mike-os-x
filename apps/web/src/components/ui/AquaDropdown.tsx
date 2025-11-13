import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

import { cn } from '@/lib/utils';

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

const AquaDropdown = ({
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
          className="font-ui max-h-[300px] min-w-[200px] overflow-y-auto"
          style={{
            background: 'linear-gradient(180deg, #f5f5f5 0%, #e8e8e8 100%)',
            border: '1px solid #999',
            borderRadius: '4px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
            padding: '4px',
            zIndex: 1000,
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
                className={cn(
                  'font-ui relative flex cursor-pointer items-center justify-between rounded px-3 py-1.5 text-[11px] outline-none',
                  'hover:bg-[#3b9cff] hover:text-white',
                  'focus:bg-[#3b9cff] focus:text-white'
                )}
                style={{
                  color: '#2c2c2c',
                }}
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

export default AquaDropdown;
