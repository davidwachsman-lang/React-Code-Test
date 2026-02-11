# Improve UI (ServPro) — Single-page Precision theme migration

Use this skill when the user asks to **improve the UI** of a specific page, **migrate a page to Precision theme**, or **use improve-ui-servpro** to improve one page. It applies the same patterns used for Intake, CRM, Field Services, Goals, Reporting, Financials, and Storm.

**Scope:** One page at a time. The user names the page (or route); you improve that page and any CSS/components that belong to it. Do not change other pages unless the user asks.

---

## When to use this skill

- User says: "Improve the UI of [page name]", "Improve [route] page", "Use improve-ui-servpro to improve [page]", "Migrate [page] to Precision theme", or similar.
- Goal: Make the page support **light and dark mode** with **Precision theme** tokens, remove **Page.css** dependency and dark-only styling, and align with THEME_PROGRESS.md.

---

## Before you start

1. **Identify the page:** Resolve the page component and route (e.g. Job Files → `src/pages/JobFiles.jsx`, route `/job-files`). Check [THEME_PROGRESS.md](THEME_PROGRESS.md) — if the page is already in the "Improved" table, tell the user and ask if they want a different page or refinements.
2. **List assets:** Note the page’s main CSS file(s) and any **child components** (and their CSS) that are only or mainly used by this page. All of them must be updated so the page looks correct in both modes.
3. **Read THEME_PROGRESS.md:** Follow the "Rules when improving or theming a page" and the **STANDARD INPUT DESIGN** section. Reference: [THEME_PROGRESS.md](THEME_PROGRESS.md), [src/styles/PrecisionTheme.css](src/styles/PrecisionTheme.css), [src/index.css](src/index.css) for `.precision-layout` / `.precision-main`.

---

## Step-by-step: one page improvement

### 1. Page shell (JSX)

- **Remove** `import './Page.css'` from the page component.
- **Add** or keep a page-specific CSS import (e.g. `import './JobFiles.css'`).
- **Replace** root layout with Precision structure:
  - Root: `<div className="precision-layout {page-name}-page">` (e.g. `job-files-page`, `forms-page`).
  - Inner: `<div className="precision-main">`.
  - Header: a dedicated header block inside `precision-main` (e.g. `<header className="job-files-header">` or `precision-header`) with:
    - `<h1>` — page title, no gradient; color comes from CSS tokens.
    - Optional `<p>` — short subtitle with token-based secondary/muted color.
  - Content: wrap the main content in `<div className="precision-content">` or a page-specific content wrapper (e.g. `job-files-content`).
- **Fix inline styles** that set colors (e.g. `style={{ color: '#ffffff' }}`, `style={{ backgroundColor: '...' }}`). Replace with CSS classes that use `var(--precision-*)` (e.g. a class like `activity-header-cell` or semantic status classes).
- Do **not** change data, behavior, or form fields; only layout and class names.

### 2. Page CSS

- **Scope** layout/header under the page class (e.g. `.job-files-page .job-files-header h1`).
- **Layout:** Rely on `.precision-layout` and `.precision-main` from [src/index.css](src/index.css). Set header `h1` to `color: var(--precision-text-primary)`; subtitle `p` to `color: var(--precision-text-secondary)`.
- **Containers/cards:** Use `background-color: var(--precision-surface)` or `var(--precision-input-bg)`; border `1px solid rgba(148, 163, 184, 0.25)`; no blue or purple gradients.
- **Borders/dividers:** Use `rgba(148, 163, 184, 0.2)`–`0.25` so they are visible in both modes.
- **Text:** Use `var(--precision-text-primary)` for main content, `var(--precision-text-secondary)` for labels/secondary, `var(--precision-text-muted)` only for placeholders/hints.
- **Buttons:** Solid colors only — primary: `background-color: var(--precision-primary)`, hover `var(--precision-primary-hover)` or `filter: brightness(1.08)`; secondary/neutral with tokens. No `linear-gradient` for buttons.
- **Tabs / nav:** Inactive: `var(--precision-input-bg)` and token text; active: `var(--precision-primary)` or clear active state with token borders/backgrounds.
- **Form inputs (if any):** Apply THEME_PROGRESS standard input design:
  - Default: `background-color: var(--precision-input-bg)`, `border: 1px solid transparent`, `color: var(--precision-text-primary)`, `transition: all 0.2s`.
  - Hover: **only** `background-color: var(--precision-input-bg-hover)`.
  - Focus: `outline: none`, `background-color: var(--precision-surface)`, `box-shadow: inset 0 0 0 1px var(--precision-border-focus)`.
  - Placeholder: `color: var(--precision-text-muted)`, `opacity: 1`.
  - Use high-specificity selectors (e.g. `.job-files-page .form-group input`) or class `p-input` so Precision rules win over other `.form-group` styles.
- **Tables:** Headers/cells and row borders with token backgrounds and borders; text and hover from tokens.
- **Status/badges:** Use `var(--precision-success)`, `var(--precision-warning)`, `var(--precision-error)`, `var(--precision-primary)` with alpha backgrounds (e.g. `color-mix(in srgb, var(--precision-success) 15%, transparent)`) instead of hardcoded hex.
- **Modals:** Overlay `rgba(0,0,0,0.5)` or `0.6`; content `var(--precision-surface)`, border and shadow from tokens; header and close button from tokens.
- **Empty/loading states:** `color: var(--precision-text-secondary)` or `var(--precision-error)` for errors.
- **Motion (optional):** Staggered fade-up for header and main content (keyframe with opacity + translateY, animation-delay) to match Goals/Reporting.
- **Layout parity:** Same padding, margins, grid, and structure in light and dark; only colors differ. Do not add layout rules only in `html:not(.dark-mode)` or `html.dark-mode`.

### 3. Child components used only by this page

- For each component (and its CSS) that is specific to this page, replace hardcoded colors with Precision tokens: surfaces, text, borders, buttons, inputs (if any) per THEME_PROGRESS. Same rules as in step 2.

### 4. THEME_PROGRESS.md

- Move the page from **"Not yet improved"** to **"Improved"**.
- Add a short note in the Notes column (e.g. "Precision layout, tokens; light/dark parity." or a one-line description of what was done).

### 5. Verification

- Confirm in **light mode**: no gradient h1, no blue/purple gradient panels, all text readable, borders visible.
- Confirm in **dark mode**: toggle theme and check contrast and accents.
- If the page has forms, confirm inputs match Intake/ScheduleView behavior (rest, hover, focus, placeholder) per THEME_PROGRESS.

---

## References (in this project)

- **Theme tokens and layout:** [src/styles/PrecisionTheme.css](src/styles/PrecisionTheme.css), [src/index.css](src/index.css).
- **Rules and input standard:** [THEME_PROGRESS.md](THEME_PROGRESS.md).
- **Example improved pages:** [src/pages/Goals.jsx](src/pages/Goals.jsx) + Goals.css, [src/pages/FinancialsAndBilling.jsx](src/pages/FinancialsAndBilling.jsx) + FinancialsAndBilling.css, [src/pages/ReportingAndAnalytics.jsx](src/pages/ReportingAndAnalytics.jsx) + ReportingAndAnalytics.css.

---

## Do not

- Change [Page.css](src/pages/Page.css) or improve other pages unless the user asks.
- Add layout or spacing only in light or only in dark mode.
- Use hardcoded hex/rgba for text, backgrounds, or borders; use `var(--precision-*)` and the slate border rgba above.
- Use blue/purple gradients for titles or buttons.
- Skip THEME_PROGRESS standard input design for any text input on the page.

---

## Output

After completing the improvement, provide a short summary: what was changed (files and main edits), how to verify (light/dark, key areas), and that THEME_PROGRESS.md was updated.
