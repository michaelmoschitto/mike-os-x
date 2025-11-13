# Mac OS X Aqua Theme Guide

**Source of Truth** for Aqua theming in the Mike OS X portfolio project.

This guide documents the actual implementation, design tokens, component patterns, and best practices for maintaining consistency across all apps (Browser, TextEdit, Photos, Finder, etc.).

---

## Table of Contents

1. [Color System](#1-color-system)
2. [Design Tokens](#2-design-tokens)
3. [Utility Classes](#3-utility-classes)
4. [Component Library](#4-component-library)
5. [Styling Strategy](#5-styling-strategy)
6. [Component Patterns](#6-component-patterns)
7. [Browser-Specific Patterns](#7-browser-specific-patterns)
8. [Window System](#8-window-system)
9. [Accessibility](#9-accessibility)
10. [Quick Reference](#10-quick-reference)
11. [Future App Patterns](#11-future-app-patterns)

---

## 1. Color System

### Primary Aqua Blue

**The authentic Mac OS X 10.1-10.3 Aqua highlight color:**

- **Base**: `#5A8DD9` (RGB 90, 141, 217)
- **Hover**: `#6B9DE5` (RGB 107, 157, 229)
- **Active**: `#4978C8` (RGB 73, 120, 200)

**⚠️ CRITICAL**: Always use `--aqua-blue` (`#5A8DD9`). **Never** use Tailwind's default `blue-500` or any other blue.

### Color Tokens

All colors are defined as CSS custom properties in `src/styles/index.css`:

```css
/* Primary Colors */
--aqua-blue: #5a8dd9;
--aqua-blue-hover: #6b9de5;
--aqua-blue-active: #4978c8;
--aqua-graphite: #7b7b7b;

/* Semantic Colors */
--color-highlight: var(--aqua-blue);
--color-highlight-hover: var(--aqua-blue-hover);
--color-selection-bg: var(--aqua-blue);
--color-selection-text: #ffffff;
--color-border-strong: #999999;
--color-border-subtle: #cccccc;
--color-text-primary: #2c2c2c;
--color-text-secondary: #666666;
```

### Usage in Components

**In Tailwind classes:**

```tsx
// ✅ CORRECT
hover:bg-[var(--color-highlight)]
text-[var(--color-text-primary)]

// ❌ WRONG
hover:bg-blue-500
text-gray-800
```

**In inline styles:**

```tsx
// ✅ CORRECT
style={{ background: 'var(--color-highlight)' }}

// ❌ WRONG
style={{ background: '#3b82f6' }}
```

---

## 2. Design Tokens

All design tokens are defined in `src/styles/index.css` under `:root`.

### Shadows

```css
--shadow-window:
  0 0 0 1px rgba(255, 255, 255, 0.8) inset, 0 15px 40px rgba(0, 0, 0, 0.5),
  0 2px 8px rgba(0, 0, 0, 0.3);

--shadow-button: 0 1px 2px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8);

--shadow-button-active: inset 1px 1px 0 #777, inset -1px -1px 0 #f9f9f9;

--shadow-dropdown: 0 4px 12px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.6);
```

### Gradients

```css
--gradient-button: linear-gradient(to bottom, #ffffff 0%, #e8e8e8 100%);
--gradient-button-hover: linear-gradient(to bottom, #f8f8f8 0%, #e0e0e0 100%);
--gradient-button-active: linear-gradient(to bottom, #e0e0e0 0%, #d8d8d8 100%);
--gradient-dropdown: linear-gradient(180deg, #f5f5f5 0%, #e8e8e8 100%);
```

### Z-Index Scale

```css
--z-desktop: 0;
--z-window: 10;
--z-window-active: 20;
--z-menubar: 50;
--z-dock: 50;
--z-dropdown: 1000;
--z-modal: 2000;
```

**Always use these tokens** instead of hardcoded z-index values.

---

## 3. Utility Classes

Reusable utility classes are defined in `src/styles/index.css` under `@layer utilities`.

### Buttons

```css
.aqua-button-base
```

**Base gel button** with hover/active/disabled states. Use for all Aqua-style buttons.

**Features:**

- Gel gradient background
- Proper shadows (inset highlights)
- Hover/active state transitions
- Disabled state styling

**Usage:**

```tsx
<button className="aqua-button-base h-[28px] px-3 text-[11px]">Click Me</button>
```

### Dropdowns

```css
.aqua-dropdown-menu
.aqua-dropdown-item
```

**Dropdown container and items** with consistent Aqua styling.

**Usage:**

```tsx
<div className="aqua-dropdown-menu">
  <button className="aqua-dropdown-item">Item 1</button>
  <button className="aqua-dropdown-item">Item 2</button>
</div>
```

### Toolbar

```css
.aqua-toolbar-divider
```

**Vertical divider** for toolbars (gradient line between button groups).

**Usage:**

```tsx
<div className="flex items-center gap-2">
  <button>Back</button>
  <div className="aqua-toolbar-divider" />
  <input />
</div>
```

### Existing Utilities

These are already implemented and working well:

- `.aqua-window` - Window chrome with shadows
- `.aqua-titlebar` - Titlebar gradient
- `.aqua-menubar` - Menu bar pinstripe background
- `.aqua-pinstripe` - Metal texture background
- `.aqua-pinstripe-dark` - Dark translucent pinstripe (for dock)

---

## 4. Component Library

### Location

All Aqua UI components live in `src/components/ui/aqua/`:

```
/ui/aqua/
  AquaButton.tsx
  AquaDropdown.tsx
  index.ts
```

### Import Pattern

```tsx
import { AquaButton, AquaDropdown } from '@/components/ui/aqua';
```

### AquaButton

**Props:**

```tsx
interface AquaButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary';
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
  children: React.ReactNode;
}
```

**Usage:**

```tsx
<AquaButton size="md" variant="default" onClick={handleClick}>
  Save
</AquaButton>
```

**Sizes:**

- `sm`: 22px height, 10px text
- `md`: 28px height, 11px text (default)
- `lg`: 32px height, 12px text

### AquaDropdown

**Props:**

```tsx
interface AquaDropdownProps {
  items: AquaDropdownItem[];
  value?: string;
  onValueChange: (value: string) => void;
  trigger: React.ReactNode;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'bottom';
  sideOffset?: number;
}
```

**Usage:**

```tsx
<AquaDropdown
  items={[
    { label: 'Option 1', value: '1' },
    { label: 'Option 2', value: '2' },
  ]}
  value={selectedValue}
  onValueChange={setSelectedValue}
  trigger={<button>Select...</button>}
/>
```

**Built on Radix UI** for accessibility and positioning.

---

## 5. Styling Strategy

### When to Use What

**Tailwind Utilities** - Use for:

- Layout & spacing (`flex`, `gap-2`, `px-3`, `h-[28px]`)
- Typography (`text-[11px]`, `font-ui`, `font-medium`)
- Simple colors (`bg-white`, `text-gray-800`)
- Responsive design (if needed)

**CSS Utility Classes** - Use for:

- Reusable Aqua patterns (`.aqua-button-base`, `.aqua-dropdown-menu`)
- Complex effects that are used repeatedly

**Inline Styles** - Use for:

- Complex gradients with 4+ color stops
- Multi-layer shadows (inset + drop shadows)
- Dynamic values (from motion values, calculations)
- Position calculations (dropdown positioning)
- CSS custom properties (`var(--color-highlight)`)

**CSS Custom Properties** - Use for:

- Design tokens (colors, shadows, gradients, z-index)
- Values that need to be consistent across components

### Decision Matrix

| Scenario         | Approach      | Example                               |
| ---------------- | ------------- | ------------------------------------- |
| Simple layout    | Tailwind      | `className="flex items-center gap-2"` |
| Gel button       | Utility class | `className="aqua-button-base"`        |
| Complex shadow   | CSS var       | `boxShadow: 'var(--shadow-button)'`   |
| Dynamic position | Inline style  | `style={{ left: `${x}px` }}`          |
| Color highlight  | CSS var       | `bg-[var(--color-highlight)]`         |

---

## 6. Component Patterns

### Button Pattern

**Standard Aqua button:**

```tsx
<button className="aqua-button-base h-[28px] px-3 text-[11px]">Label</button>
```

**With AquaButton component:**

```tsx
<AquaButton size="md" onClick={handleClick}>
  Label
</AquaButton>
```

### Dropdown Pattern

**Three dropdown patterns exist:**

1. **Radix UI Dropdown** (AquaDropdown) - For toolbar dropdowns
2. **Portal Dropdown** - For bookmark folders (positioned dynamically)
3. **Inline Suggestions** - For autocomplete (positioned relative to input)

**Common styling:**

- Container: `.aqua-dropdown-menu`
- Items: `.aqua-dropdown-item`
- Hover: Uses `--color-highlight` automatically

### Toolbar Pattern

**Standard toolbar structure:**

```tsx
<div className="aqua-pinstripe flex h-[52px] items-center gap-2 px-3">
  <div className="flex items-center gap-1">
    <button className="aqua-button-base h-[28px] w-[28px]">...</button>
  </div>
  <div className="aqua-toolbar-divider" />
  <input className="..." />
  <div className="aqua-toolbar-divider" />
  <button className="aqua-button-base">...</button>
</div>
```

**Heights:**

- Browser toolbar: 52px
- Bookmark bar: 28px
- Button: 28px (standard)

---

## 7. Browser-Specific Patterns

### Toolbar

- **Height**: 52px
- **Background**: Pinstripe texture (`.aqua-pinstripe`)
- **Buttons**: 28x28px gel buttons
- **Dividers**: Vertical gradient lines (`.aqua-toolbar-divider`)

### Address Bar

- **Input**: Inset styling with inner shadow
- **Autocomplete**: Uses `.aqua-dropdown-menu` and `.aqua-dropdown-item`
- **Focus**: Blue border (use `focus:ring-[var(--color-highlight)]`)

### Bookmark Bar

- **Height**: 28px
- **Folder buttons**: Use `.aqua-button-base` with active state
- **Dropdown**: Portal-based, positioned dynamically
- **Items**: Use `.aqua-dropdown-item`

---

## 8. Window System

### Window Component

Located in `src/components/window/Window.tsx`.

**Features:**

- Drag & drop
- Resize handle
- Z-index management
- Active/inactive states

### Titlebar

- **Height**: 20px
- **Class**: `.aqua-titlebar`
- **Active state**: `.aqua-titlebar.active`
- **Traffic lights**: Red, yellow, green buttons

### Shadows

- **Active window**: Stronger shadow
- **Inactive window**: Weaker shadow
- **Token**: `--shadow-window`

---

## 9. Accessibility

### Keyboard Navigation

- All interactive elements are keyboard accessible
- Radix UI components handle focus management
- Tab order is logical

### Focus States

- Use `focus:ring-[var(--color-highlight)]` for focus rings
- Ensure sufficient contrast (Aqua blue on white = 4.5:1)

### ARIA Labels

- Toolbar buttons have `title` attributes
- Dropdowns use Radix UI's built-in ARIA
- Window chrome is properly labeled

### Color Contrast

- Text on white: `#2c2c2c` (meets WCAG AA)
- Highlight on white: `#5A8DD9` (meets WCAG AA)
- Disabled states: 40% opacity

---

## 10. Quick Reference

### Color Cheat Sheet

| Token                   | Value              | Usage                  |
| ----------------------- | ------------------ | ---------------------- |
| `--aqua-blue`           | `#5A8DD9`          | Primary highlight      |
| `--color-highlight`     | `var(--aqua-blue)` | Interactive highlights |
| `--color-text-primary`  | `#2c2c2c`          | Main text              |
| `--color-border-strong` | `#999999`          | Strong borders         |

### Utility Class Cheat Sheet

| Class                   | Purpose                  |
| ----------------------- | ------------------------ |
| `.aqua-button-base`     | Gel button with states   |
| `.aqua-dropdown-menu`   | Dropdown container       |
| `.aqua-dropdown-item`   | Dropdown item with hover |
| `.aqua-toolbar-divider` | Vertical divider line    |
| `.aqua-window`          | Window chrome            |
| `.aqua-titlebar`        | Titlebar gradient        |
| `.aqua-menubar`         | Menu bar pinstripe       |
| `.aqua-pinstripe`       | Metal texture            |

### Component Cheat Sheet

```tsx
// Button
<AquaButton size="md" onClick={handleClick}>Label</AquaButton>

// Dropdown
<AquaDropdown items={items} value={value} onValueChange={setValue} trigger={trigger} />

// Toolbar button
<button className="aqua-button-base h-[28px] w-[28px]">...</button>

// Dropdown item
<button className="aqua-dropdown-item">Item</button>
```

---

## 11. Future App Patterns

### Building New Apps (Photos, Finder, Music)

**Reuse existing patterns:**

1. **Window wrapper**: Use `<Window>` component
2. **Toolbars**: Use `.aqua-button-base` and `.aqua-toolbar-divider`
3. **Dropdowns**: Use `<AquaDropdown>` or portal pattern
4. **Buttons**: Use `<AquaButton>` or `.aqua-button-base`

### Example: Photos App Structure

```tsx
<Window title="Photos">
  <AquaToolbar>
    <AquaSegmentedControl options={['Grid', 'List']} />
    <AquaButton>Import</AquaButton>
  </AquaToolbar>
  <PhotoGrid /> {/* App-specific content */}
</Window>
```

### Extending the System

**When adding new patterns:**

1. **Extract to utility class** if used 3+ times
2. **Create component** if it has props/state
3. **Add to design tokens** if it's a color/shadow/gradient
4. **Document in this guide** for future reference

**Component location:**

- Primitive Aqua components: `/components/ui/aqua/`
- App-specific components: `/components/apps/{AppName}/`
- System components: `/components/system/`

---

## Implementation Checklist

When building new features, verify:

- [ ] All highlights use `#5A8DD9` (not `blue-500`)
- [ ] Buttons use `.aqua-button-base` or `<AquaButton>`
- [ ] Dropdowns use `.aqua-dropdown-menu` and `.aqua-dropdown-item`
- [ ] Colors use CSS custom properties (`var(--color-highlight)`)
- [ ] Shadows use design tokens (`var(--shadow-button)`)
- [ ] Z-index uses scale (`var(--z-dropdown)`)
- [ ] Hover states use Aqua blue + white text
- [ ] Disabled states properly styled (40% opacity)
- [ ] Focus states visible (ring with Aqua blue)
- [ ] Keyboard navigation works
- [ ] ARIA labels present

---

## Migration Guide

### Updating Old Components

**Before:**

```tsx
<button
  className="hover:bg-blue-500 hover:text-white"
  style={{
    background: 'linear-gradient(to bottom, #ffffff, #e8e8e8)',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
  }}
>
```

**After:**

```tsx
<button className="aqua-button-base">
```

**Or:**

```tsx
<AquaButton size="md">Label</AquaButton>
```

### Finding Inconsistencies

**Search for:**

- `blue-500` (wrong blue)
- `#3b9cff` (old wrong blue)
- Inline gradient strings (should use CSS vars)
- Hardcoded shadow values (should use tokens)

---

## Notes

- This guide reflects the **actual implementation** as of the latest update
- All examples use real code from the codebase
- Design tokens are the single source of truth
- Component library is in `/components/ui/aqua/`
- Future apps should reuse these patterns for consistency

---

_Last updated: After Aqua theme system refactor_
