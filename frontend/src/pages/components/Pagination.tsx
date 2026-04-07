// components/PaginationControls.tsx
import React from "react";

interface PaginationControlsProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (newPage: number) => void;
  onPageSizeChange: (newSize: number) => void;
}

const Pagination: React.FC<PaginationControlsProps> = ({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="dataTable-bottom">
      {/* LEFT TEXT */}
      <div className="dataTable-info">
        Showing {start} to {end} of {total} entries
      </div>

      {/* PAGE SIZE DROPDOWN */}
      <div className="dataTable-dropdown">
        <label>
          <select
            className="dataTable-selector"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
          >
            {[10, 20, 50, 100].map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </label>
      </div>

      {/* PAGINATION BUTTONS */}
      <nav className="dataTable-pagination">
        <ul className="m-auto mb-4 inline-flex items-center space-x-1 rtl:space-x-reverse">

          {/* FIRST PAGE */}
          <li
            className={`pager ${page === 1 ? "disabled" : ""}`}
            onClick={() => page !== 1 && onPageChange(1)}
          >
            <button type="button"
              className="flex justify-center rounded-full bg-white-light p-2 font-semibold text-dark transition hover:bg-primary hover:text-white dark:bg-[#191e3a] dark:text-white-light dark:hover:bg-primary"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                className="h-5 w-5 rtl:rotate-180"
              >
                <path d="M13 19L7 12L13 5" stroke="currentColor" strokeWidth="1.5"
                  strokeLinecap="round" strokeLinejoin="round"></path>
                <path opacity="0.5" d="M16.9998 19L10.9998 12L16.9998 5"
                  stroke="currentColor" strokeWidth="1.5"
                  strokeLinecap="round" strokeLinejoin="round"></path>
              </svg>
            </button>
          </li>

          {/* PREVIOUS PAGE */}
          <li
            className={`pager ${page === 1 ? "disabled" : ""}`}
            onClick={() => page > 1 && onPageChange(page - 1)}
          >
            <button type="button"
              className="flex justify-center rounded-full bg-white-light p-2 font-semibold text-dark transition hover:bg-primary hover:text-white dark:bg-[#191e3a] dark:text-white-light dark:hover:bg-primary"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                className="h-5 w-5 rtl:rotate-180"
              >
                <path d="M15 5L9 12L15 19" stroke="currentColor"
                  strokeWidth="1.5" strokeLinecap="round"
                  strokeLinejoin="round"></path>
              </svg>
            </button>
          </li>

          {/* PAGE NUMBERS */}
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <li key={p}>
              <button
                type="button"
                onClick={() => onPageChange(p)}
                className={
                  page === p
                    ? "flex justify-center rounded-full bg-primary px-3.5 py-2 font-semibold text-white transition"
                    : "flex justify-center rounded-full bg-white-light px-3.5 py-2 font-semibold text-dark transition hover:bg-primary hover:text-white dark:bg-[#191e3a] dark:text-white-light dark:hover:bg-primary"
                }
              >
                {p}
              </button>
            </li>
          ))}

          {/* NEXT PAGE */}
          <li
            className={`pager ${page === totalPages ? "disabled" : ""}`}
            onClick={() => page < totalPages && onPageChange(page + 1)}
          >
            <button
              type="button"
              className="flex justify-center rounded-full bg-white-light p-2 font-semibold text-dark transition hover:bg-primary hover:text-white dark:bg-[#191e3a] dark:text-white-light dark:hover:bg-primary"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                className="h-5 w-5 rtl:rotate-180"
              >
                <path d="M9 5L15 12L9 19" stroke="currentColor"
                  strokeWidth="1.5" strokeLinecap="round"
                  strokeLinejoin="round"></path>
              </svg>
            </button>
          </li>

          {/* LAST PAGE */}
          <li
            className={`pager ${page === totalPages ? "disabled" : ""}`}
            onClick={() => page !== totalPages && onPageChange(totalPages)}
          >
            <button
              type="button"
              className="flex justify-center rounded-full bg-white-light p-2 font-semibold text-dark transition hover:bg-primary hover:text-white dark:bg-[#191e3a] dark:text-white-light dark:hover:bg-primary"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                className="h-5 w-5 rtl:rotate-180"
              >
                <path d="M11 19L17 12L11 5" stroke="currentColor"
                  strokeWidth="1.5" strokeLinecap="round"
                  strokeLinejoin="round"></path>
                <path opacity="0.5" d="M6.99976 19L12.9998 12L6.99976 5"
                  stroke="currentColor" strokeWidth="1.5"
                  strokeLinecap="round" strokeLinejoin="round"></path>
              </svg>
            </button>
          </li>

        </ul>
      </nav>
    </div>
  );
};

export default Pagination;
