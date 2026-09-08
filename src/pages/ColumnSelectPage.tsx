import Header from "../components/Header";
import { useEffect, useState } from "react";

export default function ColumnSelectPage() {
  const [columns, setColumns] = useState<string[]>([]);
  const [selectedCols, setSelectedCols] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("uploadedData") || "[]");
    if (data.length > 0) {
      setColumns(Object.keys(data[0]));
    }
  }, []);

  const toggleColumn = (col: string) => {
    setSelectedCols((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  };

  const handleSelectAll = () => {
    setSelectAll(!selectAll);
    setSelectedCols(!selectAll ? columns : []);
  };

  return (
    <div className="min-h-screen bg-[#05101c] text-white">
      <Header />

      <div className="p-10 max-w-3xl">
        <h2 className="text-2xl font-semibold mb-6">Select Columns</h2>

        {columns.length === 0 ? (
          <p className="text-gray-400">No columns found. Upload file again.</p>
        ) : (
          <div className="bg-[#0b1c2e]/60 p-6 rounded-xl border border-white/10">
            <label className="flex items-center gap-2 mb-4 cursor-pointer">
              <input
                type="checkbox"
                checked={selectAll}
                onChange={handleSelectAll}
              />
              <span className="text-lg">Select All Columns</span>
            </label>

            <div className="grid grid-cols-2 gap-3">
              {columns.map((col) => (
                <label
                  key={col}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedCols.includes(col)}
                    onChange={() => toggleColumn(col)}
                  />
                  <span>{col}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
