import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";


interface LeftPanelProps {
  selectedColumns: string[]; // Comes from upload page
  dictionary: Record<string, string>;
  currentMode: "static" | "dynamic";
  onRequestModeChange: (mode: "static" | "dynamic") => void;
}

const LeftPanel = ({ selectedColumns , dictionary, currentMode, onRequestModeChange }: LeftPanelProps) => {
    const navigate = useNavigate();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Currently selected column for bar chart
  const [activeColumn, setActiveColumn] = useState<string | null>(null);

  // Load last selected column from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("activeColumn");
    if (saved) setActiveColumn(saved);
  }, []);

  // Notify bar chart when column changes
  const updateActiveColumn = (col: string) => {
    setActiveColumn(col);
    localStorage.setItem("activeColumn", col);
    window.dispatchEvent(new Event("activeColumnUpdated"));
  };

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);

  return (
    <motion.div
      animate={{ width: isSidebarOpen ? 340 : 70 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="h-full bg-[#0b1c2e]/90 border-r border-white/10 flex flex-col"
    >
      {/* Top Burger Icon */}
      <div className="p-4 flex items-center justify-between">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg hover:bg-[#132030] transition"
        >
          <i className="fas fa-bars text-xl"></i>
        </button>

        {isSidebarOpen && (
          <span className="ml-2 text-lg font-semibold tracking-wide">
            Controls
          </span>
        )}
      </div>

      {/* Sidebar Content */}
      <div className="mt-6 px-4 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-600/40 scrollbar-track-transparent pr-2"
     style={{ maxHeight: "calc(100vh - 80px)" }}>


        <div
          onClick={() => navigate("/upload")}
          className="p-3 rounded-lg bg-[#132030] border border-white/10 cursor-pointer transition hover:border-blue-400"
        >
          {isSidebarOpen ? (
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <i className="fas fa-upload"></i>
              <span>Upload Dataset</span>
            </div>
          ) : (
            <i className="fas fa-upload text-lg"></i>
          )}
        </div>

        <div
          onClick={() => navigate("/cluster")}
          className="p-3 rounded-lg bg-[#132030] border border-white/10 cursor-pointer transition hover:border-blue-400"
        >
          {isSidebarOpen ? (
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <i className="fas fa-project-diagram"></i>
              <span>Cluster Configuration</span>
            </div>
          ) : (
            <i className="fas fa-project-diagram text-lg"></i>
          )}
        </div>

        <div className="relative p-3 rounded-l-lg rounded-r-none bg-[#08121f] border-t border-b border-l border-white/10 border-r-0 -mr-px shadow-[inset_-6px_0_0_#08121f]">
          <div className="flex items-center gap-2 text-sm text-blue-200 font-semibold">
            <span className="h-6 w-1 rounded-full bg-blue-400" />
            <i className="fas fa-chart-line"></i>
            {isSidebarOpen && <span>Profiling/Insight generation</span>}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#132030] p-3 shadow-lg shadow-black/20">
          {isSidebarOpen ? (
            <div className="grid grid-cols-2 gap-2">
                {(["static", "dynamic"] as const).map((mode) => {
                  const selected = currentMode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => !selected && onRequestModeChange(mode)}
                      disabled={selected}
                      className={`rounded-xl border px-3 py-2 text-center text-sm transition ${
                        selected
                          ? "cursor-default border-blue-300/70 bg-blue-500/30 text-blue-100"
                          : "border-white/10 bg-[#0f2236] text-slate-200 hover:border-blue-400 hover:bg-blue-600/20"
                      }`}
                    >
                      <p className="font-semibold capitalize">{mode}</p>
                    </button>
                  );
                })}
            </div>
          ) : (
            <i className="fas fa-sliders-h text-lg text-gray-300"></i>
          )}
        </div>

        {/* COLUMN LIST (NO DROPDOWN) */}
        <div className="p-4 rounded-xl border border-cyan-400/25 bg-gradient-to-br from-[#0f2430] to-[#102735] shadow-lg shadow-black/20">
          {isSidebarOpen ? (
            <div className="space-y-3">

              <p className="uppercase text-[11px] text-cyan-200/90 tracking-wide">
                Columns
              </p>

              <div className="flex flex-wrap gap-2 mt-2">
                {selectedColumns && selectedColumns.length > 0 ? (
                  selectedColumns.map((col) => {
                    const active = activeColumn === col;

                    return (
                      <button
  key={col}
  onClick={() => updateActiveColumn(col)}
  title={dictionary[col] || "No description available"}
  className={`px-4 py-1.5 text-xs rounded-lg border transition-all select-none w-full text-left
    ${active
      ? "bg-cyan-500/25 border-cyan-300/70 text-cyan-50 shadow-[0_0_12px_rgba(34,211,238,0.45)]"
      : "bg-[#0d1f2c] border-white/15 text-slate-200 hover:border-cyan-300/60 hover:bg-cyan-500/15"
    }
  `}
>
  <div className="flex flex-col">
    <span className="font-semibold text-sm">{col}</span>

    {isSidebarOpen && (
      <span className="text-[10px] text-cyan-100/70 leading-tight mt-1">
        {dictionary[col] || "No description available"}
      </span>
    )}
  </div>
</button>

                    );
                  })
                ) : (
                  <p className="text-xs text-gray-500 italic">
                    No columns available
                  </p>
                )}
              </div>
            </div>
          ) : (
            <i className="fas fa-filter text-lg text-gray-300"></i>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default LeftPanel;
