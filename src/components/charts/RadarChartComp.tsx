//import React from "react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";

export default function RadarChartComp({ data }: { data: any[] }) {
  if (!data || data.length === 0) return <div className="text-sm text-gray-400">No data</div>;
  // expects [{subject: 'A', value: 120}, ...]
  return (
    <div style={{ width: "100%", height: 300 }}>
      <ResponsiveContainer>
        <RadarChart data={data}>
          <PolarGrid stroke="#1f2937" />
          <PolarAngleAxis dataKey="subject" stroke="#9CA3AF" />
          <PolarRadiusAxis angle={30} stroke="#9CA3AF" />
          <Radar name="Series" dataKey="value" stroke="#7C3AED" fill="#7C3AED" fillOpacity={0.6} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
