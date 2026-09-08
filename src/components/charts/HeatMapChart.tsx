// src/components/HeatMapChart.tsx
import React from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

type HeatMapChartProps = {
  data: { x: string; y: string; value: number }[];
  xKey: "x";
  yKey: "y";
  valueKey: "value";
  colorRange: [string, string];
};

const HeatMapChart: React.FC<HeatMapChartProps> = ({
  data,
  xKey,
  yKey,
  valueKey,
  colorRange,
}) => {
  // find min/max for scaling
  const values = data.map((d) => d[valueKey]);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);

  // interpolate color between two hex values
  const interpolateColor = (val: number) => {
    const ratio =
      maxValue === minValue ? 0.5 : (val - minValue) / (maxValue - minValue);

    const hexToRgb = (hex: string) => {
      const bigint = parseInt(hex.replace("#", ""), 16);
      return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255,
      };
    };

    const start = hexToRgb(colorRange[0]);
    const end = hexToRgb(colorRange[1]);

    const r = Math.round(start.r + ratio * (end.r - start.r));
    const g = Math.round(start.g + ratio * (end.g - start.g));
    const b = Math.round(start.b + ratio * (end.b - start.b));

    return `rgb(${r},${g},${b})`;
  };

  return (
    <ResponsiveContainer width="100%" height={350}>
      <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        <CartesianGrid />
        <XAxis type="category" dataKey={xKey} tick={{ fill: "#fff" }} />
        <YAxis type="category" dataKey={yKey} tick={{ fill: "#fff" }} />
        <ZAxis type="number" dataKey={valueKey} range={[100, 400]} />
        <Tooltip
  formatter={(val: any) => {
    const num = Number(val);
    return isNaN(num) ? val : num.toFixed(2);
  }}
/>

        <Scatter
          data={data}
          shape={(props: { cx?: number; cy?: number; payload?: { x: string; y: string; value: number } }) => {
            const { cx, cy, payload } = props;
            const val = payload?.[valueKey] ?? 0;
            const color = interpolateColor(val);
            return (
              <circle
                cx={cx ?? 0}
                cy={cy ?? 0}
                r={15}
                fill={color}
                stroke="#333"
                strokeWidth={1}
              />
            );
          }}
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
};

export default HeatMapChart;
