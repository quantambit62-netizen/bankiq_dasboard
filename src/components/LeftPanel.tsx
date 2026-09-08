import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface LeftPanelProps {
  selectedColumns: string[]; // Comes from upload page
  dictionary: Record<string, string>;
}

const LeftPanel = ({ selectedColumns }: LeftPanelProps) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showSelectCols, setShowSelectCols] = useState(false);

  // This component's own active selection list
  const [activeColumns, setActiveColumns] = useState<string[]>([]);

  // Load existing active columns from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("selectedColumns");
    if (saved) {
      setActiveColumns(JSON.parse(saved));
    } else {
      setActiveColumns([]); // default empty
    }
  }, []);

  // Notify charts when changed
  const updateGlobalColumns = (updated: string[]) => {
    setActiveColumns(updated);
    localStorage.setItem("selectedColumns", JSON.stringify(updated));
    window.dispatchEvent(new Event("selectedColumnsUpdated"));
  };

  // Toggle single column
  const toggleColumn = (col: string) => {
    let updated: string[];

    if (activeColumns.includes(col)) {
      updated = activeColumns.filter((c) => c !== col);
    } else {
      updated = [...activeColumns, col];
    }

    updateGlobalColumns(updated);
  };

  // Select all columns
  const selectAll = () => {
    updateGlobalColumns(selectedColumns);
  };

  // Deselect all columns
  const deselectAll = () => {
    updateGlobalColumns([]);
  };

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);

  return (
    <motion.div
      animate={{ width: isSidebarOpen ? 260 : 70 }}
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
      <div className="mt-6 px-4 space-y-4">
        
        {/* Upload Dataset */}
        <div className="p-3 rounded-lg bg-[#132030] border border-white/10">
          {isSidebarOpen ? (
            <p className="text-sm text-gray-300">Upload Dataset</p>
          ) : (
            <i className="fas fa-upload text-lg"></i>
          )}
        </div>

        {/* Select Insights */}
        <div className="p-3 rounded-lg bg-[#132030] border border-white/10">
          {isSidebarOpen ? (
            <p className="text-sm text-gray-300">Select Insights</p>
          ) : (
            <i className="fas fa-chart-bar text-lg"></i>
          )}
        </div>

        {/* SELECT COLUMNS PANEL */}
        <div className="p-4 rounded-xl bg-[#121C27] border border-white/10 shadow-lg shadow-black/20">
          {isSidebarOpen ? (
            <div className="space-y-3">
              
              {/* Header */}
              <button
                onClick={() => setShowSelectCols((prev) => !prev)}
                className="w-full flex items-center justify-between text-sm font-medium text-gray-200 tracking-wide"
              >
                <span className="uppercase text-[11px] text-gray-400">
                  Select Columns
                </span>
                <i
                  className={`fas fa-chevron-${
                    showSelectCols ? "down" : "right"
                  } text-xs transition-transform duration-300`}
                ></i>
              </button>

              {/* Content */}
              {showSelectCols && (
                <div className="mt-1 space-y-4 animate-fadeIn">

                  {/* Select All / Deselect All */}
                  <div className="flex gap-2">
                    <button
                      onClick={selectAll}
                      className="px-3 py-1 text-xs rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 
                               text-white shadow-md hover:scale-105 transition-transform"
                    >
                      Select All
                    </button>

                    <button
                      onClick={deselectAll}
                      className="px-3 py-1 text-xs rounded-lg bg-gradient-to-r from-red-600 to-red-500 
                               text-white shadow-md hover:scale-105 transition-transform"
                    >
                      Deselect All
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="border-b border-gray-700/40"></div>

                  {/* Column Buttons */}
                  <div className="flex flex-wrap gap-2">
                    {selectedColumns && selectedColumns.length > 0 ? (
                      selectedColumns.map((col) => {
                        const active = activeColumns.includes(col);

                        return (
                          <button
                            key={col}
                            onClick={() => toggleColumn(col)}
                            className={`px-4 py-1.5 text-xs rounded-full border backdrop-blur-md transition-all select-none
                              ${
                                active
                                  ? "bg-green-600/90 border-green-400 shadow-[0_0_10px_rgba(0,255,150,0.5)] text-white hover:bg-green-500"
                                  : "bg-gray-700/40 border-gray-500/40 text-gray-300 hover:bg-gray-600/50 hover:text-white"
                              } 
                              hover:scale-[1.05] active:scale-[0.97]`}
                          >
                            {col}
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
              )}
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
