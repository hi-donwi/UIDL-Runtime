/*
 * The Meridian chart family.
 *
 * Source: {BarChart,LineChart,DonutChart}.
 * These are hand-rolled SVGs, not a charting library — which is exactly why they have to
 * be ported rather than approximated: every visual trait people recognise as "the Meridian
 * look" is a specific number in there (bars 28 units wide with a 17-unit corner radius on
 * a 500-unit-tall viewBox, four horizontal grid divisions and no vertical ones, no axis
 * lines, y labels prefix-formatted to "12 M", a gradient fade under each line).
 *
 * Prop defaults below are Meridian's prop defaults, kept even where they look arbitrary.
 * The one intentional divergence: `skipXLabel` defaults to 1 (label every point) instead
 * of 2, because Meridian's dashboards pass 12 monthly points where our demo series are short
 * enough that dropping every other label just loses information.
 */

import { useMemo } from "react";
import { prefixFormat } from "../utils/chart";

export interface ChartGeometryProps {
  /** One array per series; each inner array is that series' y values. */
  points: number[][];
  xLabels?: string[];
  colors?: string[];
  viewBoxHeight?: number;
  aspectRatio?: number;
  axisPadding?: number;
  pointsPadding?: number;
  xLabelOffset?: number;
  yLabelOffset?: number;
  yLabelDivisions?: number;
  gridColor?: string;
  fontColor?: string;
  fontSize?: number;
  gridThickness?: number;
  left?: number;
  bottom?: number;
  extendGridX?: number;
  yMin?: number | null;
  yMax?: number | null;
  formatY?: (value: number) => string;
  formatX?: (value: string) => string;
  drawXGrid?: boolean;
  drawLabels?: boolean;
}

/**
 * The scale/grid math shared by BarChart and LineChart — identical in both, down
 * to `hMin`/`hMax` being clamped through zero so a zero line always has a place to sit.
 */
function useChartScale({
  points,
  viewBoxHeight,
  aspectRatio,
  axisPadding,
  pointsPadding,
  left,
  bottom,
  yLabelDivisions,
  extendGridX,
  yMin,
  yMax,
}: Required<
  Pick<
    ChartGeometryProps,
    | "points"
    | "viewBoxHeight"
    | "aspectRatio"
    | "axisPadding"
    | "pointsPadding"
    | "left"
    | "bottom"
    | "yLabelDivisions"
    | "extendGridX"
  >
> & { yMin: number | null; yMax: number | null }) {
  return useMemo(() => {
    const viewBoxWidth = aspectRatio * viewBoxHeight;
    const padding = axisPadding + pointsPadding;
    const flat = points.flat();
    const min = flat.length ? Math.min(...flat) : 0;
    const max = flat.length ? Math.max(...flat) : 0;
    const hMin = Math.min(yMin ?? min, 0);
    let hMax = Math.max(yMax ?? max, 0);
    if (hMax === hMin) {
      hMax = hMax + 1000;
    }

    const count = Math.max(...points.map((series) => series.length), 0);
    const xs = Array.from({ length: count }, (_, i) =>
      padding + left + (i * (viewBoxWidth - left - 2 * padding)) / (count - 1 || 1),
    );

    const getViewBoxY = (value: number) => {
      let percent = 1 - (value - hMin) / (hMax - hMin);
      if (!Number.isFinite(percent)) {
        percent = 0;
      }
      return padding + percent * (viewBoxHeight - 2 * padding - bottom);
    };

    const ys = points.map((series) => series.map(getViewBoxY));
    const xy = xs.map((x, i) => [x, ys.map((series) => series[i])] as [number, number[]]);
    const zeroY = getViewBoxY(0);

    const yScalerLocation = (i: number) =>
      ((yLabelDivisions - i) * (viewBoxHeight - padding * 2 - bottom)) / yLabelDivisions + padding;
    const yScalerValue = (i: number) => (i * (hMax - hMin)) / yLabelDivisions + hMin;

    const l = padding + left;
    const r = viewBoxWidth - padding;
    const gridLeft = l + extendGridX;
    const gridRight = r - extendGridX;
    const xGrid = Array.from({ length: yLabelDivisions + 1 }, (_, i) => yScalerLocation(i))
      .map((y) => `M ${gridLeft} ${y} H ${gridRight}`)
      .join(" ");

    return { viewBoxWidth, padding, count, xs, ys, xy, zeroY, yScalerLocation, yScalerValue, xGrid, gridLeft, gridRight };
  }, [points, viewBoxHeight, aspectRatio, axisPadding, pointsPadding, left, bottom, yLabelDivisions, extendGridX, yMin, yMax]);
}

export interface BarChartProps extends ChartGeometryProps {
  className?: string;
  /** Bar width in viewBox units (Meridian: 28). */
  barWidth?: number;
  /** Corner radius in viewBox units (Meridian: 17 — bars are visibly pill-capped). */
  radius?: number;
  skipXLabel?: number;
  drawZeroLine?: boolean;
  zeroLineColor?: string;
  ariaLabel?: string;
}

export function MeridianBarChart({
  points,
  xLabels = [],
  colors = [],
  className,
  viewBoxHeight = 500,
  aspectRatio = 2.1,
  axisPadding = 30,
  pointsPadding = 40,
  xLabelOffset = 20,
  yLabelOffset = 0,
  yLabelDivisions = 4,
  gridColor = "rgba(0, 0, 0, 0.2)",
  zeroLineColor = "rgba(0, 0, 0, 0.2)",
  fontColor = "#415668",
  fontSize = 22,
  gridThickness = 0.5,
  left = 65,
  bottom = 0,
  extendGridX = -20,
  barWidth = 28,
  radius = 17,
  skipXLabel = 1,
  yMin = null,
  yMax = null,
  formatY = prefixFormat,
  formatX = (value) => value,
  drawXGrid = true,
  drawLabels = true,
  drawZeroLine = true,
  ariaLabel,
}: BarChartProps) {
  const scale = useChartScale({
    points,
    viewBoxHeight,
    aspectRatio,
    axisPadding,
    pointsPadding,
    left,
    bottom,
    yLabelDivisions,
    extendGridX,
    yMin,
    yMax,
  });

  const seriesCount = points.length;
  const rects = scale.xy.flatMap(([x, seriesYs], xi) =>
    seriesYs.map((y, si) => {
      const isPositive = y <= scale.zeroY;
      return {
        key: `${xi}-${si}`,
        x: x - (barWidth * seriesCount) / 2 + si * barWidth,
        y: isPositive ? y : scale.zeroY - radius,
        // The +radius overshoot is clipped away by the positive/negative clip paths below;
        // that is how Meridian gets rounded caps on the outer end of a bar but a flat foot at
        // the zero line.
        height: Math.abs(y - scale.zeroY) + radius,
        color: colors[si] ?? "#33A1FF",
        isPositive,
      };
    }),
  );

  const clipId = `meridian-bar-clip-${seriesCount}-${scale.count}`;

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 ${scale.viewBoxWidth} ${viewBoxHeight}`}
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={ariaLabel ?? "bar chart"}
      >
        {drawXGrid && (
          <path d={scale.xGrid} stroke={gridColor} strokeWidth={gridThickness} strokeLinecap="round" fill="transparent" />
        )}
        {drawZeroLine && (
          <path
            d={`M ${scale.gridLeft} ${scale.zeroY} H ${scale.gridRight}`}
            stroke={zeroLineColor}
            strokeWidth={gridThickness}
            strokeLinecap="round"
            fill="transparent"
          />
        )}

        {drawLabels &&
          xLabels.length > 0 &&
          scale.xs.map((x, i) => (
            <text
              key={`x-${i}`}
              style={{ fontSize, fill: fontColor }}
              y={viewBoxHeight - axisPadding + yLabelOffset + fontSize / 2 - bottom}
              x={x}
              textAnchor="middle"
            >
              {i % skipXLabel === 0 ? formatX(xLabels[i] ?? "") : ""}
            </text>
          ))}

        {drawLabels &&
          yLabelDivisions > 0 &&
          Array.from({ length: yLabelDivisions + 1 }, (_, i) => (
            <text
              key={`y-${i}`}
              style={{ fontSize, fill: fontColor }}
              y={scale.yScalerLocation(i)}
              x={axisPadding - xLabelOffset + left}
              textAnchor="end"
            >
              {formatY(scale.yScalerValue(i))}
            </text>
          ))}

        <defs>
          <clipPath id={`${clipId}-pos`}>
            <rect x="0" y="0" width={scale.viewBoxWidth} height={scale.zeroY} />
          </clipPath>
          <clipPath id={`${clipId}-neg`}>
            <rect x="0" y={scale.zeroY} width={scale.viewBoxWidth} height={viewBoxHeight - scale.zeroY} />
          </clipPath>
        </defs>

        {rects.map((rect) => (
          <rect
            key={rect.key}
            rx={radius}
            ry={radius}
            x={rect.x}
            y={rect.y}
            width={barWidth}
            height={rect.height}
            fill={rect.color}
            clipPath={`url(#${clipId}-${rect.isPositive ? "pos" : "neg"})`}
          />
        ))}
      </svg>
    </div>
  );
}

export interface LineChartProps extends ChartGeometryProps {
  className?: string;
  /** Stroke width in viewBox units (Meridian: 5). */
  thickness?: number;
  ariaLabel?: string;
}

export function MeridianLineChart({
  points,
  xLabels = [],
  colors = [],
  className,
  viewBoxHeight = 500,
  aspectRatio = 4,
  axisPadding = 30,
  pointsPadding = 24,
  xLabelOffset = 20,
  yLabelOffset = 5,
  yLabelDivisions = 4,
  gridColor = "rgba(0, 0, 0, 0.2)",
  fontColor = "#415668",
  fontSize = 20,
  gridThickness = 0.5,
  thickness = 5,
  left = 55,
  bottom = 0,
  extendGridX = -20,
  yMin = null,
  yMax = null,
  formatY = prefixFormat,
  formatX = (value) => value,
  drawXGrid = true,
  drawLabels = true,
  ariaLabel,
}: LineChartProps) {
  const scale = useChartScale({
    points,
    viewBoxHeight,
    aspectRatio,
    axisPadding,
    pointsPadding,
    left,
    bottom,
    yLabelDivisions,
    extendGridX,
    yMin,
    yMax,
  });

  const gradientId = `meridian-line-grad-${points.length}-${scale.count}`;
  const baseY = viewBoxHeight - scale.padding - bottom;

  const line = (i: number) =>
    scale.xy.map(([x, ys], index) => `${index === 0 ? "M" : "L"} ${x} ${ys[i]} `).join("");
  const gradientLine = (i: number) =>
    `M ${scale.padding + left} ${baseY}` +
    scale.xy.map(([x, ys]) => `L ${x} ${ys[i]} `).join("") +
    ` V ${baseY} Z`;

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 ${scale.viewBoxWidth} ${viewBoxHeight}`}
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={ariaLabel ?? "line chart"}
      >
        {drawXGrid && (
          <path d={scale.xGrid} stroke={gridColor} strokeWidth={gridThickness} strokeLinecap="round" fill="transparent" />
        )}

        {drawLabels &&
          xLabels.length > 0 &&
          scale.xs.map((x, i) => (
            <text
              key={`x-${i}`}
              style={{ fontSize, fill: fontColor }}
              y={viewBoxHeight - axisPadding + yLabelOffset + fontSize / 2 - bottom}
              x={x}
              textAnchor="middle"
            >
              {formatX(xLabels[i] ?? "")}
            </text>
          ))}

        {drawLabels &&
          yLabelDivisions > 0 &&
          Array.from({ length: yLabelDivisions + 1 }, (_, i) => (
            <text
              key={`y-${i}`}
              style={{ fontSize, fill: fontColor }}
              y={scale.yScalerLocation(i)}
              x={axisPadding - xLabelOffset + left}
              textAnchor="end"
            >
              {formatY(scale.yScalerValue(i))}
            </text>
          ))}

        <defs>
          {/* The white-to-transparent wash Meridian lays under every line. */}
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="85%">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.5)" />
            <stop offset="40%" stopColor="rgba(255, 255, 255, 0.1)" />
            <stop offset="70%" stopColor="rgba(255, 255, 255, 0)" />
          </linearGradient>
          {points.map((_, i) => (
            <mask key={`mask-${i}`} id={`${gradientId}-mask-${i}`}>
              <rect
                x="0"
                y={scale.ys[i]?.length ? Math.min(...scale.ys[i]) : 0}
                height={viewBoxHeight - (scale.ys[i]?.length ? Math.min(...scale.ys[i]) : 0)}
                width="100%"
                fill={`url('#${gradientId}')`}
              />
            </mask>
          ))}
        </defs>

        {points.map((_, i) => (
          <g key={`series-${i}`}>
            <path
              strokeLinejoin="round"
              d={gradientLine(i)}
              strokeWidth={thickness}
              strokeLinecap="round"
              fill={colors[i] ?? "#33A1FF"}
              mask={`url('#${gradientId}-mask-${i}')`}
            />
            <path
              strokeLinejoin="round"
              d={line(i)}
              stroke={colors[i] ?? "#33A1FF"}
              strokeWidth={thickness}
              strokeLinecap="round"
              fill="transparent"
            />
          </g>
        ))}
      </svg>
    </div>
  );
}

export interface DonutSector {
  color: string;
  value: number;
  label?: string;
}

export interface DonutChartProps {
  sectors: DonutSector[];
  className?: string;
  totalLabel?: string;
  radius?: number;
  startAngle?: number;
  thickness?: number;
  offsetX?: number;
  offsetY?: number;
  textOffsetX?: number;
  textOffsetY?: number;
  valueFormatter?: (value: number) => string;
  ariaLabel?: string;
}

/** Meridian's DonutChart: a 100×100 viewBox, arcs stroked onto a clipped hole. */
export function MeridianDonutChart({
  sectors,
  className,
  totalLabel = "Total",
  radius = 36,
  startAngle = Math.PI,
  thickness = 10,
  offsetX = 0,
  offsetY = 0,
  textOffsetX = 0,
  textOffsetY = 0,
  valueFormatter = (value) => value.toString(),
  ariaLabel,
}: DonutChartProps) {
  const cx = 50 + offsetX;
  const cy = 50 + offsetY;
  const total = sectors.reduce((sum, sector) => sum + Math.max(sector.value, 0), 0);
  const hasValues = total > 0;
  const clipId = `meridian-donut-hole-${sectors.length}`;

  const arcs: Array<{ d: string; color: string; key: number }> = [];
  if (hasValues && sectors.length > 1) {
    let start = startAngle;
    sectors.forEach((sector, i) => {
      const theta = (2 * Math.PI * Math.max(sector.value, 0)) / total;
      if (theta > 0) {
        arcs.push({ key: i, color: sector.color, d: arcPath(cx, cy, radius, start, theta) });
      }
      start += theta;
    });
  }

  return (
    <div className={className}>
      <svg viewBox="0 0 100 100" version="1.1" role="img" aria-label={ariaLabel ?? "donut chart"}>
        <defs>
          <clipPath id={clipId}>
            <circle cx={cx} cy={cy} r={radius + thickness / 2} fill="black" strokeWidth="0" />
          </clipPath>
        </defs>

        {(!hasValues || sectors.length <= 1) && (
          <circle
            clipPath={`url(#${clipId})`}
            cx={cx}
            cy={cy}
            r={radius}
            strokeWidth={thickness}
            stroke={hasValues ? sectors[0]?.color ?? "#f4f4f6" : "#f4f4f6"}
            fill="transparent"
          />
        )}

        {arcs.map((arc) => (
          <path
            key={arc.key}
            clipPath={`url(#${clipId})`}
            d={arc.d}
            stroke={arc.color}
            strokeWidth={thickness}
            fill="transparent"
          />
        ))}

        <text x={cx + textOffsetX} y={cy + textOffsetY} textAnchor="middle" style={{ fontSize: 7, fill: "#7c7c7c" }}>
          {totalLabel}
        </text>
        <text
          x={cx + textOffsetX}
          y={cy + textOffsetY + 9}
          textAnchor="middle"
          style={{ fontSize: 8, fontWeight: 600, fill: "#1e293b" }}
        >
          {valueFormatter(total)}
        </text>
      </svg>
    </div>
  );
}

/** Meridian's getArcPath — an arc of `theta` radians starting at `start`, drawn clockwise. */
function arcPath(cx: number, cy: number, r: number, start: number, theta: number): string {
  const end = start + theta;
  const x1 = cx + r * Math.cos(start);
  const y1 = cy + r * Math.sin(start);
  const x2 = cx + r * Math.cos(end);
  const y2 = cy + r * Math.sin(end);
  const largeArc = theta > Math.PI ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}

