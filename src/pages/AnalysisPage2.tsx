import Header from "../components/Header";
import { useEffect, useState } from "react";

export default function AnalysisPage() {
  const [columns, setColumns] = useState<string[]>([]);
  const [selectedColumn, setSelectedColumn] = useState<string>("");

  useEffect(() => {
    const cols = JSON.parse(localStorage.getItem("selectedColumns") || "[]");
    setColumns(cols);
    if (cols.length > 0) setSelectedColumn(cols[0]); // default selection
  }, []);

  return (
    <div className="min-h-screen bg-[#05101c] text-white flex flex-col">
      <Header />

      <div className="flex flex-row h-[calc(100vh-70px)]">
        {/* LEFT PANEL */}
        <div className="w-1/4 bg-[#0b1c2e]/70 border-r border-white/10 p-4 overflow-y-auto">
          <h2 className="text-xl font-semibold mb-4">Selected Columns</h2>

          <ul className="space-y-3">
            {columns.map((col) => (
              <li
                key={col}
                onClick={() => setSelectedColumn(col)}
                className={`cursor-pointer p-2 rounded-md 
                ${selectedColumn === col ? "bg-blue-600" : "bg-[#132a45]/60 hover:bg-[#1a3557]"}`}
              >
                {col}
              </li>
            ))}
          </ul>
        </div>

        {/* RIGHT PANEL (charts area) */}
        <div className="w-3/4 p-6 overflow-y-auto">
          <h2 className="text-2xl font-semibold mb-4">
            Charts for: {selectedColumn}
          </h2>

          {/* Example Placeholder Chart Section */}
          <div className="bg-[#0b1c2e]/60 p-6 rounded-xl border border-white/10 mb-6">
            <p className="text-gray-300 mb-3">Chart 1 - Distribution</p>
            <div className="h-64 bg-[#132a45] rounded-xl"></div>
          </div>

          <div className="bg-[#0b1c2e]/60 p-6 rounded-xl border border-white/10 mb-6">
            <p className="text-gray-300 mb-3">Chart 2 - Relationship</p>
            <div className="h-64 bg-[#132a45] rounded-xl"></div>
          </div>

          <div className="bg-[#0b1c2e]/60 p-6 rounded-xl border border-white/10 mb-6">
            <p className="text-gray-300 mb-3">Chart 3 - Insights</p>
            <div className="h-64 bg-[#132a45] rounded-xl"></div>
          </div>

        </div>
      </div>
    </div>
  );
}
