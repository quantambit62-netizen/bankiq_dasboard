import { useEffect, useRef, useState } from "react";
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from "recharts";

interface DynamicChartsProps {
  columnCharts: Record<string, any[]>;
  rows: any[];
}

export default function DynamicCharts({ columnCharts, rows }: DynamicChartsProps) {
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [maximizedColumn, setMaximizedColumn] = useState<string | null>(null);
  const [highlightedColumn, setHighlightedColumn] = useState<string | null>(null);
  const chartRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("selectedColumns") || "[]");
    setSelectedColumns(stored);
  }, []);

  useEffect(() => {
    const handler = () => {
      const updated = JSON.parse(localStorage.getItem("selectedColumns") || "[]");
      setSelectedColumns(updated);
    };

    window.addEventListener("selectedColumnsUpdated", handler);
    return () => window.removeEventListener("selectedColumnsUpdated", handler);
  }, []);

  useEffect(() => {
    const handler = () => {
      const activeColumn = localStorage.getItem("activeColumn");
      if (!activeColumn) return;

      setHighlightedColumn(activeColumn);

      window.setTimeout(() => {
        chartRefs.current[activeColumn]?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 120);

      window.setTimeout(() => {
        setHighlightedColumn((prev) => (prev === activeColumn ? null : prev));
      }, 1400);
    };

    window.addEventListener("activeColumnUpdated", handler);
    return () => window.removeEventListener("activeColumnUpdated", handler);
  }, []);

  const activeCols = selectedColumns.filter((col) => columnCharts[col]);

  function computeClusterAverages(sourceRows: any[], col: string) {
    const clusters = Array.from(
      new Set(sourceRows.map((r) => String(r?.Cluster ?? "").trim()).filter(Boolean))
    ).sort();

    return clusters.map((cluster) => {
      const values = sourceRows
        .filter((r) => String(r?.Cluster ?? "").trim() === cluster)
        .map((r) => Number(r?.[col]))
        .filter((v) => !Number.isNaN(v));

      const avg =
        values.length > 0
          ? values.reduce((sum, v) => sum + v, 0) / values.length
          : 0;

      return { name: `Cluster ${cluster}`, value: avg };
    });
  }


  const simpleClusterCols = [
    "avg_monthly_credit_amount",
    "avg_monthly_withdrawal_amount",
    "avg_monthly_net_flow",
    "monthly_net_flow_variance",
    "monthly_withdrawal_amount_variance",
    "monthly_credit_amount_variance",
    "avg_monthly_credit_count",
    "avg_monthly_withdrawal_count",
    "monthly_withdrawal_count_variance",
    "monthly_credit_count_variance",
    "monthly_atm_txn_count",
    "monthly_web_txn_count",
    "monthly_cash_txn_count",
    "monthly_weekday_txn_pct",
    "monthly_weekend_txn_pct",
  ];

  const renderChart = (col: string, isExpanded: boolean) => {
    const raw = columnCharts[col];
    if (!raw) return null;

    const chartData = raw.filter((d) => d?.name);
    const forceSimple = simpleClusterCols.includes(col);
    const width = isExpanded ? 980 : 450;
    const height = isExpanded ? 460 : forceSimple ? 300 : 350;

    if (forceSimple) {
      return (
        <BarChart
          width={width}
          height={height}
          barCategoryGap="70%"
          data={computeClusterAverages(rows, col)}
          margin={{ top: 20, left: 70, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="name"
            tick={{ fill: "#fff", fontSize: 10 }}
            stroke="#fff"
            label={{ value: col, position: "insideBottom", offset: -8, fill: "#cbd5e1", fontSize: 9 }}
          />
          <YAxis
            tick={{ fill: "#fff" }}
            stroke="#fff"
            tickMargin={10}
            tickFormatter={(value) => {
              if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
              if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
              return value;
            }}
          />
          <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #475569", color: "#fff" }} />
          <Bar dataKey="value" fill="#4ade80" />
        </BarChart>
      );
    }

    return (
      <BarChart width={width} height={height} data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis
          dataKey="name"
          angle={-30}
          textAnchor="end"
          interval={0}
          height={80}
          tick={{ fill: "#fff", fontSize: 10 }}
          stroke="#fff"
          label={{ value: col, position: "insideBottom", offset: -5, fill: "#cbd5e1", fontSize: 9 }}
        />
        <YAxis tick={{ fill: "#fff" }} stroke="#fff" />
        <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #475569", color: "#fff" }} />
        <Legend wrapperStyle={{ color: "#fff" }} />
        {Object.keys(chartData[0] || {})
          .filter((k) => k !== "name")
          .map((cluster, idx) => (
            <Bar
              key={idx}
              dataKey={cluster}
              fill={`hsl(${(idx * 60) % 360},70%,60%)`}
              name={`Cluster ${cluster}`}
            />
          ))}
      </BarChart>
    );
  };

  return (
    <div className="mt-10 grid grid-cols-2 gap-6">
      {activeCols.length === 0 && (
        <div className="col-span-2 rounded-xl border border-amber-400/30 bg-amber-900/20 p-4 text-sm text-amber-200">
          No dynamic bar charts available. Select one or more columns in the profiling modal.
        </div>
      )}
      {activeCols.map((col) => {
        const raw = columnCharts[col];
        if (!raw) return null;

        return (
          <div
            key={col}
            ref={(node) => {
              chartRefs.current[col] = node;
            }}
            id={`chart-${col}`}
            className={`bg-[#132030] p-6 rounded-xl border transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_0_20px_rgba(59,130,246,0.25)] ${
              highlightedColumn === col
                ? "border-cyan-300/80 ring-2 ring-cyan-300/35 shadow-[0_0_22px_rgba(34,211,238,0.28)]"
                : "border-white/10"
            }`}
          >
            <div className="mb-6 flex items-start justify-between gap-3">
              <h3 className="text-lg font-semibold leading-snug">
                {col} vs Cluster Distribution
              </h3>
              <button
                type="button"
                onClick={() => setMaximizedColumn(col)}
                className="inline-flex items-center gap-2 rounded-lg border border-blue-300/45 bg-[#0b1c2e]/75 px-2.5 py-1.5 text-[11px] font-semibold text-blue-100 transition hover:bg-blue-600/25"
              >
                <i className="fas fa-expand text-[11px]"></i>
                <span>Maximize</span>
              </button>
            </div>

            {renderChart(col, false)}
          </div>
        );
      })}

      {maximizedColumn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-6xl overflow-auto rounded-2xl border border-blue-400/35 bg-[#0b1523] shadow-2xl shadow-black/40">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <p className="text-sm font-semibold text-white">{maximizedColumn} vs Cluster Distribution</p>
              <button
                type="button"
                onClick={() => setMaximizedColumn(null)}
                className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-gray-200 transition hover:bg-white/10"
              >
                <i className="fas fa-times"></i>
                <span>Close</span>
              </button>
            </div>
            <div className="flex justify-center p-6">
              {renderChart(maximizedColumn, true)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
