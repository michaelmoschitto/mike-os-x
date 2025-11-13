Here’s your full markdown file (ready to download or copy into a `.md` file) for the Aqua-style “macOS X Desktop + Internet Explorer app” UI, tailored for your React + Vite project:

````markdown
# Aqua-Style Desktop & Browser UI Style Guide

_For a React + Vite project where your site presents a macOS X-style desktop and a browser-app window_

---

## 1. Thematic & Visual Concepts

- The design language known as Aqua (used originally in Mac OS X circa 2000) was built around the metaphor of water, with droplet-like components, reflections, translucency, and gel-like buttons. :contentReference[oaicite:2]{index=2}
- Key aims: colour, depth, translucence, and visually appealing textures. :contentReference[oaicite:3]{index=3}
- In your UI: you have two layers:
  1. The “desktop shell” – background, icons, app launching.
  2. The “browser window” – your IE-style app open on that desktop.
- The theme: retro-mac, nostalgic but usable. Prioritise clarity and user-flow; you don’t need perfect pixel accuracy, but consistent feel.

---

## 2. Colour Palette & Material

### Primary colours

- **Toolbar/Window chrome**: Light grey / metallic-grey (e.g., `#E6E6E6` to `#CCCCCC`).
- **Window background/content**: White (`#FFFFFF`) or very light grey.
- **Accent blue**: e.g., `#5BA8FA` for active controls, highlights.
- **Window control buttons**: Red (`#FF5F57`), Yellow (`#FFBD2E`), Green (`#28C940`) for close/minimize/zoom (classic Mac style).
- **Disabled state colours**: Greyed-out versions, e.g., `#B0B0B0`, lowered opacity.

### Text & icon colour

- Main text: Dark grey (`#333333`).
- Secondary text: Medium grey (`#666666`).
- Icons/details: Use enough contrast to be clear; maintain the gloss/reflection vibe if possible.

### Materials & visual effects

- **Translucency**: Toolbars or window headers may have slight transparency / blur to evoke glass/gel feel.
- **Gel/gloss effect**: Buttons and controls should have subtle top-light gradient or highlight giving a “lick-me” feel. (Quoted from designer descriptions of Aqua) :contentReference[oaicite:4]{index=4}
- **Drop shadows**: Windows should cast a soft drop shadow; active vs inactive windows differ in shadow intensity.
- **Rounded corners**: Controls and windows should have gentle rounding (e.g., radius 4px–6px) to soften the visual.
- **Minimal visible borders**: Instead of heavy frames, rely on shadows and separation of layers.

---

## 3. Desktop Shell & Window Chrome

### Desktop Shell

- Full-screen “desktop” canvas, background image or solid colour. On this, you place application icons (including your “Internet Explorer” app).
- Icons: high-resolution, with gloss/shadow and depth. Should visually fit the Aqua era (not flat minimal icons).
- On click of an icon, open a window (your browser). The “window” is a UI component overlay on the desktop.

### Window Title Bar & Controls

- Title-bar background: a gradient light-grey (top lighter, bottom slightly darker) to evoke metal.
- On the left of title bar: three circular control buttons in order: red, yellow, green.
- Hover effect on control buttons: slight brighten or border. Press effect: inner shadow to appear pressed.
- The content area: white (or very light grey), with thin separation from the chrome, minimal borders.
- Window drop shadow: stronger for active window, weaker for inactive.
- Toolbar (below title bar) for the browser: matches metal-light grey theme, with icons and address bar.

---

## 4. Browser UI Elements (inside the window)

### Address Bar & Navigation

- Address bar: visually an inset rounded rectangle with inner shadow, white background, dark grey text. On focus: accent border/glow (blue).
- Navigation buttons (Back / Forward / Reload): stylised gel buttons with arrow icons.
  - Inactive state: greyed out or low opacity.
  - Hover: highlight or brighten.
  - Press: inner shadow.
- Home/Bookmark buttons: similar style.
- Tabs (if included): segmented gel-style tabs at top of toolbar:
  - Selected tab: white or very light background.
  - Unselected tabs: metal-light grey.
  - Close “X” on tab: small gel button within tab.

### Dropdowns & Menus

- Trigger buttons: gel style, chevron icon, gradient background.
- On open: menu floating below, white background, subtle border/shadow, rounded corners.
- Menu items: hover state background soft accent blue; pressed state darker.
- Separator lines: thin grey line.
- Suggestion drop-down (for address bar): same styling as menu.

### Buttons & Forms

- **Primary buttons** (e.g., “Go”, “Connect”, “Enter”): filled with accent-blue gradient (top lighter, bottom darker), white text. Gel/gloss effect.
- **Secondary buttons**: lighter metal gradient (top lighter, bottom slightly darker), dark text.
- Disabled buttons: desaturate and flatten, remove gloss, pointer-events none.
- Input fields: white background, dark text, subtle inner shadow. On focus: highlight border in accent blue, maybe slight glow.
- Form grouping: good spacing, consistent padding.

### Scrollbars & Sliders

- Scrollbars: track in light grey, thumb in darker grey/metallic; thumb maybe slightly glossy.
- Sliders: groove in metal-light colour, knob in gel style (gloss + subtle reflection).
- Focus: when dragging or on hover – highlight or change knob colour slightly.

---

## 5. Colour & Typography

### Colours (reference)

```css
--aqua-bg-content: #ffffff;
--aqua-bg-toolbar: #e6e6e6;
--aqua-accent-blue: #5ba8fa;
--aqua-text-main: #333333;
--aqua-text-secondary: #666666;
--aqua-disabled: #b0b0b0;
--aqua-btn-close: #ff5f57;
--aqua-btn-minimize: #ffbd2e;
--aqua-btn-zoom: #28c940;
```
````

### Typography

- Use system-UI font stack: `font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;`
- For retro feel (optional): use `"Lucida Grande", sans-serif` as in original macOS Aqua era. ([Wikipedia][1])
- Font sizes:
  - UI controls: ~14px
  - Body content: ~16px
  - Buttons: 13-14px bold/all-caps (optional)

- Text colour: main UI text `--aqua-text-main`, secondary `--aqua-text-secondary`.

---

## 6. Layout & Spacing

- Use consistent spacing units: e.g., `8px`, `12px`, `16px` for padding/margins.
- Toolbar height: ~40–48px.
- Button height: ~32px min.
- Tabs height: ~32px with slight overlap above toolbar.
- Title bar height: ~28–32px.
- Use generous padding around UI groups to avoid clutter. Aqua design emphasised clarity and space.

---

## 7. Behaviour & Interaction Patterns

- **Hover**: Buttons lighten or raise (slight transform translateY(-1px) optional).
- **Press**: Button appears pressed (inner shadow/inset, translateY(+1px)).
- **Disabled**: Flat, desaturated, pointer-events none.
- **Focus**: Input fields gain accent border/glow; keyboard navigation visible outline.
- **Tabs switching**: Content area changes; selected tab raised visually.
- **Window open/minimize/close**: Optional animation (fade/slide) for fun effect.
- **Dropdowns/menus**: Appear with slight fade/slide for smoothness.
- **Accessibility**: Ensure sufficient contrast; larger hit areas; focus visible; hover states not only colour-based.

---

## 8. React + Vite Implementation Notes

- You can use Tailwind CSS (you already use Tailwind) or styled-components to define your utility classes and themes.

- Define CSS variables (see palette above) so theming is easy.

- Component structure suggestion:

  ```tsx
  // Window.tsx
  import React from 'react';

  type WindowProps = {
    title: string;
    children: React.ReactNode;
    onClose?: () => void;
    onMinimize?: () => void;
    onZoom?: () => void;
  };

  export const Window: React.FC<WindowProps> = ({
    title,
    children,
    onClose,
    onMinimize,
    onZoom,
  }) => (
    <div className="relative overflow-hidden rounded-sm bg-white shadow-lg">
      <div className="flex h-10 items-center bg-gradient-to-b from-[#E6E6E6] to-[#CCCCCC] px-3">
        <div className="flex space-x-1">
          <button
            className="h-3 w-3 rounded-full bg-[#FF5F57] hover:brightness-110"
            onClick={onClose}
          />
          <button
            className="h-3 w-3 rounded-full bg-[#FFBD2E] hover:brightness-110"
            onClick={onMinimize}
          />
          <button
            className="h-3 w-3 rounded-full bg-[#28C940] hover:brightness-110"
            onClick={onZoom}
          />
        </div>
        <span className="ml-3 text-sm font-medium text-[#333333]">{title}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
  ```

- Example button component (`ButtonGel`):

  ```tsx
  type ButtonGelProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary';
  };
  export const ButtonGel: React.FC<ButtonGelProps> = ({
    variant = 'primary',
    children,
    ...props
  }) => (
    <button
      className={`inline-flex items-center justify-center rounded-md px-4 py-2 font-medium transition-all ${
        variant === 'primary'
          ? 'shadow-inner-[0_1px_0_rgba(255,255,255,0.6)] bg-gradient-to-b from-[#5BA8FA] to-[#3A7ACC] text-white shadow-[0_2px_5px_rgba(0,0,0,0.2)] hover:from-[#7CB9FF] hover:to-[#5B9FF0] active:translate-y-0.5 active:from-[#3A7ACC] active:to-[#2A5CB4]'
          : 'shadow-inner-[0_1px_0_rgba(255,255,255,0.6)] bg-gradient-to-b from-[#f0f0f0] to-[#d9d9d9] text-gray-800 shadow-[0_2px_5px_rgba(0,0,0,0.1)] hover:from-[#ffffff] hover:to-[#e5e5e5] active:from-[#d9d9d9] active:to-[#c0c0c0]'
      } `}
      {...props}
    >
      {children}
    </button>
  );
  ```

- In your Tailwind config (`tailwind.config.js`), add theme customisations:

  ```js
  module.exports = {
    theme: {
      extend: {
        colors: {
          aquaAccent: '#5BA8FA',
          aquaToolbar: '#E6E6E6',
          // etc
        },
        boxShadow: {
          aquaWindow: '0 4px 10px rgba(0,0,0,0.15)',
          // etc
        },
      },
    },
  };
  ```

- For the “desktop” shell UI: you can create a `Desktop` React component that positions icons in a grid, handles launching and managing window stacks (z-index, active/inactive states).

- Use state management (e.g., `useState`, `useContext`) to track open windows, which one is focused, etc.

---

## 9. Asset & Icon Guidelines

- Icons should be high resolution (≥ 128px) to look crisp on modern displays.
- Use PNG or SVG with appropriate detail, shadows and reflections rather than flat minimal icons.
- Maintain consistency: all icon sets should follow same gloss/lighting style.
- For your browser app icon: design a distinct, fun icon (e.g., stylised “e” for Internet Explorer) but render it in Aqua style (gel, gloss, reflections).
- For toolbar icons inside the browser: maintain the same aesthetic—gel buttons, subtle gloss, bevels.

---

## 10. Theming & Branding for Your Browser-App

- Your site’s “desktop” metaphor: treat this as a fun wrapper around your actual SaaS/trading product (or browsing feature) — it doesn’t need to be literal OS behaviour, but should evoke the desktop feel.
- The “Internet Explorer” app window: style it strongly as a window (title bar, control buttons, toolbar, content area).
- Make sure the content area (the “web surf” part) remains usable/modern: navigation, address bar, tabs, etc. But the chrome around it borrows the Aqua look.
- If you support themes or future expansion: keep variables/CSS custom properties so you could switch out of Aqua style later.

---

## 11. Checklist & Best Practices

- [ ] Buttons have hover & active states with gel/gradient effects.
- [ ] Input fields have clear focus states (border/glow) in accent blue.
- [ ] Window chrome includes title bar + control buttons + drop shadow.
- [ ] Toolbar & navigation elements match the metal/gel aesthetic.
- [ ] Tabs (if present) visually distinct and gel-styled.
- [ ] Icons maintain gloss/reflection with consistent style.
- [ ] Layout is responsive (even though desktop metaphor), scales properly for different screen sizes.
- [ ] Accessibility: colour contrast sufficient; keyboard navigation supported; focus outlines clearly visible.
- [ ] CSS custom properties/settings used for easy theming.
- [ ] Animations/transitions are subtle and performant.

---

## 12. Next Steps

- Define your component library: `Window`, `Toolbar`, `Tab`, `ButtonGel`, `InputAqua`, `DesktopShell`, `IconApp`.
- Create a design token file (CSS variables or Tailwind config) with your colour/padding/font definitions.
- Build a demo view: desktop → click browser icon → window opens → navigation UI present.
- Iterate on iconography and spacing to refine the nostalgic feel.
- Integrate your SaaS trading/back-office functionality into or alongside the browsing metaphor if applicable.

---

### Notes

Because you’re doing this in the context of your larger project (your SaaS trading app, SDK documentation, etc.), you might treat this desktop/browser metaphor as a _feature mode_ — e.g., a fun “retro browser” environment inside your SaaS for exploration, tutorials, or branding. You can include a note in your project documentation referencing your “thesis work” or the architectural intention behind the metaphor (if relevant).

---

_End of style guide._

```

---

You can now **save** this text into a file named e.g. `AquaStyleGuide.md` in your docs folder.

If you like, I can also generate a **PDF export** of this markdown, or a **Figma/Sketch mock-up file** (via share link) of the key components. Do you want me to prepare that?
::contentReference[oaicite:6]{index=6}
```

[1]: https://en.wikipedia.org/wiki/Aqua_%28user_interface%29?utm_source=chatgpt.com 'Aqua (user interface)'
