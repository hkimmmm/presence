"use client";

import React from "react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
  return (
    <div className="mt-4 flex justify-center space-x-2">
      <button
        className="rounded-md border px-3 py-1 hover:bg-gray-200"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        «
      </button>
      {Array.from({ length: totalPages }, (_, i) => (
        <button
          key={i}
          className={`rounded-md border px-3 py-1 ${
            currentPage === i + 1 ? "bg-blue-600 text-white" : "hover:bg-gray-200"
          }`}
          onClick={() => onPageChange(i + 1)}
        >
          {i + 1}
        </button>
      ))}
      <button
        className="rounded-md border px-3 py-1 hover:bg-gray-200"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        »
      </button>
    </div>
  );
};

export default Pagination;
