import { useMemo, useState } from 'react';

const getPageWindow = (currentPage, totalPages) => {
  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);

  if (currentPage <= 3) {
    pages.add(2);
    pages.add(3);
  }

  if (currentPage >= totalPages - 2) {
    pages.add(totalPages - 1);
    pages.add(totalPages - 2);
  }

  return Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((first, second) => first - second);
};

const PaginationControls = ({
  currentPage = 1,
  totalPages = 1,
  total = 0,
  isLoading = false,
  onPageChange
}) => {
  const [pageInput, setPageInput] = useState('');
  const safeCurrentPage = Math.max(1, Number(currentPage) || 1);
  const safeTotalPages = Math.max(1, Number(totalPages) || 1);
  const pages = useMemo(() => getPageWindow(safeCurrentPage, safeTotalPages), [safeCurrentPage, safeTotalPages]);

  const goToPage = (nextPage) => {
    const page = Math.min(Math.max(Number(nextPage) || 1, 1), safeTotalPages);
    onPageChange(page);
  };

  const handleJump = (event) => {
    event.preventDefault();
    goToPage(pageInput);
    setPageInput('');
  };

  return (
    <div className="card-footer bg-white border-0 p-4">
      <div className="d-flex flex-column gap-3">
        <div className="d-flex flex-column flex-xl-row align-items-start align-items-xl-center justify-content-between gap-3">
          <span className="text-secondary">
            Page {safeCurrentPage} of {safeTotalPages} · {total} record{total === 1 ? '' : 's'}
          </span>

          <div className="d-flex flex-wrap align-items-center gap-2">
            <button className="btn btn-light" type="button" disabled={safeCurrentPage <= 1 || isLoading} onClick={() => goToPage(1)} style={{ borderRadius: 12 }}>
              First
            </button>
            <button className="btn btn-light" type="button" disabled={safeCurrentPage <= 1 || isLoading} onClick={() => goToPage(safeCurrentPage - 1)} style={{ borderRadius: 12 }}>
              Previous
            </button>

            <div className="d-flex flex-wrap gap-2">
              {pages.map((page, index) => {
                const previousPage = pages[index - 1];
                const hasGap = previousPage && page - previousPage > 1;

                return (
                  <div className="d-flex align-items-center gap-2" key={page}>
                    {hasGap && <span className="text-secondary px-1">...</span>}
                    <button
                      className={`btn ${page === safeCurrentPage ? 'text-white' : 'btn-light'}`}
                      type="button"
                      disabled={isLoading}
                      onClick={() => goToPage(page)}
                      style={{
                        minWidth: 42,
                        borderRadius: 12,
                        background: page === safeCurrentPage ? '#059669' : undefined,
                        borderColor: page === safeCurrentPage ? '#059669' : undefined
                      }}
                    >
                      {page}
                    </button>
                  </div>
                );
              })}
            </div>

            <button className="btn btn-light" type="button" disabled={safeCurrentPage >= safeTotalPages || isLoading} onClick={() => goToPage(safeCurrentPage + 1)} style={{ borderRadius: 12 }}>
              Next
            </button>
            <button className="btn btn-light" type="button" disabled={safeCurrentPage >= safeTotalPages || isLoading} onClick={() => goToPage(safeTotalPages)} style={{ borderRadius: 12 }}>
              Last
            </button>
          </div>
        </div>

        {safeTotalPages > 5 && (
          <form className="d-flex flex-column flex-sm-row align-items-stretch align-items-sm-center justify-content-xl-end gap-2" onSubmit={handleJump}>
            <label className="text-secondary small mb-0 align-self-sm-center" htmlFor="pagination-page-input">
              Go to page
            </label>
            <input
              className="form-control"
              id="pagination-page-input"
              type="number"
              min="1"
              max={safeTotalPages}
              value={pageInput}
              onChange={(event) => setPageInput(event.target.value)}
              placeholder={String(safeCurrentPage)}
              style={{ width: 120, borderRadius: 12 }}
            />
            <button className="btn text-white border-0" type="submit" disabled={isLoading || !pageInput} style={{ background: '#059669', borderRadius: 12 }}>
              Go
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default PaginationControls;
