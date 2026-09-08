//import React from "react";

/**
 * Simple heatmap placeholder using CSS grid.
 * Expects `matrix` as number[][] where matrix[row][col] is value.
 */
export default function HeatmapComp({ matrix }: { matrix?: number[][] }) {
  if (!matrix || !matrix.length) return <div className="text-sm text-gray-400">No data</div>;

  //const rows = matrix.length;
  const cols = matrix[0].length;
  const flat = matrix.flat();
  const max = Math.max(...flat);
  const min = Math.min(...flat);

  const color = (v: number) => {
    const t = (v - min) / (max - min || 1);
    // interpolate between dark-blue and bright-blue
    const r = Math.round(14 + (59 - 14) * t);
    const g = Math.round(26 + (130 - 26) * t);
    const b = Math.round(48 + (246 - 48) * t);
    return `rgb(${r},${g},${b})`;
  };

  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {matrix.map((row, i) =>
        row.map((val, j) => (
          <div
            key={`${i}-${j}`}
            className="h-8 rounded-sm"
            title={`${val}`}
            style={{ backgroundColor: color(val) }}
          />
        ))
      )}
    </div>
  );
}
