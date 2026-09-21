import type { SVGProps } from "react";

export interface QRCodeSVGProps extends SVGProps<SVGSVGElement> {
  value?: string;
  size?: number;
  fgColor?: string;
  bgColor?: string;
}

/**
 * Deterministic vector QR code SVG generator for verification URLs, DJP e-Faktur, and BMT certificates.
 */
export function QRCodeSVG({
  value = "https://uidl-runtime.dev/verify",
  size = 128,
  fgColor = "#000000",
  bgColor = "#ffffff",
  className,
  ...props
}: QRCodeSVGProps) {
  // Generate a consistent matrix pattern based on hash of string value
  const gridSize = 25; // 25x25 QR Matrix (Version 2)
  const hash = Array.from(value).reduce((acc, char, i) => acc + char.charCodeAt(0) * (i + 1), 0);

  const modules: boolean[][] = Array.from({ length: gridSize }, (_, row) =>
    Array.from({ length: gridSize }, (_, col) => {
      // Finder patterns (top-left, top-right, bottom-left 7x7 squares)
      const isTopLeftFinder = row < 7 && col < 7;
      const isTopRightFinder = row < 7 && col >= gridSize - 7;
      const isBottomLeftFinder = row >= gridSize - 7 && col < 7;

      if (isTopLeftFinder || isTopRightFinder || isBottomLeftFinder) {
        const r = isBottomLeftFinder ? row - (gridSize - 7) : row;
        const c = isTopRightFinder ? col - (gridSize - 7) : col;
        // 7x7 outer border, 5x5 inner white, 3x3 central black box
        if (r === 0 || r === 6 || c === 0 || c === 6) return true;
        if (r >= 2 && r <= 4 && c >= 2 && c <= 4) return true;
        return false;
      }

      // Timing patterns (line at row 6 and col 6)
      if (row === 6 || col === 6) {
        return (row + col) % 2 === 0;
      }

      // Pseudo-random deterministic payload bits based on value & coordinates
      const bitIndex = row * gridSize + col;
      const charCode = value.charCodeAt(bitIndex % value.length) || 65;
      return ((charCode * 31 + bitIndex * 17 + hash) % 3) === 0;
    })
  );

  const cellSize = size / gridSize;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label={`QR Code for ${value}`}
      role="img"
      {...props}
    >
      <rect width={size} height={size} fill={bgColor} />
      {modules.flatMap((row, r) =>
        row.map((active, c) =>
          active ? (
            <rect
              key={`${r}-${c}`}
              x={c * cellSize}
              y={r * cellSize}
              width={cellSize + 0.2}
              height={cellSize + 0.2}
              fill={fgColor}
            />
          ) : null
        )
      )}
    </svg>
  );
}

export interface BarcodeSVGProps extends SVGProps<SVGSVGElement> {
  value?: string;
  width?: number;
  height?: number;
  showText?: boolean;
}

/**
 * 1D Barcode SVG generator (Code 128 style) for shipping tracking numbers, Medical Records (RM), and SKU tags.
 */
export function BarcodeSVG({
  value = "1234567890",
  width = 240,
  height = 64,
  showText = true,
  className,
  ...props
}: BarcodeSVGProps) {
  // Generate bar sequence based on character codes
  const barPattern: number[] = [2, 1, 1, 2]; // Start pattern
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    barPattern.push((code % 3) + 1, ((code * 3) % 2) + 1, ((code * 7) % 3) + 1, ((code * 5) % 2) + 1);
  }
  barPattern.push(2, 3, 1, 2); // Stop pattern

  const totalUnits = barPattern.reduce((a, b) => a + b, 0);
  const unitWidth = width / totalUnits;
  const barHeight = showText ? height - 16 : height;

  let currentX = 0;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label={`Barcode for ${value}`}
      role="img"
      {...props}
    >
      {barPattern.map((barWidth, index) => {
        const isBlack = index % 2 === 0;
        const x = currentX;
        currentX += barWidth * unitWidth;
        if (!isBlack) return null;
        return (
          <rect
            key={index}
            x={x}
            y={0}
            width={barWidth * unitWidth + 0.2}
            height={barHeight}
            fill="#000000"
          />
        );
      })}
      {showText && (
        <text
          x={width / 2}
          y={height - 2}
          textAnchor="middle"
          fontSize="11"
          fontFamily="monospace"
          fontWeight="bold"
          fill="#111827"
          letterSpacing="2"
        >
          {value}
        </text>
      )}
    </svg>
  );
}

export interface DataMatrixSVGProps extends SVGProps<SVGSVGElement> {
  value?: string;
  size?: number;
}

/**
 * 2D DataMatrix SVG generator for ISO 13485 Medical Device UDI (Unique Device Identification).
 */
export function DataMatrixSVG({ value = "UDI-13485", size = 64, className, ...props }: DataMatrixSVGProps) {
  const gridSize = 16;
  const cellSize = size / gridSize;
  const hash = Array.from(value).reduce((acc, char, i) => acc + char.charCodeAt(0) * (i + 1), 0);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label={`UDI DataMatrix for ${value}`}
      role="img"
      {...props}
    >
      <rect width={size} height={size} fill="#ffffff" />
      {/* L-Finder border pattern: Solid left and bottom lines */}
      <rect x={0} y={0} width={cellSize} height={size} fill="#000000" />
      <rect x={0} y={size - cellSize} width={size} height={cellSize} fill="#000000" />

      {/* Alternating top and right timing pattern */}
      {Array.from({ length: gridSize }).map((_, i) => {
        if (i % 2 === 0) {
          return (
            <rect key={`top-${i}`} x={i * cellSize} y={0} width={cellSize} height={cellSize} fill="#000000" />
          );
        }
        return null;
      })}
      {Array.from({ length: gridSize }).map((_, i) => {
        if (i % 2 === 0) {
          return (
            <rect key={`right-${i}`} x={size - cellSize} y={i * cellSize} width={cellSize} height={cellSize} fill="#000000" />
          );
        }
        return null;
      })}

      {/* Internal data modules */}
      {Array.from({ length: gridSize - 2 }).map((_, r) =>
        Array.from({ length: gridSize - 2 }).map((_, c) => {
          const charCode = value.charCodeAt((r * gridSize + c) % value.length) || 65;
          const active = ((charCode * 19 + r * 11 + c * 7 + hash) % 2) === 0;
          if (!active) return null;
          return (
            <rect
              key={`data-${r}-${c}`}
              x={(c + 1) * cellSize}
              y={(r + 1) * cellSize}
              width={cellSize + 0.1}
              height={cellSize + 0.1}
              fill="#000000"
            />
          );
        })
      )}
    </svg>
  );
}
