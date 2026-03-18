# Component Reference — DW Restoration Brand System

Quick-copy React + Tailwind implementations of the core component patterns.
All components assume the Tailwind config from SKILL.md is in place.

---

## Stat Card

```jsx
function StatCard({ label, value, delta, deltaDir = 'up', accentColor = '#635BFF' }) {
  const deltaColor = deltaDir === 'up' ? 'text-green-600' : 'text-red-600';
  const deltaIcon  = deltaDir === 'up' ? '↑' : '↓';
  return (
    <div
      className="bg-white rounded-[8px] border border-[#E2E8F0] shadow-card p-6"
      style={{ borderTop: `3px solid ${accentColor}` }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#94A3B8] mb-2">
        {label}
      </p>
      <p className="text-[36px] font-[800] text-[#0A2540] leading-none mb-1">
        {value}
      </p>
      {delta && (
        <p className={`text-[13px] font-medium ${deltaColor}`}>
          {deltaIcon} {delta}
        </p>
      )}
    </div>
  );
}

// Usage
<StatCard label="Open Jobs" value="34" delta="3 this week" deltaDir="up" accentColor="#635BFF" />
<StatCard label="AR Overdue" value="$41,200" delta="$8k since last week" deltaDir="up" accentColor="#DC2626" />
<StatCard label="Avg Dry Time" value="3.2d" delta="0.4d faster" deltaDir="down" accentColor="#16A34A" />
```

---

## Status Badge / Pill

```jsx
const BADGE_STYLES = {
  success:  'bg-[#DCFCE7] text-[#16A34A]',
  warning:  'bg-[#FEF3C7] text-[#D97706]',
  error:    'bg-[#FEF2F2] text-[#DC2626]',
  info:     'bg-[#DBEAFE] text-[#2563EB]',
  neutral:  'bg-[#F1F5F9] text-[#64748B]',
};

function Badge({ label, variant = 'neutral' }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-[0.04em] ${BADGE_STYLES[variant]}`}>
      {label}
    </span>
  );
}

// Usage
<Badge label="In Progress" variant="info" />
<Badge label="Pending Approval" variant="warning" />
<Badge label="Complete" variant="success" />
<Badge label="Overdue" variant="error" />
<Badge label="Draft" variant="neutral" />
```

---

## Job Row (Table)

```jsx
function JobTable({ jobs }) {
  return (
    <div className="bg-white rounded-[8px] border border-[#E2E8F0] overflow-hidden">
      {/* Table header */}
      <div className="grid grid-cols-[80px_1fr_140px_120px_100px] gap-0 border-b border-[#E2E8F0] bg-[#F8FAFC] px-4 py-2">
        {['Job #', 'Address', 'Type', 'Status', 'PM'].map(col => (
          <span key={col} className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#94A3B8]">
            {col}
          </span>
        ))}
      </div>

      {/* Rows */}
      {jobs.map((job, i) => (
        <div
          key={job.id}
          className={`grid grid-cols-[80px_1fr_140px_120px_100px] gap-0 px-4 py-3 border-b border-[#E2E8F0] cursor-pointer transition-all
            ${job.active
              ? 'bg-[#F7F6FF] border-l-[3px] border-l-[#635BFF]'
              : i % 2 === 0 ? 'bg-white hover:bg-[#F8FAFC]' : 'bg-[#F8FAFC] hover:bg-[#F1F5F9]'
            }`}
        >
          <span className="text-[13px] font-mono text-[#635BFF]">{job.id}</span>
          <span className="text-[13px] text-[#0A2540] font-medium truncate">{job.address}</span>
          <span className="text-[13px] text-[#64748B]">{job.type}</span>
          <Badge label={job.status} variant={job.statusVariant} />
          <span className="text-[13px] text-[#64748B]">{job.pm}</span>
        </div>
      ))}
    </div>
  );
}
```

---

## Primary Button

```jsx
function Button({ children, variant = 'primary', onClick, disabled }) {
  const styles = {
    primary:   'bg-[#635BFF] text-white border-transparent hover:bg-[#4F46E5] hover:shadow-[0_2px_8px_rgba(99,91,255,0.35)]',
    secondary: 'bg-white text-[#0A2540] border-[#E2E8F0] hover:bg-[#F8FAFC]',
    danger:    'bg-white text-[#DC2626] border-[#DC2626] hover:bg-[#FEF2F2]',
    ghost:     'bg-transparent text-[#64748B] border-transparent hover:bg-[#F8FAFC]',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-[6px] border text-[14px] font-medium transition-all
        ${styles[variant]}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {children}
    </button>
  );
}
```

---

## Card (Generic)

```jsx
function Card({ children, accentColor, className = '' }) {
  return (
    <div
      className={`bg-white rounded-[8px] border border-[#E2E8F0] shadow-card p-6 ${className}`}
      style={accentColor ? { borderLeft: `3px solid ${accentColor}` } : {}}
    >
      {children}
    </div>
  );
}
```

---

## Page Header

```jsx
function PageHeader({ title, subtitle, actions }) {
  return (
    <div
      className="flex items-center justify-between px-6 py-5"
      style={{
        background: '#0A2540',
        borderBottom: '3px solid #635BFF',
      }}
    >
      <div>
        <h1 className="text-[20px] font-[700] text-white leading-tight">{title}</h1>
        {subtitle && <p className="text-[13px] text-[#94A3B8] mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}

// Usage
<PageHeader
  title="Dispatch Board"
  subtitle="14 active jobs · 3 pending dispatch"
  actions={<Button variant="primary">+ New Job</Button>}
/>
```

---

## Sidebar Nav

```jsx
function SidebarNav({ items, activeId }) {
  return (
    <nav className="w-[220px] h-full flex flex-col" style={{ background: '#0A2540' }}>
      {/* Logo area */}
      <div className="px-5 py-5 border-b border-white/10">
        <span className="text-white font-[800] text-[16px] tracking-tight">DW Restoration</span>
      </div>

      {/* Nav items */}
      <div className="flex-1 px-3 py-4 space-y-0.5">
        {items.map(item => (
          <a
            key={item.id}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-[6px] text-[13px] font-medium transition-all
              ${activeId === item.id
                ? 'text-white bg-[rgba(99,91,255,0.15)] border-l-[3px] border-[#635BFF] pl-[9px]'
                : 'text-[#94A3B8] hover:text-white hover:bg-white/5'
              }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </a>
        ))}
      </div>
    </nav>
  );
}
```

---

## Form Input

```jsx
function Input({ label, placeholder, value, onChange, error }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#94A3B8]">
          {label}
        </label>
      )}
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full px-3 py-2 text-[14px] text-[#0A2540] bg-white rounded-[6px] border outline-none transition-all
          placeholder:text-[#94A3B8]
          focus:border-[#635BFF] focus:ring-2 focus:ring-[rgba(99,91,255,0.1)]
          ${error ? 'border-[#DC2626]' : 'border-[#E2E8F0]'}
        `}
      />
      {error && <p className="text-[12px] text-[#DC2626]">{error}</p>}
    </div>
  );
}
```

---

## Section Label (divider with label)

```jsx
function SectionLabel({ children }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#94A3B8] whitespace-nowrap">
        {children}
      </span>
      <div className="flex-1 h-px bg-[#E2E8F0]" />
    </div>
  );
}
```

---

## Callout / Info Box

```jsx
const CALLOUT_STYLES = {
  info:    { border: '#2563EB', bg: '#DBEAFE', label: 'INFO' },
  success: { border: '#16A34A', bg: '#DCFCE7', label: 'NOTE' },
  warning: { border: '#D97706', bg: '#FEF3C7', label: 'WARNING' },
  error:   { border: '#DC2626', bg: '#FEF2F2', label: 'ATTENTION' },
};

function Callout({ children, variant = 'info', label }) {
  const s = CALLOUT_STYLES[variant];
  return (
    <div
      className="rounded-[6px] border px-4 py-3"
      style={{ borderLeftWidth: '3px', borderLeftColor: s.border, borderColor: '#E2E8F0', background: s.bg }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.05em] mb-1" style={{ color: s.border }}>
        {label || s.label}
      </p>
      <p className="text-[13px] text-[#0A2540] leading-relaxed">{children}</p>
    </div>
  );
}
```

---

## Empty State

```jsx
function EmptyState({ icon = '📋', title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <span className="text-[40px] mb-4">{icon}</span>
      <h3 className="text-[16px] font-[600] text-[#0A2540] mb-2">{title}</h3>
      <p className="text-[13px] text-[#64748B] max-w-[320px] leading-relaxed mb-6">{description}</p>
      {action && action}
    </div>
  );
}
```
