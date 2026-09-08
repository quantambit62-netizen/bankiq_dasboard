//import React from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function BarChartComp({ data }: { data: any[] }) {
  if (!data || data.length === 0) return <div className="text-sm text-gray-400">No data</div>;
  return (
    <div style={{ width: "100%", height: 300 }}>
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid stroke="#1f2937" />
          <XAxis dataKey="x" stroke="#9CA3AF" />
          <YAxis stroke="#9CA3AF" />
          <Tooltip />
          <Bar dataKey="y" fill="#3B82F6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
