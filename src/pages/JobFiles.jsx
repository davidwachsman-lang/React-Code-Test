import { useState, useEffect, useMemo, useCallback, useRef, useReducer } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import JobBulkUpload from '../components/job-files/JobBulkUpload';
import EmptyState from '../components/job-files/EmptyState';
import Pagination from '../components/job-files/Pagination';
import JobFilesFilterBar from '../components/job-files/JobFilesFilterBar';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
} from '@tanstack/react-table';
import jobService from '../services/jobService';
import intakeService from '../services/intakeService';
import { supabase } from '../services/supabaseClient';
import useJobLocalState from '../hooks/useJobLocalState';
import {
  STATUS_DISPLAY_MAP,
  DIVISION_OPTIONS,
  DEPARTMENT_OPTIONS,
} from '../constants/jobFileConstants';
import './Page.css';
import './JobFiles.css';

const INITIAL_FILTERS = {
  status: 'all', division: 'all', group: 'all', jobType: 'all',
  propertyType: 'all', pm: 'all', cc: 'all', jfc: 'all', bdr: 'all',
};

const INITIAL_UI = {
  showColumnPicker: false,
  showUpload: false,
  showNewJobModal: false,
  newJobDiv: '',
  newJobDept: '',
  creatingJob: false,
};

function uiReducer(state, action) {
  switch (action.type) {
    case 'SET':
      return { ...state, [action.key]: action.value };
    case 'OPEN_NEW_JOB':
      return { ...state, showNewJobModal: true, newJobDiv: '', newJobDept: '' };
    case 'CLOSE_NEW_JOB':
      return { ...state, showNewJobModal: false, creatingJob: false };
    case 'RESET':
      return { ...INITIAL_UI };
    default:
      return state;
  }
}

function JobFiles() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  const [filters, setFilters] = useState(() => {
    const initial = { ...INITIAL_FILTERS };
    for (const key of Object.keys(INITIAL_FILTERS)) {
      const param = searchParams.get(key);
      if (param) initial[key] = param;
    }
    return initial;
  });

  const setFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const [sorting, setSorting] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({
    stage: false,
    group: false,
    division: false,
    job_type: false,
    jfc: false,
    business_dev_rep: false,
  });

  const [ui, dispatchUI] = useReducer(uiReducer, INITIAL_UI);

  const { getLocalState } = useJobLocalState();
  const columnPickerRef = useRef(null);

  useEffect(() => {
    if (!ui.showColumnPicker) return;
    const handleClick = (e) => {
      if (columnPickerRef.current && !columnPickerRef.current.contains(e.target)) {
        dispatchUI({ type: 'SET', key: 'showColumnPicker', value: false });
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [ui.showColumnPicker]);

  // Abbreviation maps (3 chars max)
  const DIV_ABBREV = { HB: 'HB', LL: 'LL', REFERRAL: 'REF' };
  const DEPT_ABBREV = { WATER: 'WTR', FIRE: 'FIR', MOLD: 'MLD', BIO: 'BIO', CONTENTS: 'CON' };

  const generateJobNumber = async (div, dept) => {
    const yy = new Date().getFullYear().toString().slice(-2);
    const divCode = DIV_ABBREV[div] || div.slice(0, 3).toUpperCase();
    const deptCode = DEPT_ABBREV[dept] || dept.slice(0, 3).toUpperCase();
    const prefix = `${yy}-${divCode}-${deptCode}-`;

    // Find highest existing sequence for this prefix
    const { data } = await supabase
      .from('jobs')
      .select('job_number')
      .like('job_number', `${prefix}%`)
      .order('job_number', { ascending: false })
      .limit(1);

    let seq = 1;
    if (data && data.length > 0) {
      const last = data[0].job_number;
      const lastSeq = parseInt(last.split('-').pop(), 10);
      if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }

    return `${prefix}${String(seq).padStart(4, '0')}`;
  };

  const handleCreateNewJob = async () => {
    if (!ui.newJobDiv || !ui.newJobDept) return;
    dispatchUI({ type: 'SET', key: 'creatingJob', value: true });
    try {
      // Create placeholder customer
      const { data: customer, error: custErr } = await supabase
        .from('customers')
        .insert([{ name: '' }])
        .select()
        .single();
      if (custErr) throw custErr;

      // Create placeholder property
      const { data: property, error: propErr } = await supabase
        .from('properties')
        .insert([{
          customer_id: customer.id,
          name: '',
          address1: '',
          city: '',
          state: '',
          postal_code: '',
          country: 'USA',
        }])
        .select()
        .single();
      if (propErr) throw propErr;

      // Auto-generate job number
      const jobNumber = await generateJobNumber(ui.newJobDiv, ui.newJobDept);

      // Create the job
      const job = await jobService.create({
        job_number: jobNumber,
        customer_id: customer.id,
        property_id: property.id,
        status: 'pending',
        division: ui.newJobDiv,
        department: ui.newJobDept,
        date_opened: new Date().toISOString().split('T')[0],
      });

      dispatchUI({ type: 'CLOSE_NEW_JOB' });
      navigate(`/job-files/${job.id}`);
    } catch (err) {
      console.error('Failed to create new job:', err);
      setError('Failed to create new job: ' + (err.message || 'Unknown error'));
    } finally {
      dispatchUI({ type: 'SET', key: 'creatingJob', value: false });
    }
  };

  // #2: Search debounce (300ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await jobService.getAll();
      const jobsWithStatus = data.map(job => ({
        ...job,
        status: job.status || 'pending',
      }));
      setJobs(jobsWithStatus);
    } catch (err) {
      setError(err.message || 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const searchLower = debouncedSearchTerm.toLowerCase();
      const matchesSearch = !debouncedSearchTerm ||
        job.job_number?.toLowerCase().includes(searchLower) ||
        job.external_job_number?.toLowerCase().includes(searchLower) ||
        job.customer_name?.toLowerCase().includes(searchLower) ||
        job.property_address?.toLowerCase().includes(searchLower) ||
        job.scope_summary?.toLowerCase().includes(searchLower);

      const matchesStatus = filters.status === 'all' || job.status === filters.status;
      const matchesDivision = filters.division === 'all' || job.division === filters.division;

      const local = getLocalState(job.id);
      const matchesGroup = filters.group === 'all' || (job.job_group || local.group) === filters.group;
      const matchesJobType = filters.jobType === 'all' ||
        job.loss_type?.toUpperCase() === filters.jobType ||
        (job.department || local.department) === filters.jobType;

      const propType = (job.property_type || local.fnol_property_type || '').toUpperCase();
      const matchesPropertyType = filters.propertyType === 'all' || propType === filters.propertyType;

      const matchesPm = filters.pm === 'all' || (job.pm && job.pm.toUpperCase() === filters.pm);
      const matchesCc = filters.cc === 'all' || ((job.crew_chief || local.crew_chief || '').toUpperCase() === filters.cc);
      const matchesJfc = filters.jfc === 'all' || (job.jfc && job.jfc.toUpperCase() === filters.jfc);
      const matchesBdr = filters.bdr === 'all' || ((job.sales_person || local.business_dev_rep || '').toUpperCase() === filters.bdr);

      return matchesSearch && matchesStatus && matchesDivision && matchesGroup && matchesJobType &&
        matchesPropertyType && matchesPm && matchesCc && matchesJfc && matchesBdr;
    });
  }, [jobs, debouncedSearchTerm, filters, getLocalState]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  };

  const formatStatus = (status) => {
    return STATUS_DISPLAY_MAP[status] || status?.replace(/_/g, ' ').toUpperCase() || 'UNKNOWN';
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilters({ ...INITIAL_FILTERS });
  };

  // #8: Build filter query string for back-nav preservation
  const buildFilterParams = () => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    for (const [key, value] of Object.entries(filters)) {
      if (value !== 'all') params.set(key, value);
    }
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  };

  // #8: Initialize search term from URL on mount
  useEffect(() => {
    const s = searchParams.get('search');
    if (s) setSearchTerm(s);
  }, []);

  // TanStack Table columns
  const columns = useMemo(() => [
    {
      id: 'job_number',
      header: 'Job ID',
      accessorFn: (row) => row.job_number || row.external_job_number || '',
      cell: ({ row }) => {
        const jn = row.original.job_number;
        const ext = row.original.external_job_number;
        const jobType = (row.original.department || row.original.loss_type || '').toUpperCase();
        const typeIcon = {
          WATER: { icon: '💧', cls: 'decal-water' },
          FIRE: { icon: '🔥', cls: 'decal-fire' },
          MOLD: { icon: '🧫', cls: 'decal-mold' },
          BIO: { icon: '☣', cls: 'decal-bio' },
          CONTENTS: { icon: '📦', cls: 'decal-contents' },
        }[jobType];
        const display = jn || ext || 'N/A';
        return (
          <span className={`job-id-with-decal${ext && !jn ? ' ext-job-number' : ''}`}>
            {typeIcon && (
              <span className={`job-type-decal ${typeIcon.cls}`} title={jobType}>
                {typeIcon.icon}
              </span>
            )}
            <span className="job-number">{display}</span>
          </span>
        );
      },
    },
    {
      accessorKey: 'customer_name',
      header: 'Customer',
      cell: ({ getValue }) => {
        const name = getValue() || 'N/A';
        return <span className="customer-cell" title={name}>{name}</span>;
      },
    },
    {
      id: 'aging',
      header: 'Aging',
      accessorFn: (row) => {
        const local = getLocalState(row.id);
        const dateStr = local.fnol_date || row.date_of_loss || row.date_received || row.created_at;
        if (!dateStr) return null;
        const d = new Date(dateStr);
        if (Number.isNaN(d.getTime())) return null;
        return Math.floor((Date.now() - d.getTime()) / (24 * 60 * 60 * 1000));
      },
      cell: ({ getValue }) => {
        const days = getValue();
        if (days == null) return '-';
        const agingClass = days > 60 ? 'aging-red' : days > 30 ? 'aging-yellow' : 'aging-green';
        return <span className={`aging-cell ${agingClass}`}>{days}d</span>;
      },
      sortingFn: (rowA, rowB) => {
        const a = rowA.getValue('aging') ?? -1;
        const b = rowB.getValue('aging') ?? -1;
        return a - b;
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => {
        const status = getValue();
        return (
          <span className={`status-badge status-${status}`}>
            {formatStatus(status)}
          </span>
        );
      },
    },
    {
      id: 'stage',
      header: 'Stage',
      accessorFn: (row) => row.stage || getLocalState(row.id).stage || '',
      cell: ({ getValue }) => getValue() || '-',
    },
    {
      accessorKey: 'division',
      header: 'Division',
      cell: ({ getValue }) => getValue() || '-',
    },
    {
      id: 'group',
      header: 'Group',
      accessorFn: (row) => row.job_group || getLocalState(row.id).group || '',
      cell: ({ getValue }) => getValue() || '-',
    },
    {
      id: 'job_type',
      header: 'Job Type',
      accessorFn: (row) => row.department || row.loss_type?.toUpperCase() || '',
      cell: ({ getValue }) => getValue() || '-',
    },
    {
      accessorKey: 'pm',
      header: 'PM',
      cell: ({ getValue }) => getValue() || '-',
    },
    {
      id: 'crew_chief',
      header: 'CC',
      accessorFn: (row) => row.crew_chief || getLocalState(row.id).crew_chief || '',
      cell: ({ getValue }) => getValue() || '-',
    },
    {
      accessorKey: 'jfc',
      header: 'JFC',
      cell: ({ getValue }) => getValue() || '-',
    },
    {
      id: 'business_dev_rep',
      header: 'BDR',
      accessorFn: (row) => row.sales_person || getLocalState(row.id).business_dev_rep || '',
      cell: ({ getValue }) => getValue() || '-',
    },
    {
      accessorKey: 'estimate_value',
      header: 'Estimate',
      meta: { align: 'right' },
      cell: ({ getValue }) => {
        const val = getValue();
        if (!val) return '-';
        return <span className="estimate-cell">{'$' + parseFloat(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>;
      },
      sortingFn: (rowA, rowB) => {
        const a = parseFloat(rowA.original.estimate_value) || 0;
        const b = parseFloat(rowB.original.estimate_value) || 0;
        return a - b;
      },
    },
    {
      id: 'ar_balance',
      header: 'AR Balance',
      meta: { align: 'right' },
      accessorFn: (row) => {
        const val = row.ar_balance;
        const n = parseFloat(val);
        return Number.isFinite(n) ? n : null;
      },
      cell: ({ getValue }) => {
        const val = getValue();
        if (val == null) return '-';
        return <span className="ar-balance-cell">{'$' + Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>;
      },
      sortingFn: (rowA, rowB) => {
        const a = rowA.getValue('ar_balance') ?? -Infinity;
        const b = rowB.getValue('ar_balance') ?? -Infinity;
        return a - b;
      },
    },
  ], [getLocalState]);

  const table = useReactTable({
    data: filteredJobs,
    columns,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 25 },
    },
  });

  const hasActiveFilters = searchTerm || Object.values(filters).some(v => v !== 'all');

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading jobs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="error-state">
          <h2>Error Loading Jobs</h2>
          <p>{error}</p>
          <button onClick={loadJobs} className="btn-primary">Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="job-files-header">
        <div>
          <h1>Job Files</h1>
          <p>Access and manage all project files and information</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button onClick={() => dispatchUI({ type: 'OPEN_NEW_JOB' })} className="btn-new-job" disabled={ui.creatingJob}>
            {ui.creatingJob ? 'Creating...' : '+ New Job'}
          </button>
          <button onClick={() => dispatchUI({ type: 'SET', key: 'showUpload', value: true })} className="btn-primary">
            Upload Excel
          </button>
          <div className="column-picker-wrapper" ref={columnPickerRef}>
            <button onClick={() => dispatchUI({ type: 'SET', key: 'showColumnPicker', value: !ui.showColumnPicker })} className="btn-secondary">
              Columns
            </button>
            {ui.showColumnPicker && (
              <div className="column-picker-dropdown">
                {table.getAllLeafColumns().map(column => (
                  <label key={column.id} className="column-picker-item">
                    <input
                      type="checkbox"
                      checked={column.getIsVisible()}
                      onChange={column.getToggleVisibilityHandler()}
                    />
                    {column.columnDef.header}
                  </label>
                ))}
              </div>
            )}
          </div>
          <button onClick={loadJobs} className="btn-secondary">
            <span className="refresh-icon">&#8635;</span> Refresh
          </button>
        </div>
      </div>

      {ui.showUpload && (
        <JobBulkUpload onComplete={() => { dispatchUI({ type: 'SET', key: 'showUpload', value: false }); loadJobs(); }} />
      )}

      {/* Search */}
      <div className="search-box-full">
        <input
          type="text"
          placeholder="Search by job number, customer, address..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Filters */}
      <JobFilesFilterBar filters={filters} setFilter={setFilter} onClear={clearFilters} />

      <div className="results-summary">
        Showing {filteredJobs.length} of {jobs.length} jobs
      </div>

      {/* Mobile card view */}
      <div className="mobile-card-list">
        {filteredJobs.length === 0 ? (
          <EmptyState hasActiveFilters={hasActiveFilters} onClearFilters={clearFilters} />
        ) : (
          table.getRowModel().rows.map(row => {
            const job = row.original;
            const local = getLocalState(job.id);
            const aging = row.getValue('aging');
            const estimate = job.estimate_value
              ? '$' + parseFloat(job.estimate_value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
              : '-';
            const mobileJobType = (job.department || job.loss_type || '').toUpperCase();
            const mobileIcon = { WATER: '💧', FIRE: '🔥', MOLD: '🧫', BIO: '☣', CONTENTS: '📦' }[mobileJobType];
            return (
              <div
                key={row.id}
                className="mobile-job-card"
                onClick={() => navigate(`/job-files/${job.id}${buildFilterParams()}`)}
              >
                <div className="mobile-card-top">
                  <span className="job-id-with-decal">
                    {mobileIcon && <span className="job-type-decal">{mobileIcon}</span>}
                    <span className="job-number">{job.job_number || 'N/A'}</span>
                  </span>
                  <span className={`status-badge status-${job.status}`}>
                    {formatStatus(job.status)}
                  </span>
                </div>
                <div className="mobile-card-customer">{job.customer_name || 'N/A'}</div>
                <div className="mobile-card-details">
                  <span>PM: {job.pm || '-'}</span>
                  <span>Aging: {aging != null ? `${aging}d` : '-'}</span>
                  <span>Est: {estimate}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* TanStack Table (desktop) */}
      <div className="jobs-table-container">
        {filteredJobs.length === 0 ? (
          <EmptyState hasActiveFilters={hasActiveFilters} onClearFilters={clearFilters} />
        ) : (
          <>
            <div className="jobs-table-scroll">
            <table className="jobs-table">
              <thead>
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                        className={`${header.column.getCanSort() ? 'sortable-header' : ''}${header.column.getIsSorted() ? ' sorted' : ''}`}
                        style={header.column.columnDef.meta?.align ? { textAlign: header.column.columnDef.meta.align } : undefined}
                      >
                        <div className="th-content">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanSort() && (
                            <span className={`sort-indicator${header.column.getIsSorted() ? ' active' : ''}`}>
                              {{
                                asc: ' \u25B2',
                                desc: ' \u25BC',
                              }[header.column.getIsSorted()] ?? ' \u25B7'}
                            </span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map(row => (
                  <tr
                    key={row.id}
                    className="job-row"
                    tabIndex={0}
                    onClick={() => navigate(`/job-files/${row.original.id}${buildFilterParams()}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') navigate(`/job-files/${row.original.id}${buildFilterParams()}`);
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        style={cell.column.columnDef.meta?.align ? { textAlign: cell.column.columnDef.meta.align } : undefined}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            </div>

            <Pagination table={table} totalResults={filteredJobs.length} />
          </>
        )}
      </div>

      {/* New Job Modal */}
      {ui.showNewJobModal && (
        <div className="modal-overlay" onClick={() => dispatchUI({ type: 'CLOSE_NEW_JOB' })}>
          <div className="new-job-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Create New Job</h2>
            <div className="new-job-form">
              <div className="filter-group">
                <label>Division</label>
                <select value={ui.newJobDiv} onChange={(e) => dispatchUI({ type: 'SET', key: 'newJobDiv', value: e.target.value })} className="filter-select">
                  <option value="">Select Division</option>
                  {DIVISION_OPTIONS.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div className="filter-group">
                <label>Job Type</label>
                <select value={ui.newJobDept} onChange={(e) => dispatchUI({ type: 'SET', key: 'newJobDept', value: e.target.value })} className="filter-select">
                  <option value="">Select Job Type</option>
                  {DEPARTMENT_OPTIONS.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              {ui.newJobDiv && ui.newJobDept && (
                <p className="new-job-preview">
                  Job ID format: {new Date().getFullYear().toString().slice(-2)}-{DIV_ABBREV[ui.newJobDiv] || ui.newJobDiv.slice(0,3)}-{DEPT_ABBREV[ui.newJobDept] || ui.newJobDept.slice(0,3)}-XXXX
                </p>
              )}
            </div>
            <div className="new-job-actions">
              <button onClick={() => dispatchUI({ type: 'CLOSE_NEW_JOB' })} className="btn-secondary">Cancel</button>
              <button
                onClick={handleCreateNewJob}
                className="btn-new-job"
                disabled={!ui.newJobDiv || !ui.newJobDept || ui.creatingJob}
              >
                {ui.creatingJob ? 'Creating...' : 'Create Job'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default JobFiles;
