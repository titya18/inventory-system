import { useAppContext } from "@/hooks/useAppContext";
import { getAllBranches } from "@/api/branch";
import { useCallback, useEffect, useState } from "react";
import { BranchType } from "@/data_types/types";

const Filters = ({ filters, onChange }: any) => {
  const [branches, setBranches] = useState<BranchType[]>([]);
  const { user } = useAppContext();

  // Fetch branches (once)
    const fetchBranches = useCallback(async () => {
        try {
            const data = await getAllBranches();
            setBranches(data as BranchType[]);
        } catch (error) {
            console.error("Error fetching branches:", error);
        }
    }, []);

    useEffect(() => {
        fetchBranches();
    }, [fetchBranches]);

  return (
    <div className="flex flex-wrap gap-4 bg-white p-4 rounded shadow">
      <input
        type="date"
        value={filters.startDate}
        onChange={e => onChange({ ...filters, startDate: e.target.value })}
        className="border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
      />

      <input
        type="date"
        value={filters.endDate}
        onChange={e => onChange({ ...filters, endDate: e.target.value })}
        className="border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
      />

      {(user?.roleType === "ADMIN") && (
        <select
          onChange={e =>
            onChange({ ...filters, branchId: Number(e.target.value) || undefined })
          }
          className="border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
        >
            <option value="">All Branches</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      )}
      
    </div>
  );
};

export default Filters;
