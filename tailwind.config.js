/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
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
        },
        // Keep legacy palette for backward compat during migration
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        dark: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
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
  plugins: [],
}
