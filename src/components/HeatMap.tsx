import React, { useEffect, useState } from "react";

// 🎨 Color scale
function interpolateBlue(val: number, min: number, max: number) {
  const ratio = max === min ? 0.5 : (val - min) / (max - min);

  const start = { r: 198, g: 219, b: 239 };
  const end = { r: 8, g: 48, b: 107 };

  const r = Math.round(start.r + ratio * (end.r - start.r));
  const g = Math.round(start.g + ratio * (end.g - start.g));
  const b = Math.round(start.b + ratio * (end.b - start.b));

  return `rgb(${r},${g},${b})`;
}

// 📊 Scaling
function minMaxScale(values: number[]) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return values.map(() => 0.5);
  return values.map((v) => (v - min) / (max - min));
}

function scaleNumericFeatures(data: any[], numericCols: string[]) {
  const scaled = data.map((row) => ({ ...row }));
  numericCols.forEach((col) => {
    const values = data.map((r) => Number(r[col]) || 0);
    const scaledValues = minMaxScale(values);
    scaled.forEach((row, i) => {
      row[col] = scaledValues[i];
    });
  });
  return scaled;
}

// 📊 Cluster means
function computeClusterMeans(
  data: any[],
  clusterCol: string,
  numericCols: string[]
) {
  const clusters: Record<string, any[]> = {};

  data.forEach((row) => {
    let cluster = row[clusterCol];
    if (cluster === undefined || cluster === null) return;
    cluster = String(cluster).trim();
    if (!clusters[cluster]) clusters[cluster] = [];
    clusters[cluster].push(row);
  });

  const summary: Record<string, Record<string, number>> = {};

  Object.entries(clusters).forEach(([cluster, rows]) => {
    const means: Record<string, number> = {};
    numericCols.forEach((col) => {
      const nums = rows.map((r) => Number(r[col]) || 0);
      const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
      means[col] = mean;
    });
    summary[cluster] = means;
  });

  return summary;
}

// 📊 Build matrix
function buildHeatmapMatrix(
  clusterSummary: Record<string, Record<string, number>>,
  numericCols: string[]
) {
  const clusters = Object.keys(clusterSummary);
  const matrix: any[] = [];

  clusters.forEach((cluster) => {
    numericCols.forEach((feature) => {
      matrix.push({
        cluster: `Cluster ${cluster}`,
        feature,
        value: clusterSummary[cluster][feature] ?? 0,
      });
    });
  });

  return matrix;
}

// 🔥 MAIN COMPONENT
type Props = {
  data: any[];
  numericColumns: string[];
  clusterColumn: string;
  isExpanded?: boolean;
};

const Heatmap: React.FC<Props> = ({
  data,
  numericColumns,
  clusterColumn,
  isExpanded = false,
}) => {
  const [animate, setAnimate] = useState(false);
  const [hoveredCellIndex, setHoveredCellIndex] = useState<number | null>(null);

  useEffect(() => {
    setTimeout(() => setAnimate(true), 50);
  }, []);

  if (!Array.isArray(data)) {
    return <div>Invalid data</div>;
  }

  const scaledData = scaleNumericFeatures(data, numericColumns);
  const clusterSummary = computeClusterMeans(
    scaledData,
    clusterColumn,
    numericColumns
  );
  const matrix = buildHeatmapMatrix(clusterSummary, numericColumns);

  const clusters = [...new Set(matrix.map((d) => d.cluster))];
  const features = numericColumns;
  const featureAliases = features.map((feature, index) => ({
    full: feature,
    short: `F${index + 1}`,
  }));

  // 📐 Layout
  const cellSize = isExpanded ? 70 : 50;
  const paddingLeft = 160;
  const paddingTop = isExpanded ? 50 : 34;
  const xAxisFontSize = isExpanded ? 13 : 11;
  const yAxisFontSize = isExpanded ? 12 : 10;
  const legendHeaderFontSize = isExpanded ? 14 : 12;
  const legendTextFontSize = isExpanded ? 12 : 11;
  const scaleLabelFontSize = isExpanded ? 12 : 10;
  const scaleValueFontSize = isExpanded ? 11 : 10;
  const heatmapWidth = features.length * cellSize;
  const colorScaleWidth = heatmapWidth;
  const colorScaleHeight = isExpanded ? 16 : 12;
  const colorScaleX = paddingLeft;
  const colorScaleY = paddingTop + clusters.length * cellSize + (isExpanded ? 24 : 16);
  const legendColumnWidth = isExpanded ? 300 : 220;
  const legendColumns = Math.max(1, Math.floor(heatmapWidth / legendColumnWidth));
  const legendRows = Math.ceil(featureAliases.length / legendColumns);
  const legendLineHeight = isExpanded ? 22 : 18;
  const legendStartY = colorScaleY + colorScaleHeight + (isExpanded ? 36 : 28);
  const legendHeight = (isExpanded ? 44 : 36) + legendRows * legendLineHeight;

  const width = paddingLeft + features.length * cellSize + 100;
  const height = legendStartY + legendHeight;

  const values = matrix.map((d) => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);

  return (
    <div style={{ overflowX: "auto" }}>
      <svg
        width={width}
        height={height}
        style={{ background: "#0d1117" }}
      >
        {/* 🔵 Heatmap Cells FIRST */}
        {matrix.map((cell, index) => {
          const x = features.indexOf(cell.feature);
          const y = clusters.indexOf(cell.cluster);
          const color = interpolateBlue(cell.value, minValue, maxValue);
          const isHovered = hoveredCellIndex === index;
          const hasHover = hoveredCellIndex !== null;

          return (
            <g key={index}>
              <rect
                x={paddingLeft + x * cellSize}
                y={paddingTop + y * cellSize}
                width={cellSize}
                height={cellSize}
                fill={color}
                stroke={isHovered ? "#93c5fd" : "#1f2937"}
                strokeWidth={isHovered ? 2 : 1}
                rx={4}
                opacity={animate ? (hasHover && !isHovered ? 0.65 : 1) : 0}
                style={{ transition: "opacity 0.2s, stroke 0.2s, stroke-width 0.2s", cursor: "pointer" }}
                onMouseEnter={() => setHoveredCellIndex(index)}
                onMouseLeave={() => setHoveredCellIndex(null)}
              />
              <title>{`${cell.cluster} | ${featureAliases[x]?.short ?? ""} (${cell.feature}): ${cell.value.toFixed(3)}`}</title>
            </g>
          );
        })}

        {/* 🔤 X-axis Labels */}
        {featureAliases.map((feature, i) => {
          const x = paddingLeft + i * cellSize + cellSize / 2;
          const y = paddingTop - (isExpanded ? 16 : 10);

          return (
            <text
              key={feature.full}
              x={x}
              y={y}
              textAnchor="middle"
              fill="#d0d7de"
              fontSize={xAxisFontSize}
              fontWeight="600"
            >
              {feature.short}
              <title>{`${feature.short}: ${feature.full}`}</title>
            </text>
          );
        })}

        {/* 🔤 Y-axis Labels */}
        {clusters.map((cluster, i) => (
          <text
            key={cluster}
            x={paddingLeft - 10}
            y={paddingTop + i * cellSize + cellSize / 2}
            textAnchor="end"
            dominantBaseline="middle"
            fill="#d0d7de"
            fontSize={yAxisFontSize}
          >
            {cluster}
          </text>
        ))}

        {/* 🎨 Horizontal color scale */}
        <defs>
          <linearGradient id="heatmapColorScale" x1="0" y1="0" x2="1" y2="0">
            <stop
              offset="0%"
              stopColor={interpolateBlue(minValue, minValue, maxValue)}
            />
            <stop
              offset="100%"
              stopColor={interpolateBlue(maxValue, minValue, maxValue)}
            />
          </linearGradient>
        </defs>

        <rect
          x={colorScaleX}
          y={colorScaleY}
          width={colorScaleWidth}
          height={colorScaleHeight}
          fill="url(#heatmapColorScale)"
          stroke="#334155"
          rx={6}
        />

        <text
          x={colorScaleX}
          y={colorScaleY - (isExpanded ? 10 : 6)}
          fill="#d0d7de"
          fontSize={scaleLabelFontSize}
          fontWeight="600"
        >
          Low
        </text>
        <text
          x={colorScaleX + colorScaleWidth}
          y={colorScaleY - (isExpanded ? 10 : 6)}
          textAnchor="end"
          fill="#d0d7de"
          fontSize={scaleLabelFontSize}
          fontWeight="600"
        >
          High
        </text>
        <text
          x={colorScaleX}
          y={colorScaleY + colorScaleHeight + (isExpanded ? 18 : 14)}
          fill="#94a3b8"
          fontSize={scaleValueFontSize}
        >
          {minValue.toFixed(2)}
        </text>
        <text
          x={colorScaleX + colorScaleWidth}
          y={colorScaleY + colorScaleHeight + (isExpanded ? 18 : 14)}
          textAnchor="end"
          fill="#94a3b8"
          fontSize={scaleValueFontSize}
        >
          {maxValue.toFixed(2)}
        </text>

        {/* 🔤 Alias mapping legend */}
        <text
          x={paddingLeft}
          y={legendStartY}
          fill="#93c5fd"
          fontSize={legendHeaderFontSize}
          fontWeight="600"
        >
          Feature Legend
        </text>
        {featureAliases.map((feature, index) => {
          const col = Math.floor(index / legendRows);
          const row = index % legendRows;
          const x = paddingLeft + col * legendColumnWidth;
          const y = legendStartY + 20 + row * legendLineHeight;

          return (
            <text
              key={`legend-${feature.short}`}
              x={x}
              y={y}
              fill="#d0d7de"
              fontSize={legendTextFontSize}
            >
              <tspan fill="#7dd3fc" fontWeight="600">{feature.short}</tspan>
              <tspan>{`: ${feature.full}`}</tspan>
            </text>
          );
        })}
      </svg>
    </div>
  );
};

export default Heatmap;