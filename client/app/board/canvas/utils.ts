// app/board/canvas/utils.ts
import type { BoardElement } from "@/lib/api/board.api";
import {
  C,
  DEFAULT_CHART_DATA,
  DEFAULT_HEIGHT,
  DEFAULT_WIDTH,
  NOTE_COLORS,
} from "./constants";
import type { ChartDatum, ChartType, ColorTarget, Point } from "./types";

/* ------------------------------------------------------------------ */
/* Primitive readers                                                   */
/* ------------------------------------------------------------------ */
export const getString = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

export const getNumber = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

/* ------------------------------------------------------------------ */
/* Content readers (work with the flat `data` object)                  */
/* ------------------------------------------------------------------ */
export const getContentText = (data: unknown): string => {
  // পুরনো string shape
  if (typeof data === "string") return data;

  if (typeof data === "object" && data !== null && "text" in data) {
    const text = (data as { text?: unknown }).text;
    if (typeof text === "string") return text;
  }

  return "";
};

export const getPoints = (data: unknown): Point[] => {
  if (typeof data === "object" && data !== null && "points" in data) {
    const points = (data as { points?: unknown }).points;
    if (Array.isArray(points)) return points as Point[];
  }

  return [];
};

export const getChartData = (
  data: unknown,
): { chartType: ChartType; data: ChartDatum[] } => {
  if (typeof data === "object" && data !== null) {
    const c = data as { chartType?: unknown; data?: unknown };

    const chartType: ChartType =
      c.chartType === "line" || c.chartType === "pie" || c.chartType === "donut"
        ? c.chartType
        : "bar";

    const rows: ChartDatum[] = Array.isArray(c.data)
      ? c.data
          .filter((d) => typeof d === "object" && d !== null)
          .map((d, i) => {
            const row = d as Record<string, unknown>;
            return {
              label: getString(row.label, `#${i + 1}`),
              value: Math.max(0, getNumber(row.value, 0)),
              color: getString(row.color, NOTE_COLORS[i % NOTE_COLORS.length]),
            };
          })
      : [];

    return { chartType, data: rows.length ? rows : DEFAULT_CHART_DATA };
  }

  return { chartType: "bar", data: DEFAULT_CHART_DATA };
};

/* ------------------------------------------------------------------ */
/* Path helpers                                                        */
/* ------------------------------------------------------------------ */
export const toPath = (points: Point[]) =>
  points
    .map(
      ([x, y], index) =>
        `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`,
    )
    .join(" ");

/* arrow-er matha (polyline points) */
export const arrowHeadPoints = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  length = 14,
) => {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const spread = (5 * Math.PI) / 6;

  const ax = x2 + length * Math.cos(angle + spread);
  const ay = y2 + length * Math.sin(angle + spread);
  const bx = x2 + length * Math.cos(angle - spread);
  const by = y2 + length * Math.sin(angle - spread);

  return `${ax.toFixed(1)},${ay.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)} ${bx.toFixed(1)},${by.toFixed(1)}`;
};

/* ------------------------------------------------------------------ */
/* Element geometry readers (flat data shape)                          */
/* ------------------------------------------------------------------ */
export const getElementSize = (element: BoardElement) => ({
  width: getNumber(element.data?.w, DEFAULT_WIDTH),
  height: getNumber(element.data?.h, DEFAULT_HEIGHT),
});

export const getElementPosition = (element: BoardElement) => ({
  x: getNumber(element.data?.x, 0),
  y: getNumber(element.data?.y, 0),
});

export const getElementRotation = (element: BoardElement): number =>
  getNumber(element.data?.rotation, 0);

export const buildTransform = (
  x: number,
  y: number,
  rotation: number,
  width: number,
  height: number,
) => `translate(${x} ${y}) rotate(${rotation} ${width / 2} ${height / 2})`;

export const getElementTransform = (element: BoardElement) => {
  const { width, height } = getElementSize(element);
  const { x, y } = getElementPosition(element);
  const rotation = getElementRotation(element);

  return buildTransform(x, y, rotation, width, height);
};

/* ------------------------------------------------------------------ */
/* Type checks                                                         */
/* ------------------------------------------------------------------ */
export const isEditableType = (type: string) =>
  type === "text" ||
  type === "handwriting" ||
  type === "bullet" ||
  type === "sticky" ||
  type === "sticky-note";

/* khali thakle delete hoy emon text-type */
export const isTextLikeType = (type: string) =>
  type === "text" || type === "handwriting" || type === "bullet";

/* ------------------------------------------------------------------ */
/* Color target (reads from flat data)                                 */
/* ------------------------------------------------------------------ */
export const getColorTarget = (element: BoardElement): ColorTarget | null => {
  const data = element.data ?? {};

  switch (element.type) {
    case "text":
    case "handwriting":
    case "bullet":
      return {
        value: getString(data.color, C.ink),
        property: "color",
      };

    case "sticky":
    case "sticky-note":
      return {
        value: getString(data.background, C.amber),
        property: "background",
      };

    case "shape":
      return {
        value: getString(data.fill, C.sky),
        property: "fill",
      };

    case "draw":
    case "pen":
    case "line":
    case "arrow":
      return {
        value: getString(data.stroke, C.ink),
        property: "stroke",
      };

    default:
      return null;
  }
};
