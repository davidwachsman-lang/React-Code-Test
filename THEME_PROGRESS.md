# Precision Theme Progress

Single source of truth for theme rollout and design rules. **UI-only** changes; no functionality changes.

**Base theme:** Precision Interface Theme — [landing_page_ui_design_spec.md](landing_page_ui_design_spec.md) / [src/styles/PrecisionTheme.css](src/styles/PrecisionTheme.css)

---

## Design context

- **Origin:** Pages were designed in **dark mode** first. A universal **light mode** was added later (starting with Intake) to improve usability and avoid a generic “too AI” look.
- **Constraint:** When improving or theming any page, the only difference between light and dark mode must be **color** (and optional background). Layout, padding, margins, and structure must be identical in both modes.

---

## Rules when improving or theming a page

1. **Use the frontend-design skill**  
   Commit to a clear aesthetic; use distinctive typography and color; add purposeful motion and spatial composition; avoid generic AI aesthetics (Inter, Roboto, purple-on-white, cookie-cutter layouts).

2. **Light mode: readable, high-contrast text**  
   Use font colors that are **visually pleasing and easy to read**. Prefer `--precision-text-primary` for main content and `--precision-text-secondary` for labels. Use `--precision-text-muted` only for placeholders/hints where it stays readable. Avoid grey or washed-out text on light backgrounds.

3. **Layout parity**  
   Do not add padding, margin, border-radius, or dimensions only in one mode. Put layout in base rules; use `html:not(.dark-mode)` / `html.dark-mode` only for **color** and **background**.

4. **Visibility in both modes**  
   - Borders/dividers: use at least 0.25–0.4 opacity for slate borders so they are visible in light mode.  
   - Empty states, placeholders, scrollbars: use at least `--precision-text-secondary` in light mode.  
   - After styling, check the page in **both** light and dark mode.

---

## ⚠️ STANDARD INPUT DESIGN — MANDATORY SITE-WIDE BEHAVIOR

**This section defines the canonical text-input behavior for the Precision theme. Every new or restyled text input (and similar form fields) MUST follow it. Do not deviate.**

### Reference implementations (copy this behavior)

- **Intake:** `#callerName` with class `.p-input` — [src/pages/Intake.css](src/pages/Intake.css), [src/index.css](src/index.css)
- **Field Services → Schedule & Dispatch:** Technician Name input `#technicianName` with class `.p-input` — [src/components/ScheduleView.css](src/components/ScheduleView.css)

If an input does not look or behave like these, it is wrong. Fix it.

---

### Exact UI behavior (state by state)

#### 1. Default (rest state)

| Property       | Value |
|----------------|--------|
| `background-color` | `var(--precision-input-bg)` |
| `border`           | `1px solid transparent` |
| `color`            | `var(--precision-text-primary)` |
| `transition`       | `all 0.2s` |

- **Light mode:** Background = light grey well `#F1F5F9`.
- **Dark mode:** Background = charcoal well `#262626`.

#### 2. Hover — CRITICAL: only background changes

On hover, **only** the background changes. There is **no** border color change, **no** box-shadow, **no** outline, **no** text color change.

| Property       | Value |
|----------------|--------|
| `background-color` | `var(--precision-input-bg-hover)` |

- **Light mode:** Slightly darker grey `#E2E8F0`.
- **Dark mode:** Lighter charcoal `#333333`.

The `transition: all 0.2s` on the default state makes this change animate smoothly. Do not add any other visual change on hover.

#### 3. Focus

| Property       | Value |
|----------------|--------|
| `outline`      | `none` |
| `background-color` | `var(--precision-surface)` |
| `box-shadow`   | `inset 0 0 0 1px var(--precision-border-focus)` |

- **Light mode:** White surface + ServPro orange inset ring.
- **Dark mode:** Surface `#1A1A1A` + orange inset ring.

#### 4. Placeholder

| Property  | Value |
|-----------|--------|
| `color`   | `var(--precision-text-muted)` |
| `opacity` | `1` |

---

### Implementation checklist

When adding or restyling any text input:

1. **Mark the control:** Use class `p-input` on the `<input>` (and keep existing `id` if any).
2. **Base styles:** Set `background-color`, `border`, `color`, `transition` as in “Default” above. Include `border-radius: var(--precision-radius-sm)`, `padding: 0.75rem 1rem`, `font-size: 0.95rem`, `height: 49px`, `box-sizing: border-box` for visual parity with Intake.
3. **Hover:** Add **only** `background-color: var(--precision-input-bg-hover)` in a `:hover` rule. Do not add border, shadow, or outline on hover.
4. **Focus:** Add the focus rule above (outline none, surface background, inset box-shadow).
5. **Placeholder:** Style `::placeholder` with the color and opacity above.
6. **Specificity:** If the input lives in a page that has global rules for `.form-group input` (e.g. TimeTracking.css, CRM.css), use a **high-specificity selector** (e.g. `.schedule-view-container .schedule-form .form-group input.p-input`) so the Precision rules win. Do not rely on order alone.

---

### What NOT to do

- **Do not** change border color or add a visible border on hover.
- **Do not** add `box-shadow` or `outline` on hover.
- **Do not** use a different transition duration or omit `transition` on the base state.
- **Do not** use ad-hoc hex colors; use the theme variables above.
- **Do not** assume a single global `.p-input` rule is enough if the page has other `.form-group input` styles; use a scoped, high-specificity block when needed.

---

### Quick reference: full block (copy and scope as needed)

```css
/* Scope selector to your container so it overrides global .form-group input */
.your-container .form-group input.p-input {
  background-color: var(--precision-input-bg);
  border: 1px solid transparent;
  border-radius: var(--precision-radius-sm);
  color: var(--precision-text-primary);
  padding: 0.75rem 1rem;
  font-size: 0.95rem;
  height: 49px;
  box-sizing: border-box;
  transition: all 0.2s;
}
.your-container .form-group input.p-input:hover {
  background-color: var(--precision-input-bg-hover);
}
.your-container .form-group input.p-input:focus {
  outline: none;
  background-color: var(--precision-surface);
  box-shadow: inset 0 0 0 1px var(--precision-border-focus);
}
.your-container .form-group input.p-input::placeholder {
  color: var(--precision-text-muted);
  opacity: 1;
}
```

---

## Page status

### Improved (Precision theme applied)

| Page                   | Route         | Notes                                              |
|------------------------|---------------|----------------------------------------------------|
| Intake                 | `/`           | Landing page; reference implementation             |
| Dispatch & Scheduling  | `/dispatch`   | Aligned with spec                                  |
| WIP Board              | `/wip-board`  | Precision layout, tabs, tokens; kanban restyled    |
| Estimating             | `/estimating` | Precision layout, forms, tables, totals; light/dark parity |
| CRM                    | `/crm`              | Precision layout, tab buttons, all child components; light/dark parity |
| Field Services         | `/field-services`   | Precision layout, section cards, ScheduleView + TimeTracking + docs panel; light/dark parity |
| Goals                  | `/goals`            | Precision layout, tokens, light/dark parity; status via CSS classes; staggered section entrance |
| Reporting & Analytics  | `/reporting`        | Precision layout, tokens, report cards and buttons; light/dark parity |
| Financials & Billing  | `/financials`      | Precision layout, tokens, content card; light/dark parity              |
| Storm                 | `/storm`           | Precision layout, tokens, tabs/forms/tables/modals and StormMap; standard input design; light/dark parity |
| Expectations 2026     | `/expectations-2026` | Precision layout, tokens, role selector/scorecard/notes; standard input for textareas and select; light/dark parity |
| Sandbox                | `/sandbox`          | Precision layout, tokens, action links and tab buttons; PerformanceScorecard + eNPS survey; light/dark parity |
| Conversion             | `/conversion`       | Precision layout, tokens, funnel table, ribbon rows, estimate tables and status badges; light/dark parity |
| Daily War Room         | `/war-room`         | Precision layout, tokens, sidebar/metrics; staggered metric card reveal; urgent/warning via tokens; light/dark parity |
| TM Estimate            | `/tm-estimate`      | Precision layout, tokens, schedule cards; standard input design; staggered reveal; light/dark parity |
| Forms                  | `/forms`            | Precision layout, tokens, category/subcategory cards; search with standard input; staggered reveal; light/dark parity |

### Not yet improved

| Page                   | Route               |
|------------------------|---------------------|
| Job Files              | `/job-files`        |
| Insurance Job SOPs     | `/insurance-job-sops` |

---

**When you finish theming a page:** Move it from “Not yet improved” to “Improved” and add a short note in the Notes column.
