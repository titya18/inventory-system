import React from "react";
import { Download, ChevronDown } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type ExportData = Record<string, unknown>[];

interface ExportDropdownProps {
  data: ExportData;
  prefix?: string; // optional prefix like 'users', 'products', etc.
}

const ExportDropdown: React.FC<ExportDropdownProps> = ({ data, prefix = "export" }) => {
  // Generate timestamped file name, e.g. "users_2025-07-08_10-30-00"
  const generateFileName = () => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    return `${prefix}_${timestamp}`;
  };

  const exportCSV = () => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, `${generateFileName()}.csv`);
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, `${generateFileName()}.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    if (data.length === 0) return;

    autoTable(doc, {
      head: [Object.keys(data[0])],
      body: data.map(Object.values),
    });

    doc.save(`${generateFileName()}.pdf`);
  };

  return (
    <div className="relative group">
      <button className="px-3 py-2 border rounded text-sm flex items-center gap-2 dark:bg-slate-800 dark:border-slate-700">
        <Download className="w-4 h-4" /> Export <ChevronDown className="w-4 h-4" />
      </button>
      <div className="absolute z-10 hidden group-hover:block mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow p-2 rounded w-48 text-sm">
        <button
          onClick={exportCSV}
          className="block w-full text-left px-2 py-1 hover:bg-gray-100 dark:hover:bg-slate-700"
        >
          Export as CSV
        </button>
        <button
          onClick={exportExcel}
          className="block w-full text-left px-2 py-1 hover:bg-gray-100 dark:hover:bg-slate-700"
        >
          Export as Excel
        </button>
        <button
          onClick={exportPDF}
          className="block w-full text-left px-2 py-1 hover:bg-gray-100 dark:hover:bg-slate-700"
        >
          Export as PDF
        </button>
      </div>
    </div>
  );
};

export default ExportDropdown;
