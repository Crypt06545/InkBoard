import type { PointerEvent as ReactPointerEvent } from "react";
import type { BoardElement } from "@/lib/api/board.api";

export type CanvasTool =
  | "select"
  | "hand"
  | "pen"
  | "text"
  | "handwriting"
  | "sticky"
  | "bullet"
  | "rectangle"
  | "circle"
  | "diamond"
  | "line"
  | "arrow"
  | "image"
  | "eraser"
  | "emoji"
  | "chart";

export type ChartType = "bar" | "line" | "pie" | "donut";

export type ChartDatum = {
  label: string;
  value: number;
  color: string;
};

/* emoji / chart tool-er jonno bachai kora option */
export type InsertOptions = {
  emoji: string;
  chartType: ChartType;
};

export type Point = [number, number];

export type LineDraft = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  type: "line" | "arrow";
};

/* drag-select box (world coordinate) */
export type Marquee = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

export type NewElement = {
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  style?: Record<string, unknown>;
  content?: unknown;
};

export type ColorTarget = {
  value: string;
  property: "fill" | "background" | "color" | "stroke";
};

export type ElementHandlers = {
  onPointerDown: (
    event: ReactPointerEvent<SVGGElement>,
    element: BoardElement,
  ) => void;
  onPointerMove: (event: ReactPointerEvent<SVGGElement>) => void;
  onPointerUp: () => void;
  onPointerEnter: (
    event: ReactPointerEvent<SVGGElement>,
    element: BoardElement,
  ) => void;
  onDoubleClick: (element: BoardElement) => void;
  onCommitEdit: (element: BoardElement, value: string) => void;
  onLiveEdit: (element: BoardElement, value: string) => void; // ⚠️ নতুন
  onAutoSize: (id: string, height: number) => void;
  onResizeStart: (
    event: ReactPointerEvent<SVGRectElement>,
    element: BoardElement,
    handle: ResizeHandle,
  ) => void;
  onResizeMove: (event: ReactPointerEvent<SVGRectElement>) => void;
  onResizeEnd: () => void;
  onRotateStart: (
    event: ReactPointerEvent<SVGCircleElement>,
    element: BoardElement,
  ) => void;
  onRotateMove: (event: ReactPointerEvent<SVGCircleElement>) => void;
  onRotateEnd: () => void;
};
