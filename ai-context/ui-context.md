# UI Context

## Theme

The application supports both **Light** and **Dark** modes, standard for modern collaborative tools.
The design language is a clean, minimal workspace focused on the canvas.

- **Light Mode**: White/off-white backgrounds, soft shadows for floating elements, providing a paper-like feel for the whiteboard.
- **Dark Mode**: Deep grey/black backgrounds, subtle borders, ensuring comfortable extended usage.
  Accent colors should be vivid to distinguish active tools, selections, and multiple users' cursors.

## Colors

Using standard shadcn/ui CSS variables. All components and custom canvas UI overlays must use these tokens — no hardcoded hex values.

### Light Mode

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 222.2 84% 4.9%;
  --radius: 0.5rem;
}
```

### Dark Mode

```css
.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --card: 222.2 84% 4.9%;
  --card-foreground: 210 40% 98%;
  --popover: 222.2 84% 4.9%;
  --popover-foreground: 210 40% 98%;
  --primary: 210 40% 98%;
  --primary-foreground: 222.2 47.4% 11.2%;
  --secondary: 217.2 32.6% 17.5%;
  --secondary-foreground: 210 40% 98%;
  --muted: 217.2 32.6% 17.5%;
  --muted-foreground: 215 20.2% 65.1%;
  --accent: 217.2 32.6% 17.5%;
  --accent-foreground: 210 40% 98%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 210 40% 98%;
  --border: 217.2 32.6% 17.5%;
  --input: 217.2 32.6% 17.5%;
  --ring: 212.7 26.8% 83.9%;
}
```

| Role            | CSS Variable                     | Context                           |
| --------------- | -------------------------------- | --------------------------------- |
| Page background | `var(--background)`              | Canvas background, app background |
| Surface         | `var(--card)` / `var(--popover)` | Toolbars, menus, dialogs          |
| Primary text    | `var(--foreground)`              | Main UI text, canvas text         |
| Muted text      | `var(--muted-foreground)`        | Helper text, inactive tools       |
| Primary accent  | `var(--primary)`                 | Active tool, primary buttons      |
| Border          | `var(--border)`                  | Toolbar borders, dividers         |
| Error           | `var(--destructive)`             | Delete actions, error states      |

## Typography

| Role      | Font       | Variable                 |
| --------- | ---------- | ------------------------ |
| UI text   | Geist Sans | `var(--font-geist-sans)` |
| Code/mono | Geist Mono | `var(--font-geist-mono)` |

_Note: The canvas text tool may support multiple standard web fonts (e.g., Arial, Courier, Comic Sans) depending on implementation details._

## Border Radius

Standardized around shadcn/ui defaults using Tailwind classes.

| Context           | Class        | Value                                  |
| ----------------- | ------------ | -------------------------------------- |
| Inline / buttons  | `rounded-md` | `0.375rem` (calc(var(--radius) - 2px)) |
| Toolbars / panels | `rounded-lg` | `0.5rem` (var(--radius))               |
| Modals / overlays | `rounded-xl` | `0.75rem` (calc(var(--radius) + 4px))  |

## Component Library

- **Framework**: React (Next.js App Router)
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui (radix-ui under the hood)
  - Must use the `npx shadcn@latest add <component>` CLI to add new components rather than writing from scratch.
  - Common components expected: Button, DropdownMenu (for export/settings), Dialog (for modals), Tooltip (for toolbar tools), Popover (for color picker/stroke width).

## Layout Patterns

Given the Real-Time Collaboration Board nature (Excalidraw clone):

- **Full Viewport Canvas**: The main HTML `<canvas>` occupies `100vw` and `100vh` and sits underneath the UI layer. It manages its own panning and zooming.
- **Floating Toolbar**: A centered, floating toolbar at the top or bottom of the screen containing drawing tools (Select, Freehand, Rectangle, Circle, Line, Text).
- **Floating Property Panel**: A floating panel (usually top-left or top-right) displaying properties for the currently selected tool or element (Stroke color, Fill color, Stroke width, Opacity).
- **Collaboration Overlays**: Live multiplayer cursors absolutely positioned on top of the canvas, translating via standard DOM elements or drawn directly on canvas.
- **Top Actions Bar**: Minimal floating buttons at the top right for Undo/Redo, Room Management, and Export (PNG/PDF).

## Icons

- **Library**: @hugeicons/core-free-icons
- **Style**: Stroke-based icons, consistent weight.
- **Sizes**:
  - `h-4 w-4` for standard inline icons or small buttons.
  - `h-5 w-5` for primary toolbar tools.
