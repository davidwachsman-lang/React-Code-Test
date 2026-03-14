# PDF & Document Patterns — DW Restoration Brand System

For generating PDFs (ReportLab), Word docs (docx-js), and HTML emails that
match the React dashboard brand identity.

---

## Color Constants

```python
# Python / ReportLab
from reportlab.lib import colors

NAVY    = colors.HexColor("#0A2540")
PURPLE  = colors.HexColor("#635BFF")
SLATE   = colors.HexColor("#64748B")
BORDER  = colors.HexColor("#E2E8F0")
BGLIGHT = colors.HexColor("#F6F9FC")
WHITE   = colors.white
GREEN   = colors.HexColor("#16A34A")
GREENL  = colors.HexColor("#DCFCE7")
AMBER   = colors.HexColor("#D97706")
AMBERL  = colors.HexColor("#FEF3C7")
RED     = colors.HexColor("#DC2626")
REDL    = colors.HexColor("#FEF2F2")
BLUE    = colors.HexColor("#2563EB")
BLUEL   = colors.HexColor("#DBEAFE")
```

```javascript
// JavaScript / docx-js
const NAVY   = '0A2540';
const PURPLE = '635BFF';
const SLATE  = '64748B';
const BORDER = 'E2E8F0';
const BGPAGE = 'F6F9FC';
const GREEN  = '16A34A';
const AMBER  = 'D97706';
const RED    = 'DC2626';
```

---

## PDF Page Header (ReportLab)

```python
def draw_page_header(canvas, doc, title, subtitle=None):
    from reportlab.lib.units import inch
    w, h = letter

    # Navy bar
    canvas.setFillColor(NAVY)
    canvas.rect(0, h - 0.45*inch, w, 0.45*inch, fill=1, stroke=0)

    # Purple bottom stripe
    canvas.setFillColor(PURPLE)
    canvas.rect(0, h - 0.48*inch, w, 0.03*inch, fill=1, stroke=0)

    # Title
    canvas.setFont("Helvetica-Bold", 9)
    canvas.setFillColor(WHITE)
    canvas.drawString(0.4*inch, h - 0.3*inch, title)

    # Subtitle / right side
    if subtitle:
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(colors.HexColor("#A5B4FC"))
        canvas.drawRightString(w - 0.4*inch, h - 0.3*inch, subtitle)
```

---

## PDF Card with Left Border Stripe (ReportLab)

```python
from reportlab.platypus import Table, TableStyle
from reportlab.lib.units import inch

def make_card(content_cells, accent_color, width=9.36*inch):
    tbl = Table([content_cells], colWidths=[width])
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), WHITE),
        ("LINEBELOW",  (0,0), (-1,-1), 0.5, BORDER),
        ("LINEBEFORE", (0,0), (0,-1),  3,   accent_color),  # left stripe
        ("TOPPADDING",    (0,0), (-1,-1), 10),
        ("BOTTOMPADDING", (0,0), (-1,-1), 10),
        ("LEFTPADDING",   (0,0), (-1,-1), 12),
        ("RIGHTPADDING",  (0,0), (-1,-1), 12),
    ]))
    return tbl
```

---

## HTML Email Template

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0; padding:0; background:#F6F9FC; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">

  <!-- Header -->
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="background:#0A2540; border-bottom:3px solid #635BFF; padding:16px 32px;">
        <span style="color:#fff; font-size:16px; font-weight:700;">DW Restoration</span>
        <span style="color:#94A3B8; font-size:12px; margin-left:12px;">{{subtitle}}</span>
      </td>
    </tr>
  </table>

  <!-- Body -->
  <table width="600" align="center" cellpadding="0" cellspacing="0" style="margin:24px auto;">
    <tr>
      <td style="background:#fff; border:1px solid #E2E8F0; border-radius:8px; padding:32px;">

        <!-- Content goes here -->
        <p style="font-size:14px; color:#0A2540; line-height:1.6; margin:0 0 16px;">
          {{body}}
        </p>

        <!-- CTA Button -->
        <table cellpadding="0" cellspacing="0" style="margin:24px 0;">
          <tr>
            <td style="background:#635BFF; border-radius:6px; padding:10px 20px;">
              <a href="{{cta_url}}" style="color:#fff; font-size:14px; font-weight:600; text-decoration:none;">
                {{cta_label}}
              </a>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>

  <!-- Footer -->
  <table width="600" align="center" cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
    <tr>
      <td style="padding:16px 0; text-align:center;">
        <p style="font-size:11px; color:#94A3B8; margin:0;">DW Restoration  ·  Nashville, TN</p>
      </td>
    </tr>
  </table>

</body>
</html>
```

---

## Status Badge (HTML/inline CSS)

```html
<!-- Green / Success -->
<span style="display:inline-block; background:#DCFCE7; color:#16A34A; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.04em; padding:2px 10px; border-radius:999px;">
  Complete
</span>

<!-- Amber / Warning -->
<span style="display:inline-block; background:#FEF3C7; color:#D97706; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.04em; padding:2px 10px; border-radius:999px;">
  Pending
</span>

<!-- Red / Error -->
<span style="display:inline-block; background:#FEF2F2; color:#DC2626; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.04em; padding:2px 10px; border-radius:999px;">
  Overdue
</span>
```
