# Precision Theme Progress

Tracks which pages have been updated to use the landing page (Intake) Precision theme. **UI-only** changes; no functionality changes.

**Base theme:** Precision Interface Theme (see `landing_page_ui_design_spec.md` / `src/styles/PrecisionTheme.css`)

---

## Improved (Precision theme applied)

| Page              | Route        | Notes                    |
|-------------------|-------------|--------------------------|
| Intake            | `/`         | Landing page; reference  |
| Dispatch & Scheduling | `/dispatch` | Already aligned with spec |
| WIP Board         | `/wip-board` | Precision layout, tabs, tokens; kanban columns and cards restyled |

---

## Not yet improved

| Page                 | Route              |
|----------------------|--------------------|
| Estimating           | `/estimating`      |
| Job Files            | `/job-files`       |
| Forms                | `/forms`           |
| CRM                  | `/crm`             |
| Field Services       | `/field-services`  |
| Goals                | `/goals`           |
| Financials & Billing | `/financials`     |
| TM Estimate          | `/tm-estimate`     |
| Reporting & Analytics| `/reporting`       |
| Daily War Room       | `/war-room`        |
| Storm                | `/storm`           |
| Expectations 2026    | `/expectations-2026` |
| Sandbox              | `/sandbox`         |
| Insurance Job SOPs   | `/insurance-job-sops` |
| Conversion           | `/conversion`      |

---

## Light mode visibility checklist

When applying the Precision theme to other pages, verify:

- **Text contrast:** Use `--precision-text-primary` for primary content and `--precision-text-secondary` for labels; reserve `--precision-text-muted` for placeholders/hints and ensure they sit on backgrounds where they remain readable (or use secondary in light areas).
- **Borders and dividers:** Avoid borders/dividers that are too faint in light mode (e.g. rgba with very low opacity or same-as-background tokens). Prefer at least 0.25–0.4 opacity for slate borders or a dedicated border/divider token if one is added later.
- **Empty and secondary UI:** Empty states, placeholders, and scrollbars should use at least `--precision-text-secondary` (or equivalent contrast) in light mode so they are visible.
- **Verify both themes:** After styling, check the page in both light and dark mode to confirm all interactive and structural elements (cards, columns, dividers, buttons, tabs) are clearly visible.

---

*Update this file when a page is restyled to the Precision theme.*
