---
name: dw-brand-system
description: >
  Applies DW Restoration's brand identity system to any UI work in this
  React/Tailwind codebase. Use this skill whenever building new components,
  pages, or layouts — including dashboards, forms, tables, stat cards, modals,
  emails, PDF exports, and printed documents. Trigger on any request that
  involves visual output: "build a component", "style this", "make it look
  consistent", "create a page", "design a layout", "update the UI", or any
  request involving colors, fonts, spacing, or visual design. Also apply when
  generating non-React output (PDFs, Word docs, HTML emails) to ensure brand
  consistency across all surfaces.
---

# DW Restoration — Brand System

This codebase uses a unified brand identity derived from Stripe's design
language. The goal is a data-dense, professional, trustworthy UI that works
for field crews, project managers, office staff, and external stakeholders
(adjusters, homeowners, subcontractors) alike.

When building anything visual, apply this system by default. Do not invent
new colors, fonts, or spacing scales. When in doubt, reference the tokens
below and the component patterns in `references/components.md`.

---

## Core Philosophy

**Clarity over decoration.** This is an ops dashboard used under pressure —
someone dispatching a crew at 11pm, an office manager chasing AR. Every
design decision should reduce cognitive load, not add visual noise.

**Data density with breathing room.** Pack information efficiently but use
whitespace deliberately. Tables should be scannable. Cards should be
glanceable.

**Trust signals everywhere.** Navy and white communicate professionalism to
adjusters and homeowners. Purple is used sparingly — only for primary actions
and active states. Never use it decoratively.

---

## Color Tokens

### Core Palette

```
Navy     #0A2540   — Primary text, headers, nav background, page anchors
Purple   #635BFF   — Primary CTA, active states, links, accent borders
Slate    #64748B   — Secondary text, labels, muted content
Page BG  #F6F9FC   — Overall page background (very light blue-gray)
Surface  #FFFFFF   — Card and panel backgrounds
Border   #E2E8F0   — All borders, dividers, table rules
```

### Semantic / Status Colors

```
Green    #16A34A   — Success, completed, paid, approved
Green BG #DCFCE7   — Green badge/pill background

Amber    #D97706   — Warning, pending, in-progress, review needed
Amber BG #FEF3C7   — Amber badge/pill background

Red      #DC2626   — Error, overdue, denied, critical
Red BG   #FEF2F2   — Red badge/pill background

Blue     #2563EB   — Info, insurance/claims category
Blue BG  #DBEAFE   — Blue badge/pill background
```

### Category Colors (for department/section accents)

Use these as left-border stripes, dot indicators, and section header accents.
Never use them as large background fills.

```
Insurance & Claims      #2563EB  (blue)
Field Operations        #CA8A04  (amber)
Customer Communication  #16A34A  (green)
Sales & Estimating      #9333EA  (violet)
Finance & AR            #EA580C  (orange)
HR & Team               #0284C7  (teal)
Vendor & Subcontractor  #DB2777  (pink)
Legal & Compliance      #DC2626  (red)
Tech & Automation       #059669  (emerald)
```

### Text Colors

```
Primary text    #0A2540   — Headings, important data
Secondary text  #64748B   — Labels, descriptions, metadata
Muted text      #94A3B8   — Placeholders, disabled, timestamps
Inverse text    #FFFFFF   — Text on dark backgrounds
Accent text     #635BFF   — Links, trigger phrases, active labels
```

---

## Typography

### Font Stack

```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

Load Inter from Google Fonts with optical sizing:
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700;14..32,800&display=swap" rel="stylesheet">
```

### Type Scale

```
Display     36px / 800   — Page titles, hero numbers
H1          28px / 700   — Section headings
H2          22px / 700   — Card titles, modal headers
H3          16px / 600   — Subsection labels
Body        14px / 400   — Default body text
Body SM     13px / 400   — Secondary descriptions
Label       12px / 600   — Form labels, table headers (uppercase + tracking)
Caption     11px / 500   — Timestamps, metadata, badge text
Mono        13px         — Job IDs, claim numbers, code (font-family: monospace)
```

### Label Convention

Section labels and table column headers use this treatment:
```
FONT-SIZE: 11px
FONT-WEIGHT: 600
TEXT-TRANSFORM: uppercase
LETTER-SPACING: 0.5px
COLOR: #94A3B8
```

---

## Spacing Scale

Based on 4px grid. Use multiples of 4.

```
4px   — xs: tight internal padding (badge inner)
8px   — sm: component internal padding
12px  — md: card padding (tight)
16px  — base: standard component padding
24px  — lg: card padding (default), section gap
32px  — xl: page section spacing
48px  — 2xl: major section breaks
```

---

## Border & Shadow

```
Border radius:
  Cards / panels    8px
  Buttons           6px
  Inputs            6px
  Badges / pills    999px (fully rounded)
  Stat numbers      4px (subtle highlight)

Borders:
  Default           1px solid #E2E8F0
  Active / focused  1.5px solid #635BFF
  Error             1.5px solid #DC2626

Shadows:
  Card default      0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)
  Card hover        0 4px 16px rgba(0,0,0,0.08)
  Card active       0 4px 16px rgba(99,91,255,0.12)
  Modal             0 20px 60px rgba(0,0,0,0.15)
```

---

## Component Patterns

See `references/components.md` for full code examples. Quick reference:

### Stat Card
White surface, 1px border, 8px radius. Top border stripe in category color
(3px). Large number in navy (36px/700). Delta value colored green/red. Label
in uppercase muted gray.

### Job Row (Table)
Alternating white / #F8FAFC rows. Active row: left purple border (3px) +
#F7F6FF background tint. Status badge: pill shape, semantic color.

### Badge / Pill
```
High / Approved / Paid    bg: #DCFCE7   text: #16A34A
Medium / Pending          bg: #FEF3C7   text: #D97706
Low / Draft               bg: #F1F5F9   text: #64748B
Error / Overdue / Denied  bg: #FEF2F2   text: #DC2626
Info / In Progress        bg: #DBEAFE   text: #2563EB
```

### Button
```
Primary:   bg #635BFF, white text, 6px radius, hover darken 10%
           box-shadow: 0 2px 8px rgba(99,91,255,0.25) on hover
Secondary: bg white, border #E2E8F0, navy text, hover bg #F8FAFC
Danger:    bg white, border #DC2626, red text, hover bg #FEF2F2
```

### Nav / Sidebar
Background `#0A2540`. Active item: left purple border (3px) + `rgba(99,91,255,0.12)` background. Text white, muted items `#94A3B8`.

### Input / Form Field
White background, `#E2E8F0` border, 6px radius, 14px Inter. Focus ring:
`1.5px solid #635BFF` with `rgba(99,91,255,0.1)` box-shadow. Label above in
uppercase label style.

### Section Header (Page Level)
```
Navy background  (#0A2540)
3px purple bottom border
White heading text, 20px/700
Subtitle in #94A3B8, 13px
Padding: 20px 24px
```

---

## Tailwind Config

If using Tailwind, extend your config with these tokens:

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          navy:    '#0A2540',
          purple:  '#635BFF',
          purpleL: '#EEEDFF',
          slate:   '#64748B',
          border:  '#E2E8F0',
          bg:      '#F6F9FC',
        },
        status: {
          green:   '#16A34A',
          greenBg: '#DCFCE7',
          amber:   '#D97706',
          amberBg: '#FEF3C7',
          red:     '#DC2626',
          redBg:   '#FEF2F2',
          blue:    '#2563EB',
          blueBg:  '#DBEAFE',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      fontSize: {
        'display': ['36px', { fontWeight: '800', lineHeight: '1.1' }],
        'h1':      ['28px', { fontWeight: '700', lineHeight: '1.2' }],
        'h2':      ['22px', { fontWeight: '700', lineHeight: '1.3' }],
        'h3':      ['16px', { fontWeight: '600', lineHeight: '1.4' }],
        'label':   ['11px', { fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase' }],
      },
      boxShadow: {
        'card':       '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 16px rgba(0,0,0,0.08)',
        'card-brand': '0 4px 16px rgba(99,91,255,0.12)',
        'modal':      '0 20px 60px rgba(0,0,0,0.15)',
      },
      borderRadius: {
        'card': '8px',
        'btn':  '6px',
        'pill': '999px',
      },
    },
  },
}
```

---

## CSS Variables (alternative to Tailwind)

```css
:root {
  /* Core */
  --color-navy:    #0A2540;
  --color-purple:  #635BFF;
  --color-purpleL: #EEEDFF;
  --color-slate:   #64748B;
  --color-border:  #E2E8F0;
  --color-bg:      #F6F9FC;
  --color-surface: #FFFFFF;

  /* Status */
  --color-green:   #16A34A;
  --color-greenBg: #DCFCE7;
  --color-amber:   #D97706;
  --color-amberBg: #FEF3C7;
  --color-red:     #DC2626;
  --color-redBg:   #FEF2F2;
  --color-blue:    #2563EB;
  --color-blueBg:  #DBEAFE;

  /* Text */
  --text-primary:   #0A2540;
  --text-secondary: #64748B;
  --text-muted:     #94A3B8;
  --text-inverse:   #FFFFFF;
  --text-accent:    #635BFF;

  /* Typography */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;

  /* Spacing */
  --space-xs:   4px;
  --space-sm:   8px;
  --space-md:   12px;
  --space-base: 16px;
  --space-lg:   24px;
  --space-xl:   32px;
  --space-2xl:  48px;

  /* Radius */
  --radius-card: 8px;
  --radius-btn:  6px;
  --radius-pill: 999px;

  /* Shadows */
  --shadow-card:       0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-card-hover: 0 4px 16px rgba(0,0,0,0.08);
  --shadow-brand:      0 4px 16px rgba(99,91,255,0.12);
  --shadow-modal:      0 20px 60px rgba(0,0,0,0.15);
}
```

---

## Do / Don't

**DO:**
- Use navy for all page-level headers and navigation
- Use purple only for primary CTAs, active states, and key accent borders
- Use semantic colors (green/amber/red) for status — not arbitrarily
- Apply the left-border stripe pattern for category differentiation on cards
- Use Inter with optical sizing (`font-feature-settings: 'opsz'`)
- Keep badge text 11px uppercase on all status indicators
- Use `#F6F9FC` as page background, white as card/surface background

**DON'T:**
- Don't use glassmorphism, gradients, or blur effects — this is a light-mode system
- Don't use dark backgrounds on content pages (navy is only for chrome/nav)
- Don't add new accent colors without a clear semantic reason
- Don't use purple decoratively — only for interaction and active states
- Don't use more than 2 font weights in a single card component
- Don't use border-radius larger than 8px on cards or panels
- Don't use box-shadows on more than one layer at a time (no shadow stacking)

---

## Cross-Surface Consistency

This brand system applies beyond the React app:

**PDFs / Documents:** Use Helvetica-Bold as font fallback, same hex colors,
same navy header bars with purple bottom stripe, same card left-border pattern.

**Emails (HTML):** Inline the CSS variables above. Navy header, white body,
purple CTA button, same badge colors for status.

**Printed reports:** Navy/white with purple accent. Avoid category colors on
print — use grayscale fallbacks for black-and-white printing.

For detailed component code examples, see `references/components.md`.
For PDF/document generation patterns, see `references/pdf-patterns.md`.
