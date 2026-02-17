import { DOC_CHECK_ITEMS, DOC_CHECK_GROUPS } from '../../../constants/jobFileConstants';

export default function DocumentationTab({ localState, onLocalChange }) {
  const completedCount = DOC_CHECK_ITEMS.filter(item => localState[item.key]).length;
  const totalCount = DOC_CHECK_ITEMS.length;
  const pct = Math.round((completedCount / totalCount) * 100);

  const getItemByKey = (key) => DOC_CHECK_ITEMS.find(i => i.key === key);

  return (
    <div className="documentation-tab">
      <div className="doc-progress-section">
        <div className="doc-progress-header">
          <span className="doc-progress-label">
            {completedCount}/{totalCount} complete ({pct}%)
          </span>
        </div>
        <div className="doc-progress-bar-track">
          <div
            className="doc-progress-bar-fill"
            style={{
              width: `${pct}%`,
              background: pct >= 75 ? '#22c55e' : pct >= 50 ? '#fbbf24' : '#ef4444',
            }}
          />
        </div>
      </div>

      {/* #10: Preview banner removed per #7 — now at JobDetail level */}

      {DOC_CHECK_GROUPS.map((group) => (
        <div key={group.label} className="doc-group">
          <h4 className="doc-group-label">{group.label}</h4>
          <div className="doc-checks-grid">
            {group.items.map((key) => {
              const item = getItemByKey(key);
              if (!item) return null;
              const checked = !!localState[key];
              return (
                <div
                  key={key}
                  className={`doc-check-item ${checked ? 'checked' : ''}`}
                  onClick={() => onLocalChange(key, !checked)}
                >
                  <div className={`doc-toggle ${checked ? 'on' : 'off'}`}>
                    <div className="doc-toggle-knob" />
                  </div>
                  <span className="doc-check-label">{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
