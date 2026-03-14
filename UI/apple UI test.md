# Design System Migration: Apple Theme Test

## Task
Refactor a single page component to use the Apple brand design system below.
Do NOT touch any other files. This is a visual test only — no logic changes.

---

## Apple Design Tokens

### Colors
```
bg:          #F5F5F7   (page background)
surface:     #ffffff   (cards, panels)
surfaceAlt:  #f5f5f7   (table headers, secondary surfaces)
border:      #d2d2d7   (all borders)
borderMid:   #c6c6c8   (heavier borders)

textPrimary:   #1D1D1F
textSecondary: #86868B
textTertiary:  #a1a1a6

primary:     #0071e3   (primary CTA buttons, active states, links)
primaryHover:#0077ed
primarySoft: #e8f2ff

success:     #34c759  |  successSoft: #eaf9ef
warning:     #ff9500  |  warningSoft: #fff4e5
danger:      #ff3b30  |  dangerSoft:  #ffebeb
```

### Typography
- Font: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif
- H1: 32px, weight 600, letter-spacing -0.003em, color #1D1D1F
- Section headings (panel/card titles): 17px, weight 600, letter-spacing -0.003em, color #1D1D1F, normal case
- Field labels: 11px, weight 600, uppercase, letter-spacing 0.05em, color #86868B
- Body: 14px, weight 400, color #1D1D1F
- Data/numbers: weight 600, mono-spaced numbers

### Components

**Page background**
```css
background: #F5F5F7;
```

**Nav**
```css
background: rgba(255, 255, 255, 0.72);
backdrop-filter: saturate(180%) blur(20px);
height: 52px;
border-bottom: 1px solid rgba(0, 0, 0, 0.1);
/* Nav links: color #1D1D1F, active: weight 600 */
```

**Cards / Panels**
```css
background: #ffffff;
border: 1px solid rgba(0, 0, 0, 0.05); /* Apple uses very subtle borders, not purely borderless */
border-radius: 18px; /* Slightly larger radii match iOS 15+ & macOS */
box-shadow: 0 4px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04); /* More diffuse, slightly softer shadow */
```

**Table / list headers**
```css
background: transparent;
border-bottom: 1px solid #d2d2d7;
font-size: 11px; font-weight: 600; text-transform: uppercase;
letter-spacing: 0.05em; color: #86868B;
```

**Active row**
```css
background: #e8f2ff;
border-radius: 8px;
```

**Badges (status pills)**
```css
border-radius: 999px;
padding: 4px 10px;
font-size: 12px; font-weight: 500;
/* Use soft background + matching text color, no hard borders */
```

**Primary button**
```css
background: #0071e3;
color: white;
border-radius: 999px; /* Pill shape */
padding: 8px 16px;
font-weight: 400;
font-size: 14px;
/* hover: #0077ed */
/* NO gradient, NO translateY hover lift */
```

**Ghost button**
```css
background: transparent;
border: 1px solid #0071e3;
border-radius: 999px;
color: #0071e3;
/* hover: background #e8f2ff */
```

**Inputs**
```css
background: #f5f5f7; /* Apple often uses light gray backgrounds for un-focused inputs */
border: 1px solid transparent; 
border-radius: 10px;
padding: 10px 14px;
/* focus: background #ffffff, box-shadow 0 0 0 4px rgba(0,113,227,0.2), border-color #0071e3 */
/* NO dark fill */
```

**Stat cards**
```css
background: #ffffff;
border: none;
border-radius: 18px;
box-shadow: 0 4px 6px rgba(0,0,0,0.02), 0 1px 3px rgba(0,0,0,0.04);
/* label: 12px weight 600 #86868B */
/* value: 32px weight 600 #1D1D1F */
/* delta: 13px weight 500, green if positive, warning if negative */
```

---

## What to strip out
- Heavy dark gradients or dark panels
- Sharp, hard corners (replace with Apple radii - usually 12-18px for containers, 8px for inner elements, fully rounded for buttons)
- Heavy drop shadows (use the highly diffuse, subtle layered shadows provided)
- Heavy text shadows
- "Outlined" style cards (Apple prefers a filled white surface with minimal borders and subtle soft shadows)

## What to keep
- All component logic, props, data fetching, state
- All Tailwind class structure (just swap the color/style values)
- All spacing and layout, but ensure sufficient padding (Apple uses generous, airy padding)
- Animations are OK to keep if subtle (Apple uses spring-based, non-linear easing)
- Apply Apple's signature glassmorphism (`backdrop-filter`) on navigational and floating sticky elements

## Dark Mode Considerations (If Applicable)
- Background: `#000000` (true black) or `#1c1c1e` (elevated dark gray)
- Surfaces/Cards: `#1c1c1e` or `#2c2c2e`
- Text: `#f5f5f7` (Primary), `#ebebf5` with 60% opacity (Secondary)
- Emphasize borders (`border: 1px solid rgba(255,255,255,0.1)`) instead of shadows in Dark Mode.

---

## Instructions for Claude Code
1. Ask me which page/component file to migrate
2. Read the file
3. Apply the token swaps above — colors, typography, border-radii, backgrounds, buttons
4. Output the refactored file
5. Do NOT modify any other files
6. Add a comment at top: `/* APPLE THEME TEST — revert to original DS to undo */`
