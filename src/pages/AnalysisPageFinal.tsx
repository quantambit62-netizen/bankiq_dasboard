import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
//import HeatMapChart from "../components/charts/HeatMapChart";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import Papa from "papaparse";

import Header from "../components/Header";
import LeftPanel from "../components/LeftPanel2";
import DynamicCharts from "../components/DynamicChart1";

const DOWNLOAD_URL_API =
  "https://pxca8372m3.execute-api.ap-south-1.amazonaws.com/getDownloadUrl";

function parseS3Url(s3Url: string): { bucket: string; key: string } | null {
  const match = s3Url.match(/^s3:\/\/([^/]+)\/(.+)$/);
  if (!match) return null;
  return { bucket: match[1], key: match[2] };
}

async function getPresignedDownloadUrl(s3Url: string): Promise<string | null> {
  const parsed = parseS3Url(s3Url);
  if (!parsed) throw new Error(`Invalid S3 URL: ${s3Url}`);
  const response = await fetch(DOWNLOAD_URL_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ s3_key: parsed.key, s3_bucket: parsed.bucket }),
  });
  if (!response.ok) throw new Error(`Download URL API failed: ${response.status}`);
  const data = await response.json();
  return data?.downloadUrl || data?.download_url || data?.url || data?.presignedUrl || data?.presigned_url || null;
}

function getOutputFolderS3Uri(): string {
  const rawPath = localStorage.getItem("s3_path") || localStorage.getItem("s3_key") || "";
  if (!rawPath) return "";
  const normalized = rawPath.replace(/\\/g, "/");
  const inputFolder = normalized.endsWith("/")
    ? normalized
    : normalized.substring(0, normalized.lastIndexOf("/") + 1);
  if (inputFolder.endsWith("/input/") || inputFolder.endsWith("/input")) {
    return inputFolder.replace(/\/input\/?$/, "/output/");
  }
  return `${inputFolder}output/`;
}

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import { motion } from "framer-motion";
import Heatmap from "../components/HeatMap";

// simple Row type
type Row = Record<string, any>;
// Types for API response
export interface ClusterData {
  title: string;
  insights: string[];
  recommendations?: Array<{
    product: string;
    reason: string;
  }>;
}

export interface InsightResponse {
  insight: {
    clusters: Record<string, ClusterData>;
  };
}

export default function AnalysisPage() {
  const location = useLocation();
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [data, setData] = useState<Row[]>([]);
  const [clusterDistribution, setClusterDistribution] = useState<any[]>([]);
  const [columnCharts, setColumnCharts] = useState<Record<string, any[]>>({});
  const [showInsights, setShowInsights] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isDownloadingReport, setIsDownloadingReport] = useState(false);
  const [csvLoading, setCsvLoading] = useState(true);
  const [csvError, setCsvError] = useState("");
  const [insightMode, setInsightMode] = useState<"static" | "dynamic">(
    ((localStorage.getItem("insightMode") as "static" | "dynamic" | null) ??
      (location.state?.mode as "static" | "dynamic" | undefined) ??
      "static")
  );
  const [showInsightModeModal, setShowInsightModeModal] = useState(false);
  const [insightModeChoice, setInsightModeChoice] = useState<"static" | "dynamic" | null>(null);
  const [insightModeColumns, setInsightModeColumns] = useState<string[]>([]);
  const [insightSelectedColumns, setInsightSelectedColumns] = useState<string[]>([]);
  const [insightSelectionError, setInsightSelectionError] = useState("");
  const [isHeatmapMaximized, setIsHeatmapMaximized] = useState(false);

  const rawDict = JSON.parse(localStorage.getItem("dataDictionary") || "{}");

  const dictionary =
    insightMode === "static"
      ? rawDict.static || {}
      : rawDict.dynamic || {};


  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

  // ---------- helper: compute cluster ids present in data ----------
  const getClusterIds = (rows: Row[]) => {
    const ids = Array.from(new Set(rows.map((r) => String(r["Cluster"] ?? "").trim()).filter(Boolean)));
    return ids.length > 0 ? ids.sort() : ["0", "1", "2"];
  };

  // ---------- helper: compute chart data for a given column ----------
  const computeChartForColumn = (col: string, rows: Row[], clusterIds: string[]) => {
    const grouped: Record<string, Record<string, number>> = {};

    rows.forEach((row) => {
      const cluster = String(row["Cluster"] ?? "").trim();
      const value = String(row[col] ?? ""); // value can be empty string

      if (!grouped[value]) grouped[value] = {};
      // ensure cluster keys exist
      clusterIds.forEach((c) => {
        if (!grouped[value][c]) grouped[value][c] = 0;
      });

      // increment if cluster is present; otherwise put into a fallback cluster key
      const clusterKey = cluster || clusterIds[0];
      grouped[value][clusterKey] = (grouped[value][clusterKey] || 0) + 1;
    });

    // format to Recharts friendly array, removing undefined keys
    const formatted = Object.keys(grouped)
      .filter((val) => val !== "undefined")
      .map((val) => {
        const obj: any = { name: val };
        clusterIds.forEach((c) => {
          obj[c] = grouped[val][c] || 0;
        });
        return obj;
      });

    return formatted;
  };

  // ---------- helpers to recompute charts from rows ----------
  const applyData = (rows: Row[], cols: string[]) => {
    if (!rows.length) return;
    const clusterIds = getClusterIds(rows);
    const counts: Record<string, number> = {};
    rows.forEach((row) => {
      const c = String(row["Cluster"] ?? "").trim();
      if (c === "") return;
      counts[c] = (counts[c] || 0) + 1;
    });
    const formatted = Object.keys(counts)
      .sort()
      .map((key, idx) => ({
        name: `Cluster ${key}`,
        value: counts[key],
        color: COLORS[idx % COLORS.length],
      }));
    setClusterDistribution(formatted);
    const newCharts: Record<string, any[]> = {};
    cols.forEach((col) => {
      newCharts[col] = computeChartForColumn(col, rows, clusterIds);
    });
    setColumnCharts(newCharts);
  };

  const getColumnsForInsightMode = (mode: "static" | "dynamic"): string[] => {
    const modeData = rawDict?.[mode] || {};
    const columns = Array.isArray(modeData) ? modeData : Object.keys(modeData);
    return columns.filter((column: string) => column && column.trim().length > 0);
  };

  const requestInsightModeChange = (mode: "static" | "dynamic") => {
    setInsightModeChoice(mode);
    setInsightModeColumns(getColumnsForInsightMode(mode));
    setInsightSelectedColumns([]);
    setInsightSelectionError("");
    setShowInsightModeModal(true);
  };

  const toggleInsightColumn = (column: string) => {
    setInsightSelectionError("");
    setInsightSelectedColumns((prev) =>
      prev.includes(column) ? prev.filter((item) => item !== column) : [...prev, column]
    );
  };

  const applyInsightSelection = () => {
    if (!insightModeChoice) {
      setInsightSelectionError("Please choose an insight mode.");
      return;
    }
    if (insightSelectedColumns.length === 0) {
      setInsightSelectionError("Please select at least one column/feature.");
      return;
    }

    localStorage.setItem("insightMode", insightModeChoice);
    localStorage.setItem("selectedColumns", JSON.stringify(insightSelectedColumns));
    window.dispatchEvent(new Event("selectedColumnsUpdated"));

    setInsightMode(insightModeChoice);
    setSelectedColumns(insightSelectedColumns);
    applyData(data, insightSelectedColumns);
    setShowInsights(false);
    setClusters(null);
    setShowInsightModeModal(false);
  };

  // ---------- load clustered CSV from S3 output folder ----------
  useEffect(() => {
    const initialSelected = JSON.parse(localStorage.getItem("selectedColumns") || "[]");
    setSelectedColumns(initialSelected);

    const outputFolder = getOutputFolderS3Uri();
    if (!outputFolder) {
      setCsvError("Output folder path not found. Please run clustering first.");
      setCsvLoading(false);
      return;
    }

    const csvS3Uri = `${outputFolder}clustered_output.csv`;

    (async () => {
      try {
        const presignedUrl = await getPresignedDownloadUrl(csvS3Uri);
        if (!presignedUrl) throw new Error("Could not get presigned URL for clustered_output.csv");

        const response = await fetch(presignedUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status} fetching clustered_output.csv`);

        const text = await response.text();
        const parsed = Papa.parse<Row>(text, { header: true, skipEmptyLines: true, dynamicTyping: true });
        const rows = parsed.data;
        setData(rows);
        applyData(rows, initialSelected);
      } catch (err) {
        setCsvError((err as Error).message);
      } finally {
        setCsvLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Listen to LeftPanel selection changes (via window event) ----------
  useEffect(() => {
    const handler = () => {
      const stored = JSON.parse(localStorage.getItem("selectedColumns") || "[]") as string[];
      setSelectedColumns(stored);

      // recompute charts: remove deselected, add newly selected
      setColumnCharts((prev) => {
        const clusterIds = getClusterIds(data);
        // keep only charts for currently selected columns
        const newPrev: Record<string, any[]> = {};
        stored.forEach((c) => {
          if (prev[c]) newPrev[c] = prev[c];
        });

        // compute for newly selected columns that are missing
        stored.forEach((c) => {
          if (!newPrev[c]) {
            newPrev[c] = computeChartForColumn(c, data, clusterIds);
          }
        });

        return newPrev;
      });
    };

    window.addEventListener("selectedColumnsUpdated", handler);
    return () => window.removeEventListener("selectedColumnsUpdated", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // ---------- manual handler if you ever want to compute chart from AnalysisPage (kept for compatibility) ----------

  const downloadReport = async () => {
    const report = document.getElementById("report-content");
    if (!report) {
      window.alert("Unable to find report content to download.");
      return;
    }

    const normalizeColor = (value: string, fallback = "rgba(0,0,0,0)") => {
      if (!value) return fallback;
      const lower = value.toLowerCase();
      if (!lower.includes("oklab") && !lower.includes("oklch") && !lower.includes("color-mix")) {
        return value;
      }

      const ctx = document.createElement("canvas").getContext("2d");
      if (!ctx) return fallback;

      // Canvas color parser supports browser-native color functions and serializes
      // them into safe hex/rgb values that html2canvas can parse.
      ctx.fillStyle = fallback;
      ctx.fillStyle = value;
      return ctx.fillStyle || fallback;
    };

    try {
      setIsDownloadingReport(true);

      // Use onclone to resolve oklch/oklab computed colors to rgb() inline before html2canvas
      // parses them — Chrome resolves modern color functions to rgb() in getComputedStyle,
      // so reading them here and writing them as inline styles prevents the parse error.
      // We also strip background-image gradients which may contain oklch/oklab.
      const canvas = await html2canvas(report, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#0b1c2e",
        scrollX: 0,
        scrollY: -window.scrollY,
        logging: false,
        onclone: (_clonedDoc: Document, clonedEl: HTMLElement) => {
          const origEls = Array.from(report.querySelectorAll<HTMLElement>("*"));
          const cloneEls = Array.from(clonedEl.querySelectorAll<HTMLElement>("*"));
          origEls.forEach((orig, i) => {
            const clone = cloneEls[i];
            if (!clone) return;
            const cs = window.getComputedStyle(orig);
            clone.style.setProperty("color", normalizeColor(cs.color, "#e2e8f0"), "important");
            clone.style.setProperty("background-color", normalizeColor(cs.backgroundColor, "rgba(0,0,0,0)"), "important");
            clone.style.setProperty("border-top-color", normalizeColor(cs.borderTopColor, "rgba(0,0,0,0)"), "important");
            clone.style.setProperty("border-bottom-color", normalizeColor(cs.borderBottomColor, "rgba(0,0,0,0)"), "important");
            clone.style.setProperty("border-left-color", normalizeColor(cs.borderLeftColor, "rgba(0,0,0,0)"), "important");
            clone.style.setProperty("border-right-color", normalizeColor(cs.borderRightColor, "rgba(0,0,0,0)"), "important");
            clone.style.setProperty("box-shadow", "none", "important");
            clone.style.setProperty("text-shadow", "none", "important");
            // Strip background-image gradients that may contain oklch/oklab
            clone.style.setProperty("background-image", "none", "important");
          });
          // Fix the root captured element itself
          const rootCs = window.getComputedStyle(report);
          clonedEl.style.setProperty("background-color", normalizeColor(rootCs.backgroundColor, "#0b1c2e"), "important");
          clonedEl.style.setProperty("background-image", "none", "important");
        },
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      const totalPages = Math.max(1, Math.ceil(imgHeight / pdfHeight));

      for (let page = 0; page < totalPages; page++) {
        if (page > 0) {
          pdf.addPage();
        }

        const yOffset = -page * pdfHeight;
        pdf.addImage(imgData, "PNG", 0, yOffset, imgWidth, imgHeight);

        pdf.setFontSize(10);
        pdf.text(`Page ${page + 1} of ${totalPages}`, pdfWidth - 38, pdfHeight - 10);
        pdf.text("Generated by Quantam Analytics", 10, pdfHeight - 10);
      }

      pdf.save("analysis-report.pdf");
    } catch (error) {
      console.error("[downloadReport] Failed to generate PDF:", error);
      window.alert("Could not generate the report PDF. Please try again.");
    } finally {
      setIsDownloadingReport(false);
    }
  };



  const totalCustomers = data.length;
  const [clusters, setClusters] = useState<Record<string, ClusterData> | null>(null);
  const clusteredOutputS3Uri = `${getOutputFolderS3Uri()}clustered_output.csv`;
  const clusteredOutputTarget = parseS3Url(clusteredOutputS3Uri);

  const buildInsightRequestBody = (): string => {
    if (!clusteredOutputTarget) {
      throw new Error("Clustered output S3 path is not available.");
    }

    const columnDescriptions: Record<string, string> = {};
    selectedColumns.forEach((col) => {
      if (rawDict.static?.[col]) {
        columnDescriptions[col] = rawDict.static[col];
      } else if (rawDict.dynamic?.[col]) {
        columnDescriptions[col] = rawDict.dynamic[col];
      } else {
        columnDescriptions[col] = "No description available";
      }
    });
    return JSON.stringify({
      s3_bucket: clusteredOutputTarget.bucket,
      s3_key: clusteredOutputTarget.key,
      cluster_column: "Cluster",
      selected_features: selectedColumns,
      column_descriptions: columnDescriptions,
    });
  };

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const insightRequestBody = buildInsightRequestBody();
      console.log("[insights] request:", insightRequestBody);
      const response = await fetch(
        "https://11pa6tjf3g.execute-api.ap-south-1.amazonaws.com/dev/insights",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: insightRequestBody,
        }
      );
      const json = (await response.json()) as any;
      console.log("[insights] response:", json);
      setClusters(json.insight.clusters);
      setShowInsights(true);
    } catch (err) {
      console.error("Error fetching insights:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#05101c] text-white flex flex-col">
      <Header />

      <div className="flex h-screen w-full bg-[#08121f] text-white overflow-hidden">
        {/* LEFT PANEL — pass list of available columns (from uploaded data keys) */}
        <LeftPanel
          selectedColumns={selectedColumns}
          dictionary={dictionary}
          currentMode={insightMode}
          onRequestModeChange={requestInsightModeChange}
        />

        {/* RIGHT PANEL */}
        <div className="flex-1 overflow-y-auto p-8">
          <div id="report-content" className="bg-[#0b1c2e]/60 p-6 rounded-xl border border-white/10 min-h-[90vh]">
            <h2 className="text-2xl font-semibold mb-6 tracking-wide">Insights Dashboard</h2>

            {csvLoading && (
              <div className="mb-6 rounded-xl border border-blue-400/30 bg-blue-900/20 p-4 text-sm text-blue-200">
                Loading clustered data from S3…
              </div>
            )}
            {!csvLoading && csvError && (
              <div className="mb-6 rounded-xl border border-rose-400/30 bg-rose-900/20 p-4 text-sm text-rose-200">
                {csvError}
              </div>
            )}

            {/* DONUT + SUMMARY */}
            <div className="flex gap-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                whileHover={{
                  scale: 1.02,
                  boxShadow: "0 0 20px rgba(59,130,246,0.3)",
                }}
                className="bg-[#132030] p-4 rounded-xl border border-white/10 w-[60%] flex flex-col items-center justify-center"
              >
                <h3 className="text-lg font-semibold mb-4 self-start">Cluster Distribution</h3>

                <div className="flex justify-center items-center w-full">
                  <PieChart width={380} height={320}>
                    <Pie
                      data={clusterDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      isAnimationActive={true}
                      animationDuration={900}
                      animationEasing="ease-out"
                      label={(entry) =>
                        totalCustomers > 0
                          ? `${((entry.value / totalCustomers) * 100).toFixed(1)}%`
                          : ""
                      }
                    >
                      {clusterDistribution.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                whileHover={{
                  scale: 1.02,
                  boxShadow: "0 0 20px rgba(59,130,246,0.3)",
                }}
                className="relative bg-gradient-to-br from-[#0f1a2b] to-[#132030] p-6 rounded-2xl border border-blue-500/30 w-[35%] shadow-lg overflow-hidden flex flex-col"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>

                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <span className="text-blue-400 text-2xl">👥</span> Customer Overview
                </h3>

                <div className="text-center mb-4">
                  <p className="text-sm text-gray-400 tracking-wide">Total Customers</p>
                  <p className="text-6xl font-bold text-blue-400 drop-shadow-md">{totalCustomers}</p>
                </div>

                <div className="w-full h-px bg-white/10 my-4"></div>

                <div className="text-sm text-gray-300 mb-4 space-y-1">
                  {clusterDistribution.map((entry) => (
                    <p key={entry.name}>
                      <span className="font-bold" style={{ color: entry.color }}>
                        {entry.name}:
                      </span>{" "}
                      {entry.value} customers
                    </p>
                  ))}
                </div>

                <div className="mt-2">
                  <p className="text-xs text-gray-400 mb-1">Overall Distribution</p>
                  <div className="w-full bg-[#0d1625] h-3 rounded-full overflow-hidden flex">
                    {clusterDistribution.map((entry) => (
                      <div
                        key={entry.name}
                        className="h-full"
                        style={{
                          width: `${totalCustomers > 0 ? (entry.value / totalCustomers) * 100 : 0}%`,
                          backgroundColor: entry.color,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>

            {/* DYNAMIC CHARTS */}
            <DynamicCharts columnCharts={columnCharts} rows={data} />

            {/* HEATMAP */}
                      <div className="mt-10 bg-[#132030] p-6 rounded-xl border border-white/10 transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_0_20px_rgba(59,130,246,0.25)]">
                          <div className="mb-6 flex items-center justify-between gap-3">
                            <h3 className="text-xl font-semibold">Cluster Heatmap</h3>
                            <button
                              type="button"
                              onClick={() => setIsHeatmapMaximized(true)}
                              className="inline-flex items-center gap-2 rounded-lg border border-blue-300/45 bg-[#0b1c2e]/75 px-3 py-1.5 text-xs font-semibold text-blue-100 transition hover:bg-blue-600/25"
                            >
                              <i className="fas fa-expand text-[11px]"></i>
                              <span>Maximize</span>
                            </button>
                          </div>

                            {insightMode === "static" ? (
                              <p className="text-gray-400 text-lg">
                                  No heatmap will be generated for <span className="font-semibold">Static Insights</span>.
                              </p>
                          ) : (
                              <div>
                                  <Heatmap
                                      data={data}
                                      numericColumns={selectedColumns}
                                      clusterColumn="Cluster"
                                      isExpanded={false}
                                  />
                              </div>
                          )}
                      </div>

            {/* AI INSIGHTS */}
          
<div className="mt-6 bg-gradient-to-br from-[#0b1c2e] to-[#132030] p-6 rounded-xl border border-blue-500/30 shadow-xl backdrop-blur-sm transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_0_20px_rgba(59,130,246,0.25)]">
  <button
    onClick={() => {
      if (showInsights) {
        setShowInsights(false);
      } else {
        fetchInsights();
      }
    }}
    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold tracking-wide shadow-lg transition-all duration-300 hover:scale-[1.03] active:scale-[0.97]"
  >
    {loading ? "Loading..." : showInsights ? "Hide AI Insights" : "✨ Generate AI Insights"}
  </button>

  {showInsights && clusters && (
    <div className="mt-6 bg-[#05101c]/90 p-6 rounded-xl border border-white/10 text-gray-200 shadow-inner animate-fadeInSlow">
      <h3 className="text-2xl font-bold text-blue-400 mb-6 tracking-wide">
        📊 AI‑Generated Business Insights
      </h3>

      {Object.entries(clusters).map(([cluster, data], idx) => (
        <div
          key={cluster}
          className="p-5 rounded-lg bg-[#0b1c2e]/70 border border-blue-500/20 hover:border-blue-400/40 transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_0_18px_rgba(0,150,255,0.25)] animate-slideUp mb-6"
          style={{ animationDelay: `${idx * 120}ms` }}
        >
          <h4 className="text-lg font-semibold text-green-400 mb-4">
            Cluster {cluster} — {data.title}
          </h4>

          {/* Two-column bullet list with divider */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 divide-x divide-blue-900/40">
            {data.insights.map((point, i) => (
              <div key={i} className="flex items-start px-3">
                <span className="text-blue-400 mr-2">•</span>
                <p className="text-gray-200 text-lg leading-relaxed">
                  {point}
                </p>
              </div>
            ))}
          </div>

          {Array.isArray(data.recommendations) && data.recommendations.length > 0 && (
            <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-950/10 p-4">
              <h5 className="text-sm font-semibold uppercase tracking-[0.15em] text-emerald-300">
                Recommended Products
              </h5>
              <div className="mt-3 space-y-3">
                {data.recommendations.map((item, recIndex) => (
                  <div
                    key={`${item.product}-${recIndex}`}
                    className="rounded-lg border border-emerald-400/20 bg-[#071822] p-3"
                  >
                    <p className="text-sm font-semibold text-emerald-200">{item.product}</p>
                    <p className="mt-1 text-sm text-slate-200/95">{item.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )}
</div>


          </div>

          {isHeatmapMaximized && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
              <div className="h-[90vh] w-full max-w-6xl overflow-auto rounded-2xl border border-blue-400/35 bg-[#0b1523] shadow-2xl shadow-black/40">
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                  <p className="text-sm font-semibold text-white">Cluster Heatmap</p>
                  <button
                    type="button"
                    onClick={() => setIsHeatmapMaximized(false)}
                    className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-gray-200 transition hover:bg-white/10"
                  >
                    <i className="fas fa-times"></i>
                    <span>Close</span>
                  </button>
                </div>
                <div className="p-6">
                  {insightMode === "static" ? (
                    <p className="text-gray-400 text-lg">
                      No heatmap will be generated for <span className="font-semibold">Static Insights</span>.
                    </p>
                  ) : (
                    <Heatmap
                      data={data}
                      numericColumns={selectedColumns}
                      clusterColumn="Cluster"
                      isExpanded={true}
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="mt-10 flex justify-end">
  <button
              type="button"
    onClick={downloadReport}
              disabled={isDownloadingReport}
              className={`px-6 py-3 rounded-lg font-semibold shadow-lg transition ${
                isDownloadingReport
                  ? "cursor-not-allowed bg-slate-600 text-slate-200"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
  >
              {isDownloadingReport ? "Preparing PDF..." : "Download Report"}
  </button>
</div>

        </div>
      </div>

      {showInsightModeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-[28px] border border-white/10 bg-[#07151f] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-semibold text-white">Choose Insight Mode</h3>
                <p className="mt-2 text-sm text-slate-300">
                  Switch the insight mode and select the columns you want to use for analysis.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowInsightModeModal(false)}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10"
              >
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {(["static", "dynamic"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setInsightModeChoice(mode);
                    setInsightModeColumns(getColumnsForInsightMode(mode));
                    setInsightSelectedColumns([]);
                    setInsightSelectionError("");
                  }}
                  className={`rounded-3xl border px-6 py-5 text-left text-white transition hover:border-blue-400 hover:bg-blue-600/20 ${
                    insightModeChoice === mode
                      ? "border-blue-400 bg-blue-600/20"
                      : "border-white/10 bg-[#0b1c2e]"
                  }`}
                >
                  <p className="text-lg font-semibold capitalize">{mode}</p>
                  <p className="mt-2 text-sm text-slate-300">
                    {mode === "static"
                      ? "Use predefined customer attributes and static insight columns."
                      : "Use transaction-driven attributes and dynamic insight columns."}
                  </p>
                </button>
              ))}
            </div>

            {insightModeChoice && (
              <div className="mt-6 rounded-2xl border border-white/10 bg-[#0b1c2e]/70 p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">Select Columns</p>
                    <p className="text-xs text-slate-400">
                      {insightModeChoice === "static" ? "Static" : "Dynamic"} columns available: {insightModeColumns.length}
                    </p>
                  </div>
                </div>

                <div className="max-h-52 overflow-y-auto rounded-xl border border-white/10 bg-[#07151f] p-3">
                  {insightModeColumns.length === 0 ? (
                    <p className="text-xs text-slate-400">No columns found for this mode in the data dictionary.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {insightModeColumns.map((column) => {
                        const selected = insightSelectedColumns.includes(column);
                        return (
                          <button
                            key={column}
                            type="button"
                            onClick={() => toggleInsightColumn(column)}
                            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                              selected
                                ? "border-blue-300 bg-blue-500/30 text-blue-100"
                                : "border-white/10 bg-[#0b1c2e] text-slate-300 hover:border-blue-400"
                            }`}
                          >
                            {column}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <p className="mt-3 text-xs text-slate-300">Selected columns: {insightSelectedColumns.length}</p>
                {insightSelectionError && (
                  <p className="mt-2 text-xs text-rose-300">{insightSelectionError}</p>
                )}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={applyInsightSelection}
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Apply Insights Selection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
