'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import clsx from 'clsx';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  itemName?: string;
  className?: string;
  showPageNumbers?: boolean;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
  itemName = 'records',
  className = '',
  showPageNumbers = true,
}: PaginationProps) {
  const validTotalPages = Math.max(1, totalPages);
  const startItem = totalItems !== undefined && totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem = totalItems !== undefined ? Math.min(currentPage * pageSize, totalItems) : 0;

  // Generate smart page numbers list
  const getPageNumbers = (): (number | string)[] => {
    if (validTotalPages <= 7) {
      return Array.from({ length: validTotalPages }, (_, i) => i + 1);
    }

    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', validTotalPages];
    }

    if (currentPage >= validTotalPages - 3) {
      return [
        1,
        '...',
        validTotalPages - 4,
        validTotalPages - 3,
        validTotalPages - 2,
        validTotalPages - 1,
        validTotalPages,
      ];
    }

    return [
      1,
      '...',
      currentPage - 1,
      currentPage,
      currentPage + 1,
      '...',
      validTotalPages,
    ];
  };

  const pages = getPageNumbers();

  return (
    <div
      className={clsx(
        'px-4 sm:px-6 py-3.5 bg-slate-50/60 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs',
        className
      )}
    >
      {/* Left: Range and Info */}
      <div className="flex items-center gap-3 text-slate-500 font-normal order-2 sm:order-1">
        {totalItems !== undefined ? (
          totalItems > 0 ? (
            <span>
              Showing <span className="font-semibold text-slate-900">{startItem}</span> to{' '}
              <span className="font-semibold text-slate-900">{endItem}</span> of{' '}
              <span className="font-semibold text-slate-900">{totalItems}</span> {itemName}
            </span>
          ) : (
            <span>No {itemName} found</span>
          )
        ) : (
          <span>
            Page <span className="font-semibold text-slate-900">{currentPage}</span> of{' '}
            <span className="font-semibold text-slate-900">{validTotalPages}</span>
          </span>
        )}

        {/* Optional Page Size Selector */}
        {onPageSizeChange && totalItems !== undefined && totalItems > 10 && (
          <div className="hidden md:flex items-center gap-1.5 pl-2 border-l border-slate-200">
            <span className="text-slate-400">Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1);
              }}
              className="bg-white border border-slate-200 text-slate-700 font-medium rounded-lg px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: Pagination Controls */}
      <div className="flex items-center gap-1.5 order-1 sm:order-2">
        {/* First Page button (for large page counts) */}
        {validTotalPages > 7 && (
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={currentPage <= 1}
            aria-label="First page"
            className="p-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-2xs"
          >
            <ChevronsLeft size={14} />
          </button>
        )}

        {/* Previous Page Button */}
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          aria-label="Previous page"
          className="p-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-2xs flex items-center gap-1"
        >
          <ChevronLeft size={14} />
          <span className="hidden md:inline font-medium">Prev</span>
        </button>

        {/* Page Number Buttons */}
        {showPageNumbers && (
          <div className="flex items-center gap-1">
            {pages.map((p, idx) => {
              if (typeof p === 'string') {
                return (
                  <span
                    key={`ellipsis-${idx}`}
                    className="w-7 h-7 flex items-center justify-center text-slate-400 font-bold select-none text-xs"
                  >
                    ...
                  </span>
                );
              }

              const isSelected = p === currentPage;
              return (
                <button
                  key={`page-${p}`}
                  type="button"
                  onClick={() => onPageChange(p)}
                  aria-current={isSelected ? 'page' : undefined}
                  className={clsx(
                    'w-7 h-7 rounded-lg text-xs font-semibold transition-all flex items-center justify-center',
                    isSelected
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  )}
                >
                  {p}
                </button>
              );
            })}
          </div>
        )}

        {/* Next Page Button */}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(validTotalPages, currentPage + 1))}
          disabled={currentPage >= validTotalPages}
          aria-label="Next page"
          className="p-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-2xs flex items-center gap-1"
        >
          <span className="hidden md:inline font-medium">Next</span>
          <ChevronRight size={14} />
        </button>

        {/* Last Page button (for large page counts) */}
        {validTotalPages > 7 && (
          <button
            type="button"
            onClick={() => onPageChange(validTotalPages)}
            disabled={currentPage >= validTotalPages}
            aria-label="Last page"
            className="p-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-2xs"
          >
            <ChevronsRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

export default Pagination;
