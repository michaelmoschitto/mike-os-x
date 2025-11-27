import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useState } from 'react';

import { cn } from '@/lib/utils';

export interface MenuItem {
  label?: string;
  action?: () => void;
  shortcut?: string;
  disabled?: boolean;
  separator?: boolean;
  submenu?: MenuItem[];
}

interface MenuBarMenuProps {
  label: string;
  items: MenuItem[];
  align?: 'start' | 'center' | 'end';
}

const MenuBarMenu = ({ label, items, align = 'start' }: MenuBarMenuProps) => {
  const [open, setOpen] = useState(false);

  const handleItemSelect = (item: MenuItem) => {
    if (item.disabled || item.submenu) return;
    if (item.action) {
      item.action();
    }
    setOpen(false);
  };

  const renderMenuItem = (item: MenuItem, index: number) => {
    if (item.separator) {
      return (
        <DropdownMenu.Separator
          key={`separator-${index}`}
          className="my-1 h-px bg-[#999] opacity-30"
        />
      );
    }

    if (item.submenu && item.submenu.length > 0) {
      return (
        <DropdownMenu.Sub key={`submenu-${index}`}>
          <DropdownMenu.SubTrigger
            className={cn(
              'aqua-dropdown-item relative flex w-full items-center justify-between',
              item.disabled && 'cursor-not-allowed opacity-50'
            )}
            disabled={item.disabled}
          >
            <span>{item.label ?? ''}</span>
            <span className="ml-4 text-[10px] opacity-60">▶</span>
          </DropdownMenu.SubTrigger>
          <DropdownMenu.Portal>
            <DropdownMenu.SubContent
              className="aqua-dropdown-menu font-ui min-w-[160px] p-1"
              sideOffset={2}
              alignOffset={-5}
            >
              {item.submenu.map((subItem, subIndex) => renderMenuItem(subItem, subIndex))}
            </DropdownMenu.SubContent>
          </DropdownMenu.Portal>
        </DropdownMenu.Sub>
      );
    }

    return (
      <DropdownMenu.Item
        key={`item-${index}`}
        className={cn(
          'aqua-dropdown-item flex w-full items-center justify-between',
          item.disabled && 'cursor-not-allowed opacity-50'
        )}
        disabled={item.disabled}
        onSelect={(e) => {
          e.preventDefault();
          handleItemSelect(item);
        }}
      >
        <span>{item.label ?? ''}</span>
        {item.shortcut && (
          <span className="ml-8 text-[10px] font-normal text-gray-500">{item.shortcut}</span>
        )}
      </DropdownMenu.Item>
    );
  };

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className={cn(
            'cursor-default rounded px-1.5 py-0.5 text-[13px] transition-colors',
            'hover:bg-[var(--color-highlight)] hover:text-white',
            'focus:outline-none focus:ring-0 focus-visible:outline-none',
            'active:outline-none',
            open && 'bg-[var(--color-highlight)] text-white'
          )}
          style={{ outline: 'none' }}
        >
          {label}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="aqua-dropdown-menu font-ui min-w-[180px] p-1"
          align={align}
          sideOffset={2}
          style={{ zIndex: 10000 }}
        >
          {items.map((item, index) => renderMenuItem(item, index))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

export default MenuBarMenu;
