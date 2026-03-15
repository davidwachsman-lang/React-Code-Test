import {
  STATUS_OPTIONS,
  STATUS_DB_MAP,
  DIVISION_OPTIONS,
  GROUP_OPTIONS,
  DEPARTMENT_OPTIONS,
  PM_OPTIONS,
  CREW_CHIEF_OPTIONS,
  JFC_OPTIONS,
  BIZ_DEV_OPTIONS,
} from '../../constants/jobFileConstants';

export default function JobFilesFilterBar({ filters, setFilter, onClear }) {
  return (
    <div className="filters-section">
      <div className="filters-row filters-row-1">
        <div className="filters-grid">
          <div className="filter-group">
            <label>Status</label>
            <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)} className="filter-select">
              <option value="all">All Statuses</option>
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={STATUS_DB_MAP[s]}>{s}</option>
              ))}
              <option value="complete">Complete</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Division</label>
            <select value={filters.division} onChange={(e) => setFilter('division', e.target.value)} className="filter-select">
              <option value="all">All Divisions</option>
              {DIVISION_OPTIONS.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>Group</label>
            <select value={filters.group} onChange={(e) => setFilter('group', e.target.value)} className="filter-select">
              <option value="all">All Groups</option>
              {GROUP_OPTIONS.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>Job Type</label>
            <select value={filters.jobType} onChange={(e) => setFilter('jobType', e.target.value)} className="filter-select">
              <option value="all">All Job Types</option>
              {DEPARTMENT_OPTIONS.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>Property Type</label>
            <select value={filters.propertyType} onChange={(e) => setFilter('propertyType', e.target.value)} className="filter-select">
              <option value="all">All Property Types</option>
              <option value="RESIDENTIAL">RESIDENTIAL</option>
              <option value="COMMERCIAL">COMMERCIAL</option>
            </select>
          </div>
        </div>
        <button onClick={onClear} className="btn-clear">Clear Filters</button>
      </div>
      <div className="filters-row filters-row-2">
        <div className="filters-grid">
          <div className="filter-group">
            <label>PM</label>
            <select value={filters.pm} onChange={(e) => setFilter('pm', e.target.value)} className="filter-select">
              <option value="all">All PMs</option>
              {PM_OPTIONS.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>CC</label>
            <select value={filters.cc} onChange={(e) => setFilter('cc', e.target.value)} className="filter-select">
              <option value="all">All CCs</option>
              {CREW_CHIEF_OPTIONS.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>JFC</label>
            <select value={filters.jfc} onChange={(e) => setFilter('jfc', e.target.value)} className="filter-select">
              <option value="all">All JFCs</option>
              {JFC_OPTIONS.map(j => (
                <option key={j} value={j}>{j}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>BDR</label>
            <select value={filters.bdr} onChange={(e) => setFilter('bdr', e.target.value)} className="filter-select">
              <option value="all">All BDRs</option>
              {BIZ_DEV_OPTIONS.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
