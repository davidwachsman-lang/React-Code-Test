export default function Pagination({ table, totalResults }) {
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

  return (
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
        {totalResults} results
      </div>
      <div className="pagination-buttons">
        <button onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()} className="pagination-btn">
          &#171;
        </button>
        <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="pagination-btn">
          &#8249;
        </button>
        {pages.map((page, idx) =>
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
        )}
        <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="pagination-btn">
          &#8250;
        </button>
        <button onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()} className="pagination-btn">
          &#187;
        </button>
      </div>
    </div>
  );
}
