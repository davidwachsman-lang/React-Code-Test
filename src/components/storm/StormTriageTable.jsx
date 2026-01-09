import React, { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper
} from '@tanstack/react-table';
import jobService from '../../services/jobService';
import './StormTriageTable.css';

const columnHelper = createColumnHelper();

function StormTriageTable({ 
  jobs, 
  loading, 
  onJobClick,
  onBulkAction,
  selectedStormEventId,
  filters
}) {
  const [rowSelection, setRowSelection] = useState({});
  const [sorting, setSorting] = useState([]);
  const [globalFilter, setGlobalFilter] = useState('');

  // Format currency
  const formatCurrency = (value) => {
    if (!value) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Calculate priority score (0-10 scale based on priority and status)
  const getPriorityScore = (priority, status) => {
    let score = 5; // Default medium priority
    
    // Priority weighting
    switch (priority?.toLowerCase()) {
      case 'emergency':
        score = 10;
        break;
      case 'high':
        score = 8;
        break;
      case 'medium':
        score = 5;
        break;
      case 'low':
        score = 3;
        break;
      default:
        score = 5;
    }
    
    // Status adjustment
    switch (status?.toLowerCase()) {
      case 'lead':
      case 'pending':
        score += 1; // Uninspected gets slight boost
        break;
      case 'in_progress':
      case 'wip':
        score -= 1; // In progress gets slight reduction
        break;
    }
    
    return Math.min(10, Math.max(0, score));
  };

  // Format pay type
  const formatPayType = (paymentMethod) => {
    if (!paymentMethod) return '-';
    switch (paymentMethod.toLowerCase()) {
      case 'insurance':
        return 'Insurance';
      case 'self_pay':
        return 'Self-Pay';
      case 'quote_request':
        return 'Quote Request';
      default:
        return paymentMethod;
    }
  };

  // Define columns - simplified to requested columns only
  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
            aria-label="Select all"
            onClick={(e) => e.stopPropagation()}
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            aria-label="Select row"
            onClick={(e) => e.stopPropagation()}
          />
        ),
        size: 50
      }),
      columnHelper.display({
        id: 'priority_score',
        header: 'Priority Score',
        cell: ({ row }) => {
          const score = getPriorityScore(row.original.priority, row.original.status);
          return (
            <span className="priority-score">
              {score}
            </span>
          );
        },
        size: 100
      }),
      columnHelper.accessor('customer_name', {
        header: 'Customer Name',
        cell: info => (
          <button
            type="button"
            className="link-button"
            onClick={(e) => {
              e.stopPropagation();
              onJobClick?.(info.row.original);
            }}
          >
            {info.getValue() || 'Unknown'}
          </button>
        ),
        size: 150
      }),
      columnHelper.accessor('customer_phone', {
        header: 'Customer Number',
        cell: info => {
          const phone = info.getValue() || '-';
          return phone;
        },
        size: 120
      }),
      columnHelper.accessor('property_address', {
        header: 'Customer Address',
        cell: info => {
          const address = info.getValue() || '-';
          return <div>{address}</div>;
        },
        size: 200
      }),
      columnHelper.accessor('pm', {
        header: 'PM',
        cell: info => info.getValue() || '-',
        size: 100
      }),
      columnHelper.accessor('crew_chief_id', {
        header: 'Crew Chief',
        cell: info => {
          const crewId = info.getValue();
          // TODO: Look up crew name from users/crew table if available
          return crewId ? `Crew ${crewId}` : '-';
        },
        size: 120
      }),
      columnHelper.accessor('inspection_completed', {
        header: 'ATP Signed',
        cell: info => {
          const completed = info.getValue();
          return (
            <span className={`atp-badge ${completed ? 'signed' : 'not-signed'}`}>
              {completed ? 'Yes' : 'No'}
            </span>
          );
        },
        size: 90
      }),
      columnHelper.accessor('estimate_value', {
        header: 'Estimate Value',
        cell: info => formatCurrency(info.getValue()),
        size: 120
      }),
      columnHelper.accessor('payment_method', {
        header: 'Pay Type',
        cell: info => formatPayType(info.getValue()),
        size: 120
      })
    ],
    [onJobClick]
  );

  // Filter jobs based on quick filters
  const filteredJobs = useMemo(() => {
    if (!filters || filters.length === 0) return jobs;

    return jobs.filter(job => {
      return filters.some(filterId => {
        switch (filterId) {
          case 'needsInspection':
            return !job.inspection_completed && (!job.inspection_date || new Date(job.inspection_date) > new Date());
          case 'readyForMitigation':
            return job.inspection_completed && !job.crew_assigned && job.status === 'inspected';
          case 'inProgress':
            return job.status === 'in_progress' || job.status === 'wip';
          case 'emergencyOnly':
            return job.priority === 'emergency';
          case 'insurancePreApproved':
            return job.insurance_carrier || job.insurance_provider;
          default:
            return true;
        }
      });
    });
  }, [jobs, filters]);

  // Table instance
  const table = useReactTable({
    data: filteredJobs,
    columns,
    state: {
      sorting,
      rowSelection,
      globalFilter
    },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 25
      }
    }
  });

  // Get selected rows
  const selectedRows = table.getFilteredSelectedRowModel().rows.map(row => row.original);
  const selectedIds = selectedRows.map(row => row.id);

  return (
    <div className="storm-triage-table">
      <div className="storm-triage-header">
        <div className="storm-triage-search">
          <input
            type="text"
            placeholder="Search all fields..."
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="storm-triage-bulk-actions">
          {selectedIds.length > 0 && (
            <>
              <span className="selected-count">{selectedIds.length} selected</span>
              <button
                type="button"
                className="bulk-action-button"
                onClick={() => onBulkAction?.('assignInspector', selectedIds)}
              >
                Assign Inspector
              </button>
              <button
                type="button"
                className="bulk-action-button"
                onClick={() => onBulkAction?.('assignCrew', selectedIds)}
              >
                Assign Crew
              </button>
              <button
                type="button"
                className="bulk-action-button"
                onClick={() => onBulkAction?.('generateEstimates', selectedIds)}
              >
                Generate Estimates
              </button>
              <button
                type="button"
                className="bulk-action-button"
                onClick={() => onBulkAction?.('export', selectedIds)}
              >
                Export
              </button>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="storm-triage-loading">Loading jobs...</div>
      ) : (
        <>
          <div className="storm-triage-table-container">
            <table>
              <thead>
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <th
                        key={header.id}
                        style={{ width: header.getSize() }}
                        onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                        className={header.column.getCanSort() ? 'sortable' : ''}
                      >
                        <div className="th-content">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanSort() && (
                            <span className="sort-indicator">
                              {{
                                asc: ' ↑',
                                desc: ' ↓'
                              }[header.column.getIsSorted()] ?? ' ⇅'}
                            </span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="empty-state">
                      No jobs found
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map(row => {
                    const job = row.original;
                    return (
                      <tr
                        key={row.id}
                        className={`storm-job-row ${row.getIsSelected() ? 'selected' : ''}`}
                        onClick={() => onJobClick?.(job)}
                      >
                        {row.getVisibleCells().map(cell => (
                          <td key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="storm-triage-pagination">
            <div className="pagination-info">
              Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
              {Math.min(
                (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                table.getFilteredRowModel().rows.length
              )}{' '}
              of {table.getFilteredRowModel().rows.length} jobs
            </div>
            <div className="pagination-controls">
              <button
                type="button"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                {'<<'}
              </button>
              <button
                type="button"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                {'<'}
              </button>
              <span>
                Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
              </span>
              <button
                type="button"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                {'>'}
              </button>
              <button
                type="button"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                {'>>'}
              </button>
              <select
                value={table.getState().pagination.pageSize}
                onChange={(e) => table.setPageSize(Number(e.target.value))}
              >
                {[10, 25, 50, 100].map(pageSize => (
                  <option key={pageSize} value={pageSize}>
                    Show {pageSize}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default StormTriageTable;
