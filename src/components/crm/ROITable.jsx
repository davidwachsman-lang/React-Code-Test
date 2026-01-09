import React, { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import './CRMTable.css';

const columnHelper = createColumnHelper();

function ROITable({ records = [], onRecordClick }) {
  const [sorting, setSorting] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatROI = (roi) => {
    if (roi === null || roi === undefined) return 'N/A';
    return `${roi >= 0 ? '+' : ''}${roi.toFixed(1)}%`;
  };

  const formatDays = (days) => {
    if (days === null || days === undefined) return 'N/A';
    return `${days} days`;
  };

  const getStageClass = (stage) => {
    switch (stage) {
      case 'prospect':
        return 'stage-prospect';
      case 'active_customer':
        return 'stage-active-customer';
      case 'inactive':
        return 'stage-inactive';
      case 'lost':
        return 'stage-lost';
      default:
        return '';
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Company Name',
      'Sales Rep',
      'Stage',
      'Date Closed',
      'Referral Jobs (LTM)',
      'Revenue (LTM)',
      'Cost (LTM)',
      'ROI',
      'Days Since Last Activity',
      'Days Since Last F2F'
    ];
    
    const rows = records.map(record => [
      record.company_name || '',
      record.primary_sales_rep || 'Unassigned',
      record.relationship_stage || '',
      record.date_closed ? formatDate(record.date_closed) : 'N/A',
      record.referral_jobs_ltm ?? 0,
      record.revenue_ltm ? formatCurrency(record.revenue_ltm) : '$0',
      record.cost_ltm ? formatCurrency(record.cost_ltm) : '$0',
      record.roi !== null && record.roi !== undefined ? `${record.roi.toFixed(1)}%` : 'N/A',
      record.days_since_last_activity !== null && record.days_since_last_activity !== undefined ? record.days_since_last_activity : 'N/A',
      record.days_since_last_f2f !== null && record.days_since_last_f2f !== undefined ? record.days_since_last_f2f : 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `roi_view_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor('company_name', {
        id: 'company_name',
        header: 'Company Name',
        cell: (info) => info.getValue() || 'Unnamed',
        enableSorting: true,
        size: 200,
      }),
      columnHelper.accessor('primary_sales_rep', {
        id: 'primary_sales_rep',
        header: 'Sales Rep',
        cell: (info) => {
          const value = info.getValue();
          if (!value) return 'Unassigned';
          // Capitalize first letter
          return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
        },
        enableSorting: true,
        size: 160,
      }),
      columnHelper.accessor('relationship_stage', {
        id: 'relationship_stage',
        header: 'Stage',
        cell: (info) => {
          const stage = info.getValue();
          return (
            <span className={`stage-badge ${getStageClass(stage)}`}>
              {stage === 'prospect' ? 'Prospect' :
               stage === 'active_customer' ? 'Active Customer' :
               stage === 'inactive' ? 'Inactive' :
               stage === 'lost' ? 'Lost' : stage}
            </span>
          );
        },
        enableSorting: true,
        size: 140,
      }),
      columnHelper.accessor('date_closed', {
        id: 'date_closed',
        header: 'Date Closed',
        cell: (info) => formatDate(info.getValue()),
        enableSorting: true,
        size: 140,
      }),
      columnHelper.accessor('referral_jobs_ltm', {
        id: 'referral_jobs_ltm',
        header: 'Referral Jobs (LTM)',
        cell: (info) => info.getValue() ?? 0,
        enableSorting: true,
        size: 150,
      }),
      columnHelper.accessor('revenue_ltm', {
        id: 'revenue_ltm',
        header: 'Revenue (LTM)',
        cell: (info) => formatCurrency(info.getValue()),
        enableSorting: true,
        size: 150,
      }),
      columnHelper.accessor('cost_ltm', {
        id: 'cost_ltm',
        header: 'Cost (LTM)',
        cell: (info) => formatCurrency(info.getValue()),
        enableSorting: true,
        size: 150,
      }),
      columnHelper.accessor('roi', {
        id: 'roi',
        header: 'ROI',
        cell: (info) => {
          const roi = info.getValue();
          const roiValue = typeof roi === 'number' ? roi : null;
          return (
            <span style={{ 
              color: roiValue !== null && roiValue >= 0 ? '#10b981' : roiValue !== null ? '#ef4444' : '#94a3b8',
              fontWeight: roiValue !== null ? '600' : 'normal'
            }}>
              {formatROI(roiValue)}
            </span>
          );
        },
        enableSorting: true,
        size: 120,
      }),
      columnHelper.accessor('days_since_last_activity', {
        id: 'days_since_last_activity',
        header: 'Days Since Last Activity',
        cell: (info) => formatDays(info.getValue()),
        enableSorting: true,
        size: 180,
      }),
      columnHelper.accessor('days_since_last_f2f', {
        id: 'days_since_last_f2f',
        header: 'Days Since Last F2F',
        cell: (info) => formatDays(info.getValue()),
        enableSorting: true,
        size: 160,
      }),
    ],
    [onRecordClick]
  );

  // Filter records based on search term
  const filteredRecords = useMemo(() => {
    if (!searchTerm) return records;
    
    const searchLower = searchTerm.toLowerCase();
    return records.filter(record => {
      const companyName = (record.company_name || '').toLowerCase();
      const salesRep = (record.primary_sales_rep || '').toLowerCase();
      const stage = (record.relationship_stage || '').toLowerCase();
      const association = (record.association_membership || '').toLowerCase();
      
      return companyName.includes(searchLower) ||
             salesRep.includes(searchLower) ||
             stage.includes(searchLower) ||
             association.includes(searchLower);
    });
  }, [records, searchTerm]);

  const table = useReactTable({
    data: filteredRecords,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 50,
      },
    },
  });

  if (!records || records.length === 0) {
    return (
      <div className="crm-table-empty">
        <p>No ROI data found.</p>
      </div>
    );
  }

  return (
    <div className="crm-table-container">
      <div className="crm-table-controls">
        <div className="crm-search-bar" style={{ marginBottom: '1rem' }}>
          <label>Search</label>
          <input
            type="text"
            placeholder="Search ROI records..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
            style={{
              width: '100%',
              maxWidth: '400px',
              padding: '0.5rem',
              borderRadius: '6px',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              backgroundColor: 'rgba(30, 41, 59, 0.8)',
              color: '#f1f5f9',
              fontSize: '0.9rem'
            }}
          />
        </div>
        <div className="crm-table-actions-bar">
          <button onClick={handleExportCSV} className="btn-export">
            Export CSV
          </button>
        </div>
      </div>

      <div className="crm-table-wrapper">
        <table className="crm-table">
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    style={{ width: header.getSize() }}
                    className={header.column.getCanSort() ? 'sortable' : ''}
                  >
                    <div
                      className="header-content"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <span className="sort-indicator">
                          {{
                            asc: ' ↑',
                            desc: ' ↓',
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
            {table.getRowModel().rows.map(row => (
              <tr
                key={row.id}
                className="crm-table-row"
                onClick={() => onRecordClick && onRecordClick(row.original)}
              >
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} style={{ width: cell.column.getSize() }}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="crm-table-pagination">
        <button
          onClick={() => table.setPageIndex(0)}
          disabled={!table.getCanPreviousPage()}
        >
          {'<<'}
        </button>
        <button
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          {'<'}
        </button>
        <span>
          Page{' '}
          <strong>
            {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </strong>
        </span>
        <button
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          {'>'}
        </button>
        <button
          onClick={() => table.setPageIndex(table.getPageCount() - 1)}
          disabled={!table.getCanNextPage()}
        >
          {'>>'}
        </button>
        <select
          value={table.getState().pagination.pageSize}
          onChange={(e) => table.setPageSize(Number(e.target.value))}
        >
          {[10, 20, 30, 50, 100].map(pageSize => (
            <option key={pageSize} value={pageSize}>
              Show {pageSize}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default ROITable;

