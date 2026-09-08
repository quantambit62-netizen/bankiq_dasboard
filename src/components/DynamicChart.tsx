import { useEffect, useState } from "react";
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
}

export default function DynamicCharts({ columnCharts }: DynamicChartsProps) {
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);

  // Load on first render
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("selectedColumns") || "[]");
    setSelectedColumns(stored);
  }, []);

  // Listen for updates from left panel
  useEffect(() => {
    const handler = () => {
      const updated = JSON.parse(localStorage.getItem("selectedColumns") || "[]");
      setSelectedColumns(updated);
    };

    window.addEventListener("selectedColumnsUpdated", handler);
    return () => window.removeEventListener("selectedColumnsUpdated", handler);
  }, []);

  // Columns that have chart data available
  const activeCols = selectedColumns.filter((col) => columnCharts[col]);

  // Simple cluster columns
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

  return (
    <div className="mt-10 grid grid-cols-2 gap-6">
      {activeCols.map((col) => {
        const raw = columnCharts[col];
        if (!raw) return null;

        const chartData = raw.filter((d) => d?.name);

        const forceSimple = simpleClusterCols.includes(col);

        return (
          <div
            key={col}
            className="bg-[#132030] p-6 rounded-xl border border-white/10"
          >
            <h3 className="text-xl font-semibold mb-6">
              {col} vs Cluster Distribution
            </h3>

            {/* SIMPLE CHART */}
            {forceSimple ? (
              <BarChart
                width={450}
                height={300}
                data={[
                  { name: "Cluster 0", value: chartData.reduce((a, d) => a + (d["0"] || 0), 0) },
                  { name: "Cluster 1", value: chartData.reduce((a, d) => a + (d["1"] || 0), 0) },
                  { name: "Cluster 2", value: chartData.reduce((a, d) => a + (d["2"] || 0), 0) },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#4ade80" />
              </BarChart>
            ) : (
              <BarChart width={450} height={350} data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  angle={-30}
                  textAnchor="end"
                  interval={0}
                  height={80}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                {Object.keys(chartData[0])
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
            )}
          </div>
        );
      })}
    </div>
  );
}
