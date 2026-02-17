# Bootstrap Precision Theme — One-time setup

Use this skill when the user asks to **bootstrap the Precision theme** on a branch that lacks theme infrastructure (e.g. a fresh branch from `main`). Run this **once** before using **improve-ui-servpro** to improve pages one by one.

**Scope:** Add ThemeContext, PrecisionTheme.css, theme toggle, and layout tokens. Do not change page components or business logic.

---

## When to use

- "Bootstrap Precision theme", "Set up theme infrastructure", "Add Precision theme to this branch"
- Context: Branch lacks `ThemeContext`, `PrecisionTheme.css`, and light/dark mode support
- Goal: Enable theming so **improve-ui-servpro** can migrate pages

---

## Before you start

1. **Check setup:** If `src/context/ThemeContext.jsx`, `src/styles/PrecisionTheme.css`, and `ThemeProvider` in `App.jsx` all exist, tell the user the theme is already bootstrapped and skip.
2. **Read App.jsx:** Note whether it uses `AuthProvider`, `Router`, and how the root is structured. You will add `ThemeProvider` without breaking auth or routing.

---

## Step 1: Create ThemeContext

Create `src/context/ThemeContext.jsx`:

```jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('precision-theme');
    if (savedTheme) return savedTheme === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark-mode');
      localStorage.setItem('precision-theme', 'dark');
    } else {
      root.classList.remove('dark-mode');
      localStorage.setItem('precision-theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(prev => !prev);

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
```

---

## Step 2: Create PrecisionTheme.css

Create `src/styles/PrecisionTheme.css` with this content:

```css
:root {
  --precision-bg: #F8FAFC;
  --precision-surface: #FFFFFF;
  --precision-sidebar-bg: #F1F5F9;
  --precision-text-primary: #0F172A;
  --precision-text-secondary: #475569;
  --precision-text-muted: #94A3B8;
  --precision-input-bg: #F1F5F9;
  --precision-input-bg-hover: #E2E8F0;
  --precision-input-text: #0F172A;
  --precision-border-focus: #F68B1F;
  --precision-active-bg: #E2E8F0;
  --precision-tab-track: #E2E8F0;
  --precision-primary: #F68B1F;
  --precision-primary-hover: #E87C0F;
  --precision-success: #10B981;
  --precision-error: #EF4444;
  --precision-warning: #F59E0B;
  --precision-blue: #0EA5E9;
  --precision-radius: 6px;
  --precision-radius-sm: 4px;
  --precision-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  --precision-shadow-lg: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --precision-font: 'Public Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  --precision-mono: 'JetBrains Mono', monospace;
}

html.dark-mode {
  --precision-bg: #111111;
  --precision-surface: #1A1A1A;
  --precision-sidebar-bg: #0A0A0A;
  --precision-text-primary: #E5E5E5;
  --precision-text-secondary: #A3A3A3;
  --precision-text-muted: #737373;
  --precision-input-bg: #262626;
  --precision-input-bg-hover: #333333;
  --precision-input-text: #E5E5E5;
  --precision-active-bg: #262626;
  --precision-tab-track: #262626;
  --precision-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.3);
  --precision-shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3);
  --precision-border-focus: #F97316;
}
```

---

## Step 3: Update index.css

- After `@import "tailwindcss";` add:
  - `@import url('https://fonts.googleapis.com/css2?family=Public+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap');`
  - `@import "./styles/PrecisionTheme.css";`
- Replace `:root`: use `font-family: var(--precision-font)`, `color: var(--precision-text-primary)`, `background-color: var(--precision-bg)`, `color-scheme: light`. Remove gradient backgrounds.
- Add or update `html { min-height: 100vh; background-color: var(--precision-bg); background-image: none; }`
- Set `body { background-color: transparent; }` (so `html` background shows)
- Ensure `.precision-layout`, `.precision-main`, `.precision-header`, `.precision-content`, `.p-card`, `.p-input` (with `:focus` and optional `:hover`), `.p-btn-primary`, `.p-btn-secondary`, `.p-tab`, `.p-tile` exist. If missing, add them from [src/index.css](src/index.css).

---

## Step 4: Update App.jsx

- Add: `import { ThemeProvider } from './context/ThemeContext';`
- Wrap app content with `ThemeProvider`. Order:
  - `Router` → `ThemeProvider` → (existing `AuthProvider` if present) → `AppContent`/routes
- Do **not** remove AuthProvider, ProtectedRoute, or any routes. Only add ThemeProvider.

---

## Step 5: Update Navigation.jsx

- Add: `import { useTheme } from '../context/ThemeContext';`
- In the component: `const { isDarkMode, toggleTheme } = useTheme();`
- Add theme toggle (e.g. in the nav bottom section, before or after user/profile):

```jsx
<div className="nav-theme-toggle" onClick={toggleTheme} title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}>
  <div className={`theme-toggle-inner ${isDarkMode ? 'dark' : 'light'}`}>
    <span className="toggle-icon">{isDarkMode ? '🌙' : '☀️'}</span>
    <span className="toggle-label">{isDarkMode ? 'Dark Mode' : 'Light Mode'}</span>
  </div>
</div>
```

---

## Step 6: Add theme toggle CSS to Navigation.css

Append to `src/components/Navigation.css`:

```css
.nav-theme-toggle {
  padding: 1rem;
  border-top: 1px solid rgba(148, 163, 184, 0.1);
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: background 0.2s;
  padding-left: 20px;
  min-height: 60px;
}

.nav-theme-toggle:hover {
  background: rgba(148, 163, 184, 0.08);
}

.theme-toggle-inner {
  display: flex;
  align-items: center;
  gap: 1rem;
  color: var(--precision-text-secondary);
  font-size: 0.9rem;
  min-width: 40px;
}

.theme-toggle-inner .toggle-icon {
  width: 40px;
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  font-size: 1.2rem;
}

.theme-toggle-inner .toggle-label {
  overflow: hidden;
  max-width: 0;
  opacity: 0;
  white-space: nowrap;
  transition: max-width 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), opacity 0.25s ease;
}

.navigation-sidebar.expanded .theme-toggle-inner .toggle-label {
  max-width: 120px;
  opacity: 1;
}
```

---

## Step 7: Create or update THEME_PROGRESS.md

- Create from [THEME_PROGRESS.md](THEME_PROGRESS.md) if missing.
- Derive the page list from `App.jsx` routes. Put all pages in "Not yet improved".
- Include "Rules when improving or theming a page" and "STANDARD INPUT DESIGN" sections from the reference.

---

## Verification

- Run the app. Click the theme toggle — `html` should get/remove `dark-mode` and colors should change.
- Pages may still use old styling until improved with **improve-ui-servpro**.

---

## Do not

- Remove or alter AuthProvider, auth routes, or ProtectedRoute
- Change page component logic or data
- Improve individual pages (use **improve-ui-servpro**)

---

## Output

Summarize: which files were created or modified, and that the user can now use **improve-ui-servpro** to improve pages one by one.
