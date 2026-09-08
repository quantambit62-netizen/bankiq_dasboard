//import React from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function LineChartComp({ data }: { data: any[] }) {
  if (!data || data.length === 0) return <div className="text-sm text-gray-400">No data</div>;
  return (
    <div style={{ width: "100%", height: 300 }}>
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid stroke="#1f2937" />
          <XAxis dataKey="x" stroke="#9CA3AF" />
          <YAxis stroke="#9CA3AF" />
          <Tooltip />
          <Line type="monotone" dataKey="y" stroke="#60A5FA" strokeWidth={2} dot={{ r: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
