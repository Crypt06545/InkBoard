import type { BoardElement } from "@/lib/api/board.api";
import { C } from "./constants";

export type StyleKind =
  | "stroke"
  | "fill"
  | "width"
  | "style"
  | "font"
  | "fontSize"
  | "border"
  | "borderWidth";

export type StrokeStyle = "solid" | "dashed" | "dotted";
export type FontKind = "hand" | "sans";

type ColorProp = { prop: string; label: string; value: string };

export type StyleSpec = {
  stroke?: ColorProp;
  fill?: ColorProp;
  border?: ColorProp;
  width?: number;
  borderWidth?: number;
  style?: StrokeStyle;
  font?: FontKind;
  fontSize?: number;
};

const str = (v: unknown, fallback: string) =>
  typeof v === "string" && v ? v : fallback;

const nbr = (v: unknown, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;

const defaultFontSize = (el: BoardElement): number => {
  const d = el.data ?? {};
  switch (el.type) {
    case "handwriting":
      return nbr(d.fontSize, 30);
    case "bullet":
      return nbr(d.fontSize, 20);
    case "sticky":
    case "sticky-note":
      return nbr(d.fontSize, 24);
    case "text":
    default:
      return nbr(d.fontSize, 22);
  }
};

export function getStyleSpec(el: BoardElement): StyleSpec | null {
  const d = el.data ?? {};
  const strokeStyle = str(d.strokeStyle, "solid") as StrokeStyle;

  switch (el.type) {
    case "text":
    case "handwriting":
    case "bullet":
      return {
        stroke: { prop: "color", label: "Text", value: str(d.color, C.ink) },
        font: str(
          d.font,
          el.type === "handwriting" ? "hand" : "sans",
        ) as FontKind,
        fontSize: defaultFontSize(el),
      };

    case "sticky":
    case "sticky-note":
      return {
        stroke: {
          prop: "color",
          label: "Text",
          value: str(d.color, C.paperInk),
        },
        fill: {
          prop: "background",
          label: "Fill",
          value: str(d.background, C.amber),
        },
        border: {
          prop: "borderColor",
          label: "Border",
          value: str(d.borderColor, "transparent"),
        },
        borderWidth: nbr(d.borderWidth, 0),
        font: str(d.font, "hand") as FontKind,
        fontSize: defaultFontSize(el),
      };

    case "shape":
      return {
        stroke: {
          prop: "stroke",
          label: "Border",
          value: str(d.stroke, C.ink),
        },
        fill: {
          prop: "fill",
          label: "Fill",
          value: str(d.fill, str(d.background, C.sky)),
        },
        width: nbr(d.strokeWidth, 2.4),
        style: strokeStyle,
      };

    case "line":
    case "arrow":
      return {
        stroke: {
          prop: "stroke",
          label: "Stroke",
          value: str(d.stroke, C.ink),
        },
        width: nbr(d.strokeWidth, 3),
        style: strokeStyle,
      };

    case "draw":
    case "pen":
      return {
        stroke: {
          prop: "stroke",
          label: "Stroke",
          value: str(d.stroke, C.ink),
        },
        width: nbr(d.strokeWidth, 4),
        style: strokeStyle,
      };

    default:
      return null;
  }
}

export function applyStyle(
  el: BoardElement,
  kind: StyleKind,
  value: string | number,
): Record<string, unknown> | null {
  const spec = getStyleSpec(el);
  if (!spec) return null;

  switch (kind) {
    case "stroke":
      return spec.stroke ? { [spec.stroke.prop]: value } : null;
    case "fill":
      return spec.fill ? { [spec.fill.prop]: value } : null;
    case "width":
      return spec.width !== undefined ? { strokeWidth: value } : null;
    case "style":
      return spec.style ? { strokeStyle: value } : null;
    case "font":
      return spec.font ? { font: value } : null;
    case "fontSize":
      return spec.fontSize !== undefined ? { fontSize: value } : null;
    case "border":
      return spec.border ? { [spec.border.prop]: value } : null;
    case "borderWidth":
      return spec.borderWidth !== undefined ? { borderWidth: value } : null;
  }
}
