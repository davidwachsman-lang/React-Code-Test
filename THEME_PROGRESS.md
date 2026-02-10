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

### Not yet improved

| Page                   | Route               |
|------------------------|---------------------|
| Job Files              | `/job-files`        |
| Forms                  | `/forms`            |
| Goals                  | `/goals`            |
| Financials & Billing   | `/financials`      |
| TM Estimate            | `/tm-estimate`      |
| Reporting & Analytics  | `/reporting`       |
| Daily War Room         | `/war-room`         |
| Storm                  | `/storm`            |
| Expectations 2026      | `/expectations-2026` |
| Sandbox                | `/sandbox`          |
| Insurance Job SOPs     | `/insurance-job-sops` |
| Conversion             | `/conversion`       |

---

**When you finish theming a page:** Move it from “Not yet improved” to “Improved” and add a short note in the Notes column.
