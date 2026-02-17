import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
} from '@tanstack/react-table';
import jobService from '../services/jobService';
import useJobLocalState from '../hooks/useJobLocalState';
import {
  STATUS_OPTIONS,
  STATUS_DB_MAP,
  STATUS_DISPLAY_MAP,
  DIVISION_OPTIONS,
  GROUP_OPTIONS,
  DEPARTMENT_OPTIONS,
  PM_OPTIONS,
  CREW_CHIEF_OPTIONS,
  JFC_OPTIONS,
  BIZ_DEV_OPTIONS,
} from '../constants/jobFileConstants';
import './Page.css';
import './JobFiles.css';

function JobFiles() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [divisionFilter, setDivisionFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState('all');
  const [jobTypeFilter, setJobTypeFilter] = useState('all');
  const [propertyTypeFilter, setPropertyTypeFilter] = useState('all');
  const [pmFilter, setPmFilter] = useState('all');
  const [ccFilter, setCcFilter] = useState('all');
  const [jfcFilter, setJfcFilter] = useState('all');
  const [bdrFilter, setBdrFilter] = useState('all');

  const [sorting, setSorting] = useState([]);

  const { getLocalState } = useJobLocalState();

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
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm ||
        job.job_number?.toLowerCase().includes(searchLower) ||
        job.customer_name?.toLowerCase().includes(searchLower) ||
        job.property_address?.toLowerCase().includes(searchLower) ||
        job.scope_summary?.toLowerCase().includes(searchLower);

      const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
      const matchesDivision = divisionFilter === 'all' || job.division === divisionFilter;

      const local = getLocalState(job.id);
      const matchesGroup = groupFilter === 'all' || local.group === groupFilter;
      const matchesJobType = jobTypeFilter === 'all' ||
        job.loss_type?.toUpperCase() === jobTypeFilter ||
        local.department === jobTypeFilter;

      const propType = (job.property_type || local.fnol_property_type || '').toUpperCase();
      const matchesPropertyType = propertyTypeFilter === 'all' || propType === propertyTypeFilter;

      const matchesPm = pmFilter === 'all' || (job.pm && job.pm.toUpperCase() === pmFilter);
      const matchesCc = ccFilter === 'all' || (local.crew_chief && local.crew_chief.toUpperCase() === ccFilter);
      const matchesJfc = jfcFilter === 'all' || (job.jfc && job.jfc.toUpperCase() === jfcFilter);
      const matchesBdr = bdrFilter === 'all' || (local.business_dev_rep && local.business_dev_rep.toUpperCase() === bdrFilter);

      return matchesSearch && matchesStatus && matchesDivision && matchesGroup && matchesJobType &&
        matchesPropertyType && matchesPm && matchesCc && matchesJfc && matchesBdr;
    });
  }, [jobs, searchTerm, statusFilter, divisionFilter, groupFilter, jobTypeFilter, propertyTypeFilter, pmFilter, ccFilter, jfcFilter, bdrFilter, getLocalState]);

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
    setStatusFilter('all');
    setDivisionFilter('all');
    setGroupFilter('all');
    setJobTypeFilter('all');
    setPropertyTypeFilter('all');
    setPmFilter('all');
    setCcFilter('all');
    setJfcFilter('all');
    setBdrFilter('all');
  };

  // TanStack Table columns
  const columns = useMemo(() => [
    {
      accessorKey: 'job_number',
      header: 'Job ID',
      cell: ({ getValue }) => <span className="job-number">{getValue() || 'N/A'}</span>,
    },
    {
      accessorKey: 'customer_name',
      header: 'Customer',
      cell: ({ getValue }) => getValue() || 'N/A',
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
        return days != null ? <span className="aging-cell">{days}d</span> : '-';
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
      accessorFn: (row) => getLocalState(row.id).stage || '',
      cell: ({ getValue }) => getValue() || '-',
      enableSorting: false,
    },
    {
      accessorKey: 'division',
      header: 'Division',
      cell: ({ getValue }) => getValue() || '-',
    },
    {
      id: 'group',
      header: 'Group',
      accessorFn: (row) => getLocalState(row.id).group || '',
      cell: ({ getValue }) => getValue() || '-',
      enableSorting: false,
    },
    {
      id: 'job_type',
      header: 'Job Type',
      accessorFn: (row) => {
        const local = getLocalState(row.id);
        return local.department || row.loss_type?.toUpperCase() || '';
      },
      cell: ({ getValue }) => getValue() || '-',
      enableSorting: false,
    },
    {
      accessorKey: 'pm',
      header: 'PM',
      cell: ({ getValue }) => getValue() || '-',
    },
    {
      id: 'crew_chief',
      header: 'CC',
      accessorFn: (row) => getLocalState(row.id).crew_chief || '',
      cell: ({ getValue }) => getValue() || '-',
      enableSorting: false,
    },
    {
      accessorKey: 'jfc',
      header: 'JFC',
      cell: ({ getValue }) => getValue() || '-',
    },
    {
      id: 'business_dev_rep',
      header: 'BDR',
      accessorFn: (row) => getLocalState(row.id).business_dev_rep || '',
      cell: ({ getValue }) => getValue() || '-',
      enableSorting: false,
    },
    {
      accessorKey: 'estimate_value',
      header: 'Estimate',
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
      accessorFn: (row) => {
        const local = getLocalState(row.id);
        const val = row.ar_balance ?? local.ar_balance;
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
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 25 },
    },
  });

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
        <button onClick={loadJobs} className="btn-secondary">
          <span className="refresh-icon">&#8635;</span> Refresh
        </button>
      </div>

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
      <div className="filters-section">
        <div className="filters-row filters-row-1">
          <div className="filters-grid">
            <div className="filter-group">
              <label>Status</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="filter-select">
                <option value="all">All Statuses</option>
                {STATUS_OPTIONS.map(s => (
                  <option key={s} value={STATUS_DB_MAP[s]}>{s}</option>
                ))}
                <option value="complete">COMPLETE</option>
                <option value="closed">CLOSED</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Division</label>
              <select value={divisionFilter} onChange={(e) => setDivisionFilter(e.target.value)} className="filter-select">
                <option value="all">All Divisions</option>
                {DIVISION_OPTIONS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label>Group</label>
              <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} className="filter-select">
                <option value="all">All Groups</option>
                {GROUP_OPTIONS.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label>Job Type</label>
              <select value={jobTypeFilter} onChange={(e) => setJobTypeFilter(e.target.value)} className="filter-select">
                <option value="all">All Job Types</option>
                {DEPARTMENT_OPTIONS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label>Property Type</label>
              <select value={propertyTypeFilter} onChange={(e) => setPropertyTypeFilter(e.target.value)} className="filter-select">
                <option value="all">All Property Types</option>
                <option value="RESIDENTIAL">RESIDENTIAL</option>
                <option value="COMMERCIAL">COMMERCIAL</option>
              </select>
            </div>
          </div>
          <button onClick={clearFilters} className="btn-clear">Clear Filters</button>
        </div>
        <div className="filters-row filters-row-2">
          <div className="filters-grid">
            <div className="filter-group">
              <label>PM</label>
              <select value={pmFilter} onChange={(e) => setPmFilter(e.target.value)} className="filter-select">
                <option value="all">All PMs</option>
                {PM_OPTIONS.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label>CC</label>
              <select value={ccFilter} onChange={(e) => setCcFilter(e.target.value)} className="filter-select">
                <option value="all">All CCs</option>
                {CREW_CHIEF_OPTIONS.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label>JFC</label>
              <select value={jfcFilter} onChange={(e) => setJfcFilter(e.target.value)} className="filter-select">
                <option value="all">All JFCs</option>
                {JFC_OPTIONS.map(j => (
                  <option key={j} value={j}>{j}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label>BDR</label>
              <select value={bdrFilter} onChange={(e) => setBdrFilter(e.target.value)} className="filter-select">
                <option value="all">All BDRs</option>
                {BIZ_DEV_OPTIONS.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="results-summary">
        Showing {filteredJobs.length} of {jobs.length} jobs
      </div>

      {/* TanStack Table */}
      <div className="jobs-table-container">
        {filteredJobs.length === 0 ? (
          <div className="empty-state">
            <p>No jobs found matching your filters</p>
          </div>
        ) : (
          <>
            <div className="jobs-table-scroll">
            <table className="jobs-table">
              <thead>
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <th
                        key={header.id}
                        onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                        className={`${header.column.getCanSort() ? 'sortable-header' : ''}${header.column.getIsSorted() ? ' sorted' : ''}`}
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
                    onClick={() => navigate(`/job-files/${row.original.id}`)}
                  >
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            </div>

            {/* Pagination */}
            <div className="table-pagination">
              <div className="pagination-info">
                <label>
                  Rows per page:
                  <select
                    value={table.getState().pagination.pageSize}
                    onChange={e => table.setPageSize(Number(e.target.value))}
                    className="page-size-select"
                  >
                    {[10, 25, 50, 100].map(size => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </label>
                <span className="pagination-separator">|</span>
                {filteredJobs.length} results
              </div>
              <div className="pagination-buttons">
                <button
                  onClick={() => table.setPageIndex(0)}
                  disabled={!table.getCanPreviousPage()}
                  className="pagination-btn"
                >
                  &#171;
                </button>
                <button
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="pagination-btn"
                >
                  &#8249;
                </button>
                {(() => {
                  const pageCount = table.getPageCount();
                  const currentPage = table.getState().pagination.pageIndex;
                  const pages = [];
                  if (pageCount <= 7) {
                    for (let i = 0; i < pageCount; i++) pages.push(i);
                  } else {
                    pages.push(0);
                    if (currentPage > 2) pages.push('...');
                    for (let i = Math.max(1, currentPage - 1); i <= Math.min(pageCount - 2, currentPage + 1); i++) {
                      pages.push(i);
                    }
                    if (currentPage < pageCount - 3) pages.push('...');
                    pages.push(pageCount - 1);
                  }
                  return pages.map((page, idx) =>
                    page === '...' ? (
                      <span key={`ellipsis-${idx}`} className="pagination-ellipsis">...</span>
                    ) : (
                      <button
                        key={page}
                        onClick={() => table.setPageIndex(page)}
                        className={`pagination-page${page === currentPage ? ' active' : ''}`}
                      >
                        {page + 1}
                      </button>
                    )
                  );
                })()}
                <button
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="pagination-btn"
                >
                  &#8250;
                </button>
                <button
                  onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                  disabled={!table.getCanNextPage()}
                  className="pagination-btn"
                >
                  &#187;
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default JobFiles;
