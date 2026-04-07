// components/VisibleColumnsSelector.tsx
import React from "react";
import { Eye, ChevronDown } from "lucide-react";

interface VisibleColumnsSelectorProps {
  allColumns: string[];
  visibleColumns: string[];
  onToggleColumn: (col: string) => void;
}

const VisibleColumnsSelector: React.FC<VisibleColumnsSelectorProps> = ({
  allColumns,
  visibleColumns,
  onToggleColumn,
}) => {
  return (
    <div className="relative group">
      <button className="px-3 py-2 border rounded text-sm flex items-center gap-2 dark:bg-slate-800 dark:border-slate-700">
        <Eye className="w-4 h-4" /> Columns <ChevronDown className="w-4 h-4" />
      </button>
      <div className="absolute z-10 hidden group-hover:block mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow p-2 rounded w-48">
        {allColumns.map((col) => (
          <label key={col} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={visibleColumns.includes(col)}
              onChange={() => onToggleColumn(col)}
            />
            {col}
          </label>
        ))}
      </div>
    </div>
  );
};

export default VisibleColumnsSelector;