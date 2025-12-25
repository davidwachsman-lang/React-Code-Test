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
import crmService from '../../services/crmService';
import './CRMTable.css';

const columnHelper = createColumnHelper();

function CRMTable({ 
  records = [], 
  onRecordClick, 
  onQuickLogActivity,
  onToggleTopTarget 
}) {
  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);

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

  const formatPhoneNumber = (phone) => {
    if (!phone) return 'N/A';
    // Remove all non-numeric characters
    const cleaned = phone.replace(/\D/g, '');
    // Format as xxx-xxx-xxxx
    if (cleaned.length === 10) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    // If not 10 digits, return as-is
    return phone;
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

  const isOverdue = (nextFollowupDate) => {
    if (!nextFollowupDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const followupDate = new Date(nextFollowupDate);
    followupDate.setHours(0, 0, 0, 0);
    return followupDate < today;
  };

  const handleToggleTopTarget = async (e, record) => {
    e.stopPropagation();
    try {
      await crmService.toggleTopTarget(record.id);
      if (onToggleTopTarget) {
        onToggleTopTarget(record.id);
      }
    } catch (error) {
      console.error('Error toggling top target:', error);
      alert('Failed to toggle top target: ' + error.message);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Star',
      'Company Name',
      'Contact Name',
      'Email',
      'Phone',
      'Stage',
      'Next Follow-up',
      'Value',
      'Sales Rep'
    ];
    
    const rows = records.map(record => [
      record.is_top_target ? '★' : '',
      record.company_name || '',
      `${record.first_name || ''} ${record.last_name || ''}`.trim(),
      record.email || '',
      record.phone_primary || '',
      record.relationship_stage || '',
      record.next_followup_date ? formatDate(record.next_followup_date) : 'N/A',
      record.relationship_stage === 'active_customer' && record.lifetime_revenue
        ? formatCurrency(record.lifetime_revenue)
        : record.estimated_job_value
        ? formatCurrency(record.estimated_job_value)
        : 'N/A',
      record.primary_sales_rep || 'Unassigned'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `crm_records_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor('is_top_target', {
        header: '',
        id: 'star',
        cell: (info) => (
          <button
            className={`star-button ${info.getValue() ? 'starred' : ''}`}
            onClick={(e) => handleToggleTopTarget(e, info.row.original)}
            title={info.getValue() ? 'Remove from top targets' : 'Add to top targets'}
          >
            {info.getValue() ? '★' : '☆'}
          </button>
        ),
        enableSorting: true,
        size: 50,
      }),
      columnHelper.accessor(
        (row) => row.parent_company_name || (row.parent_id ? 'Loading...' : ''),
        {
          header: 'Parent Company',
          id: 'parent_company_name',
          cell: (info) => {
            const value = info.getValue();
            return value || 'N/A';
          },
          enableSorting: true,
          size: 180,
        }
      ),
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
        cell: (info) => info.getValue() || 'Unassigned',
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
      columnHelper.accessor('industry', {
        id: 'industry',
        header: 'Industry',
        cell: (info) => {
          const industry = info.getValue();
          if (!industry) return 'N/A';
          // Format industry names for display
          const industryMap = {
            'multi_family': 'Multi-Family',
            'retail': 'Retail',
            'office': 'Office',
            'hotel': 'Hotel',
            'restaurant': 'Restaurant',
            'healthcare': 'Healthcare',
            'school': 'School',
            'warehouse': 'Warehouse',
            'other': 'Other'
          };
          return industryMap[industry] || industry;
        },
        enableSorting: true,
        size: 150,
      }),
      columnHelper.accessor('association_membership', {
        id: 'association_membership',
        header: 'Association Membership',
        cell: (info) => info.getValue() || 'N/A',
        enableSorting: true,
        size: 200,
      }),
      columnHelper.accessor(
        (row) => `${row.first_name || ''} ${row.last_name || ''}`.trim(),
        {
          header: 'Contact Name',
          id: 'contact_name',
          cell: (info) => info.getValue() || 'N/A',
          enableSorting: true,
          size: 180,
        }
      ),
      columnHelper.accessor('email', {
        id: 'email',
        header: 'Email',
        cell: (info) => {
          const email = info.getValue();
          return email ? (
            <a href={`mailto:${email}`} onClick={(e) => e.stopPropagation()}>
              {email}
            </a>
          ) : (
            'N/A'
          );
        },
        enableSorting: true,
        size: 200,
      }),
      columnHelper.accessor('phone_primary', {
        id: 'phone_primary',
        header: 'Phone',
        cell: (info) => {
          const phone = info.getValue();
          if (!phone) return 'N/A';
          const formatted = formatPhoneNumber(phone);
          return (
            <a href={`tel:${phone.replace(/\D/g, '')}`} onClick={(e) => e.stopPropagation()}>
              {formatted}
            </a>
          );
        },
        enableSorting: true,
        size: 220,
      }),
      columnHelper.accessor('next_followup_date', {
        id: 'next_followup_date',
        header: 'Next Follow-up',
        cell: (info) => {
          const date = info.getValue();
          const overdue = date && isOverdue(date);
          return (
            <span className={overdue ? 'followup-overdue' : ''}>
              {date ? formatDate(date) : 'N/A'}
              {overdue && <span className="overdue-indicator"> ⚠️</span>}
            </span>
          );
        },
        enableSorting: true,
        size: 160,
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Add Notes',
        cell: (info) => (
          <div className="crm-table-actions" onClick={(e) => e.stopPropagation()}>
            {onQuickLogActivity && (
              <button
                className="btn-action btn-log"
                onClick={() => onQuickLogActivity(info.row.original)}
                title="Add notes / log activity"
              >
                📝
              </button>
            )}
          </div>
        ),
        size: 120,
      }),
    ],
    [onRecordClick, onQuickLogActivity, onToggleTopTarget]
  );

  const table = useReactTable({
    data: records,
    columns,
    state: {
      sorting,
      columnFilters,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
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
        <p>No CRM records found.</p>
      </div>
    );
  }

  return (
    <div className="crm-table-container">
      <div className="crm-table-controls">
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
                className={`crm-table-row ${row.original.is_top_target ? 'top-target' : ''}`}
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

export default CRMTable;

