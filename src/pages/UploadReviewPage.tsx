import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import SectionHeader from "../components/SectionHeader";
import PrimaryButton from "../components/PrimaryButton";

const pageContainer = "min-h-screen bg-[#05101c] text-white";
const cardBase = "bg-[#0b1c2e]/60 border border-white/10 rounded-xl p-6";

type Mode = "static" | "dynamic" | null;

type UploadSummary = {
  fileName: string | null;
  rowCount: number;
  columnCount: number;
  selectedColumns: string[];
  mode: Mode;
};

export default function UploadReviewPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const [summary, setSummary] = useState<UploadSummary>({
    fileName: null,
    rowCount: 0,
    columnCount: 0,
    selectedColumns: [],
    mode: null,
  });

  useEffect(() => {
    const storedMode =
      (location.state?.mode as Mode) ??
      (localStorage.getItem("insightMode") as Mode | null);

    const uploadedData = JSON.parse(
      localStorage.getItem("uploadedData") || "[]"
    ) as Record<string, unknown>[];

    const selectedColumns = JSON.parse(
      localStorage.getItem("selectedColumns") || "[]"
    ) as string[];

    const fileName = localStorage.getItem("uploadedFileName");

    if (storedMode && storedMode !== "static" && storedMode !== "dynamic") {
      // Guard against unexpected values
      localStorage.removeItem("insightMode");
    } else if (storedMode) {
      localStorage.setItem("insightMode", storedMode);
    }

    setSummary({
      fileName,
      rowCount: uploadedData.length,
      columnCount: uploadedData[0] ? Object.keys(uploadedData[0]).length : 0,
      selectedColumns,
      mode: storedMode ?? null,
    });
  }, [location.state]);

  const hasData = summary.rowCount > 0 && summary.selectedColumns.length > 0;

  const modeLabel = useMemo(() => {
    if (summary.mode === "static") return "Static Insights";
    if (summary.mode === "dynamic") return "Dynamic Insights";
    return "Not selected";
  }, [summary.mode]);

  const handleProceed = () => {
    if (!summary.mode) return;
    navigate("/analysis", { state: { mode: summary.mode } });
  };

  return (
    <div className={pageContainer}>
      <Header />
      <div className="p-10 max-w-5xl mx-auto">
        <SectionHeader
          title="Review Upload"
          sub="Confirm your dataset and column selection before generating insights."
        />

        <div className="grid gap-6 md:grid-cols-2">
          <div className={cardBase}>
            <h3 className="text-xl font-semibold mb-4">Upload Summary</h3>
            <ul className="space-y-2 text-gray-300">
              <li>
                <span className="text-white font-medium">File:</span>{" "}
                {summary.fileName ?? "Not available"}
              </li>
              <li>
                <span className="text-white font-medium">Rows:</span>{" "}
                {summary.rowCount}
              </li>
              <li>
                <span className="text-white font-medium">Columns:</span>{" "}
                {summary.columnCount}
              </li>
              <li>
                <span className="text-white font-medium">Mode:</span>{" "}
                {modeLabel}
              </li>
            </ul>
          </div>

          <div className={cardBase}>
            <h3 className="text-xl font-semibold mb-4">Selected Columns</h3>
            {summary.selectedColumns.length === 0 ? (
              <p className="text-gray-400">
                No columns selected yet. Head back to upload to choose columns.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {summary.selectedColumns.map((col) => (
                  <span
                    key={col}
                    className="px-3 py-1 bg-blue-900/40 border border-blue-500/40 rounded-full text-sm"
                  >
                    {col}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={`${cardBase} mt-6 flex items-center justify-between`}>
          <div>
            <p className="text-white font-semibold">Ready to generate insights?</p>
            <p className="text-gray-400 text-sm">
              You can still go back to the upload screen to change files or
              columns.
            </p>
          </div>
          <div className="flex gap-3">
            <PrimaryButton label="Back to Upload" onClick={() => navigate("/upload")} />
            <PrimaryButton
              label="Proceed to Analysis"
              onClick={handleProceed}
            />
          </div>
        </div>

        {!hasData && (
          <p className="mt-6 text-sm text-amber-300">
            Upload data and select columns to enable analysis.
          </p>
        )}
      </div>
    </div>
  );
}
