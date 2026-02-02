# Platform Design System & Aesthetics

This document outlines the visual identity and aesthetic principles currently implemented across the platform. It serves as a reference for maintaining consistency in future development.

## 1. Color Palette

### Primary Brand Colors
The core identity is built around a vibrant, trustworthy blue and a high-visibility accent yellow.

| Token | Hex Value | Description |
| :--- | :--- | :--- |
| **Primary Blue** | `#2b33e9` | Main brand color. Used for primary buttons, active states, and key headers. |
| **Primary Dark** | `#1b21a3` | Darker shade for hover states and heavy emphasis. |
| **Primary Light** | `#7f9ce8` | Lighter tint for backgrounds and subtle accents. |
| **Accent Yellow** | `#ffba08` | High-contrast accent. Used for badges, warnings, and highlighting distinct elements. |

### Neural / Background Colors
A clean, "medicinal" and "tech" background palette.

| Token | Hex Value | Description |
| :--- | :--- | :--- |
| **Background (Page)** | `#f8fafc` | Primary page background (Cool Slate). |
| **Background (Soft)** | `#dfefe4` | Secondary soft background (MINT/Greenish Neutral). |
| **Card Background** | `#ffffff` | Standard white surface for cards and panels. |
| **Text Main** | `#0f172a` | Deep blue-black for primary readability. |
| **Text Muted** | `#475569` | Slate gray for secondary text and labels. |

### Semantic Colors
| Token | Hex Value | Usage |
| :--- | :--- | :--- |
| **Success** | `#10b981` | Validation, completion states. |
| **Danger** | `#ef4444` | Errors, destructive actions. |

---

## 2. Typography

The platform uses a modern, screen-optimized sans-serif stack.

*   **Font Family**: `'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`
*   **Base Line Height**: `1.6` (Optimized for readability)
*   **Base Letter Spacing**: `0.015em`
*   **Font Weights**:
    *   **Regular (400)**: Body text.
    *   **Medium (500)**: Secondary labels.
    *   **Bold (700)**: Buttons, Headers.
    *   **Extra Bold (800/900)**: KPI values, Page Titles.

---

## 3. Visual Effects & "Glassmorphism"

The UI relies heavily on depth, translucency, and soft shadows to create a premium, layered feel.

### Glassmorphism Pattern
Used for panels, sidebars, and overlay cards.
```css
.glass-panel {
  background: rgba(255, 255, 255, 0.7); /* High translucency */
  backdrop-filter: blur(12px);          /* Strong blur */
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.07);
}
```

### Shadows (Depth)
*   **Small**: `0 1px 2px 0 rgb(0 0 0 / 0.05)`
*   **Medium**: `0 4px 12px rgba(15, 23, 42, 0.08)`
*   **Large (Floating)**: `0 20px 40px rgba(15, 23, 42, 0.12)`

### Animations
*   **Micro-interactions**: Buttons and cards lift up (`transform: translateY(-2px)`) on hover.
*   **Page Background**: Uses a subtle radial gradient micro-pattern to add texture without noise.

---

## 4. Components & Layout

### Buttons
*   **Shape**: Rounded corners (`border-radius: 12px` or `999px` for pills).
*   **Style**: Flat colors with subtle shadows.
*   **Hover**: Lifts slightly and darkens the background color.

### Cards & Panels
*   **Border Radius**: Generous `20px` to `24px` for main containers.
*   **Borders**: Subtle `1px solid rgba(148, 163, 184, 0.2)` to define edges without harsh lines.
*   **Top Accents**: Some panels feature colored top borders (Blue, Indigo, Amber) to denote category.

### Navigation (Sidebar)
*   **Style**: "Floating" sidebar detached from the edge.
*   **Appearance**: Glassmorphic white surface.
*   **Active State**: Items get a left border strip and a soft blue background (`#f0f9ff`).

### Layout Structure
*   **Dashboard**: Grid-based (`grid-template-columns`) with a clear separation between the "Experiments List" and "Details Panel".
*   **Studio**: Flexbox layout with a central canvas (Bubble Chart) and a right-hand parameter column.

---

## 5. CSS Variables Reference
Key variables extracted from `styles.css`:

```css
:root {
  --primary-color: #2b33e9;
  --accent-color: #ffba08;
  --bg-color: #f8fafc;
  --text-main: #0f172a;
  --radius-lg: 12px;
  --glass-blur: blur(12px);
}
```
