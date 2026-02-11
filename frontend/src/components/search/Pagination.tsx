"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
    if (totalPages < 1) return null;

    const getPageNumbers = () => {
        const pages = [];
        const maxVisiblePages = 7; // Only show up to 7 page buttons (including first, last, ...)

        if (totalPages <= maxVisiblePages) {
            // Case 1: Less than 7 pages -> Show all
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Case 2, 3, 4: More than 7 pages -> Use ellipsis
            if (currentPage <= 4) {
                // Near start: 1, 2, 3, 4, 5, ..., Total
                for (let i = 1; i <= 5; i++) {
                    pages.push(i);
                }
                pages.push("...");
                pages.push(totalPages);
            } else if (currentPage >= totalPages - 3) {
                // Near end: 1, ..., Total-4, Total-3, Total-2, Total-1, Total
                pages.push(1);
                pages.push("...");
                for (let i = totalPages - 4; i <= totalPages; i++) {
                    pages.push(i);
                }
            } else {
                // Middle: 1, ..., Current-1, Current, Current+1, ..., Total
                pages.push(1);
                pages.push("...");
                pages.push(currentPage - 1);
                pages.push(currentPage);
                pages.push(currentPage + 1);
                pages.push("...");
                pages.push(totalPages);
            }
        }
        return pages;
    };

    return (
        <div className="flex items-center gap-2">
            <button
                disabled={currentPage === 1}
                onClick={() => onPageChange(currentPage - 1)}
                className="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                aria-label="Previous Page"
            >
                <ChevronLeft size={18} />
            </button>

            {getPageNumbers().map((page, index) => (
                typeof page === "number" ? (
                    <button
                        key={index}
                        onClick={() => onPageChange(page)}
                        className={`w-10 h-10 flex items-center justify-center rounded-lg font-medium transition-all cursor-pointer ${currentPage === page
                            ? "bg-primary text-primary-foreground shadow-sm border border-primary"
                            : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                            }`}
                    >
                        {page}
                    </button>
                ) : (
                    <span key={index} className="w-10 h-10 flex items-center justify-center text-slate-400 font-medium">
                        ...
                    </span>
                )
            ))}

            <button
                disabled={currentPage === totalPages}
                onClick={() => onPageChange(currentPage + 1)}
                className="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                aria-label="Next Page"
            >
                <ChevronRight size={18} />
            </button>
        </div>
    );
}
