"use client";

import React, { useState } from "react";

interface TableProps {
  columns: string[];
  data: (string | React.ReactNode)[][];
  onSelectionChange?: (selectedIndexes: number[]) => void;
}

const Table: React.FC<TableProps> = ({ columns, data, onSelectionChange }) => {
  const [selectedRows, setSelectedRows] = useState<number[]>([]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allIndexes = data.map((_, i) => i);
      setSelectedRows(allIndexes);
      onSelectionChange?.(allIndexes);
    } else {
      setSelectedRows([]);
      onSelectionChange?.([]);
    }
  };

  const handleSelectRow = (index: number) => {
    const updated = selectedRows.includes(index)
      ? selectedRows.filter((i) => i !== index)
      : [...selectedRows, index];

    setSelectedRows(updated);
    onSelectionChange?.(updated);
  };

  const isAllSelected = selectedRows.length === data.length;

  return (
    <div className="w-full overflow-x-auto bg-white shadow-md rounded-sm">
    <table className="min-w-[1000px] w-full border-collapse">
      <thead className="bg-gray-50 border-b border-gray-300 text-sm text-gray-500">
        <tr>
          <th className="p-3 text-center">
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={handleSelectAll}
            />
          </th>
          {columns.map((column, index) => (
            <th key={index} className="p-2 whitespace-nowrap text-left">
              {column}
            </th>
          ))}
        </tr>
      </thead>
  
      <tbody className="text-sm text-black">
        {data.map((row, rowIndex) => (
          <tr
            key={rowIndex}
            className="border-b border-gray-300 hover:bg-gray-100"
          >
            <td className="p-3 text-center">
              <input
                type="checkbox"
                checked={selectedRows.includes(rowIndex)}
                onChange={() => handleSelectRow(rowIndex)}
              />
            </td>
            {row.map((cell, cellIndex) => (
              <td key={cellIndex} className="p-2 whitespace-nowrap">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
  
  );
};

export default Table;
