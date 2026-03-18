export default function EmptyState({ hasActiveFilters, onClearFilters }) {
  return (
    <div className="empty-state-container">
      <svg className="empty-state-icon" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="28" cy="28" r="20" stroke="#64748b" strokeWidth="3" />
        <line x1="42" y1="42" x2="56" y2="56" stroke="#64748b" strokeWidth="3" strokeLinecap="round" />
        <line x1="20" y1="28" x2="36" y2="28" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <p className="empty-state-message">No jobs match your filters</p>
      {hasActiveFilters && (
        <button onClick={onClearFilters} className="btn-primary">Clear Filters</button>
      )}
    </div>
  );
}
