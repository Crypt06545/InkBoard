"use client";

import { useMemo } from "react";
import { PenLine } from "lucide-react";
import { elX, elY, elW, elH } from "@/lib/api/board.api";
import type { BoardElement, BoardSummary } from "@/lib/api/board.api";

export type ThumbBoard = BoardSummary & {
  thumbnail?: string;
  elements?: BoardElement[];
};

/** Board page er default dark bg. */
const DEFAULT_BG = "#0b0d12";
const DOT_COLOR = "rgba(255,255,255,0.14)";
const GRID_COLOR = "rgba(255,255,255,0.06)";
const TILE = 22;
const PAD = 60;

/** Backend default '#ffffff' dey, kintu canvas dark — tai white hole dark e fallback. */
function resolveBg(c?: string | null) {
  if (!c) return DEFAULT_BG;
  const v = c.trim().toLowerCase();
  if (v === "#fff" || v === "#ffffff" || v === "white") return DEFAULT_BG;
  return c;
}

type Props = {
  board: ThumbBoard;
  elements?: BoardElement[];
  loading?: boolean;
};

export default function BoardThumbnail({ board, elements, loading }: Props) {
  if (board.thumbnail) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={board.thumbnail}
        alt=""
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover"
      />
    );
  }

  const bg = resolveBg(board.bgColor);
  const background = board.background ?? "dots";
  const list = elements ?? board.elements;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        backgroundColor: bg,
        backgroundImage: bgPattern(background),
        backgroundSize:
          background === "plain" ? undefined : `${TILE}px ${TILE}px`,
      }}
    >
      {!list || list.length === 0 ? (
        <div
          className={`grid h-full w-full place-items-center ${
            loading ? "animate-pulse" : ""
          }`}
        >
          <PenLine className="size-8 text-white/25" strokeWidth={1.6} />
        </div>
      ) : (
        <SvgPreview elements={list} />
      )}
    </div>
  );
}

function bgPattern(kind: string): string | undefined {
  if (kind === "dots") {
    return `radial-gradient(${DOT_COLOR} 1.2px, transparent 1.2px)`;
  }
  if (kind === "grid") {
    return `linear-gradient(${GRID_COLOR} 1px, transparent 1px), linear-gradient(90deg, ${GRID_COLOR} 1px, transparent 1px)`;
  }
  return undefined;
}

/* ---------------- geometry ---------------- */

type Box = { x: number; y: number; w: number; h: number };

const num = (v: unknown): number | undefined =>
  typeof v === "number" && Number.isFinite(v) ? v : undefined;

/** line/arrow: x1.. thakle seta, na hole x,y -> x+w,y+h (DB te eivabei ache) */
function lineEnds(el: BoardElement) {
  const d = el.data;
  const x = elX(el);
  const y = elY(el);
  return {
    x1: num(d.x1) ?? x,
    y1: num(d.y1) ?? y,
    x2: num(d.x2) ?? x + elW(el),
    y2: num(d.y2) ?? y + elH(el),
  };
}

function boxOf(el: BoardElement): Box {
  if (el.type === "line" || el.type === "arrow") {
    const { x1, y1, x2, y2 } = lineEnds(el);
    return {
      x: Math.min(x1, x2),
      y: Math.min(y1, y2),
      w: Math.abs(x2 - x1),
      h: Math.abs(y2 - y1),
    };
  }
  if (el.type === "draw") {
    const pts = (el.data.points as [number, number][]) || [];
    if (pts.length) {
      const xs = pts.map((p) => p[0]);
      const ys = pts.map((p) => p[1]);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      return {
        x: minX,
        y: minY,
        w: Math.max(...xs) - minX,
        h: Math.max(...ys) - minY,
      };
    }
  }
  return { x: elX(el), y: elY(el), w: elW(el), h: elH(el) };
}

function computeViewBox(elements: BoardElement[]): Box {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const el of elements) {
    const { x, y, w, h } = boxOf(el);
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x + w > maxX) maxX = x + w;
    if (y + h > maxY) maxY = y + h;
  }

  if (!Number.isFinite(minX)) return { x: 0, y: 0, w: 800, h: 600 };

  return {
    x: minX - PAD,
    y: minY - PAD,
    w: Math.max(400, maxX - minX + PAD * 2),
    h: Math.max(300, maxY - minY + PAD * 2),
  };
}

/* ---------------- preview ---------------- */

function SvgPreview({ elements }: { elements: BoardElement[] }) {
  const vb = useMemo(() => computeViewBox(elements), [elements]);
  const sorted = useMemo(
    () => [...elements].sort((a, b) => (a.z ?? 0) - (b.z ?? 0)),
    [elements],
  );

  // Thumbnail e board boro hole stroke paatla hoye jay — viewBox er sathe scale kori.
  const u = Math.max(1, vb.w / 700);

  return (
    <svg
      viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
      preserveAspectRatio="xMidYMid meet"
      className="relative h-full w-full"
      aria-hidden="true"
    >
      {sorted.map((el) => {
        const rot = (el.data?.rotation as number | undefined) ?? 0;
        const b = boxOf(el);
        const cx = b.x + b.w / 2;
        const cy = b.y + b.h / 2;
        return (
          <g
            key={el.id}
            transform={rot ? `rotate(${rot} ${cx} ${cy})` : undefined}
          >
            <MiniElement el={el} u={u} />
          </g>
        );
      })}
    </svg>
  );
}

function MiniElement({ el, u }: { el: BoardElement; u: number }) {
  const d = el.data;
  const x = elX(el);
  const y = elY(el);
  const w = elW(el);
  const h = elH(el);

  const stroke = (d.stroke as string) || "#e5e7eb";
  const fill = (d.fill as string) || "none";
  const color = (d.color as string) || "#e5e7eb";
  const fontSize = num(d.fontSize) ?? 16;
  const weight = num(d.weight) ?? 500;
  const sw = (num(d.strokeWidth) ?? 3) * u;

  // sticky = handwriting, baki sob sans (canvas er moto)
  const font = (d.font as string) || (el.type === "sticky" ? "hand" : "sans");
  const fontFamily =
    font === "hand"
      ? "var(--font-hand, 'Caveat', cursive)"
      : "var(--font-sans, system-ui, sans-serif)";

  switch (el.type) {
    case "rect":
    case "rectangle":
      return (
        <rect
          x={x}
          y={y}
          width={w}
          height={h}
          fill={fill}
          stroke={stroke}
          strokeWidth={1.5 * u}
        />
      );

    case "ellipse":
    case "circle":
      return (
        <ellipse
          cx={x + w / 2}
          cy={y + h / 2}
          rx={w / 2}
          ry={h / 2}
          fill={fill}
          stroke={stroke}
          strokeWidth={1.5 * u}
        />
      );

    case "diamond": {
      const cx = x + w / 2;
      const cy = y + h / 2;
      return (
        <polygon
          points={`${cx},${y} ${x + w},${cy} ${cx},${y + h} ${x},${cy}`}
          fill={fill}
          stroke={stroke}
          strokeWidth={1.5 * u}
        />
      );
    }

    case "sticky": {
      // DB te sticky er color `background` e ache
      const bgFill =
        (d.background as string) || (d.fill as string) || "#fde68a";
      const textColor = (d.color as string) || "#16161d";
      const maxChars = Math.max(6, Math.floor((w - 24) / (fontSize * 0.5)));
      const maxLines = Math.max(1, Math.floor((h - 16) / (fontSize * 1.25)));
      const lines = wrapText(String(d.text ?? ""), maxChars, maxLines);
      return (
        <>
          <rect x={x} y={y} width={w} height={h} rx={6} fill={bgFill} />
          {lines.length > 0 && (
            <text fill={textColor} fontFamily={fontFamily} fontSize={fontSize}>
              {lines.map((line, i) => (
                <tspan
                  key={i}
                  x={x + 12}
                  y={y + 12 + fontSize + i * fontSize * 1.25}
                >
                  {line}
                </tspan>
              ))}
            </text>
          )}
        </>
      );
    }

    case "text":
    case "hand":
    case "handwriting": {
      const maxChars = Math.max(6, Math.floor(w / (fontSize * 0.55)));
      const lines = wrapText(String(d.text ?? ""), maxChars, 4);
      return (
        <text
          fill={color}
          fontFamily={fontFamily}
          fontSize={fontSize}
          fontWeight={weight}
        >
          {lines.map((line, i) => (
            <tspan key={i} x={x} y={y + fontSize + i * fontSize * 1.25}>
              {line}
            </tspan>
          ))}
        </text>
      );
    }

    case "bullet": {
      // DB te `text` string ache (items array na) — newline diye bhag kori
      const items: string[] = Array.isArray(d.items)
        ? (d.items as unknown[]).map(String)
        : String(d.text ?? "")
            .split("\n")
            .filter(Boolean);

      const bullet = (d.bulletStyle as string) || "disc";
      const mark =
        bullet === "disc"
          ? "•"
          : bullet === "circle"
            ? "◦"
            : bullet === "square"
              ? "▪"
              : "–";

      const indent = fontSize * 1.1;
      const maxChars = Math.max(
        6,
        Math.floor((w - indent) / (fontSize * 0.55)),
      );

      const rows: { t: string; first: boolean }[] = [];
      items.forEach((it) =>
        wrapText(it, maxChars, 99).forEach((l, i) =>
          rows.push({ t: l, first: i === 0 }),
        ),
      );

      return (
        <text
          fill={color}
          fontFamily={fontFamily}
          fontSize={fontSize}
          fontWeight={weight}
        >
          {rows.slice(0, 8).map((r, i) => (
            <tspan key={i} x={x} y={y + fontSize + i * fontSize * 1.35}>
              {r.first ? `${mark}` : ""}
              <tspan x={x + indent}>{r.t}</tspan>
            </tspan>
          ))}
        </text>
      );
    }

    case "line": {
      const { x1, y1, x2, y2 } = lineEnds(el);
      return (
        <line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={stroke}
          strokeWidth={sw}
          strokeLinecap="round"
        />
      );
    }

    case "arrow": {
      const { x1, y1, x2, y2 } = lineEnds(el);
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const len = 14 * u;
      const a1x = x2 - len * Math.cos(angle - Math.PI / 7);
      const a1y = y2 - len * Math.sin(angle - Math.PI / 7);
      const a2x = x2 - len * Math.cos(angle + Math.PI / 7);
      const a2y = y2 - len * Math.sin(angle + Math.PI / 7);
      return (
        <>
          <line
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={stroke}
            strokeWidth={sw}
            strokeLinecap="round"
          />
          <polygon
            points={`${x2},${y2} ${a1x},${a1y} ${a2x},${a2y}`}
            fill={stroke}
          />
        </>
      );
    }

    case "draw": {
      const pts = (d.points as [number, number][]) || [];
      if (pts.length < 2) return null;
      const dPath = "M " + pts.map(([px, py]) => `${px} ${py}`).join(" L ");
      return (
        <path
          d={dPath}
          fill="none"
          stroke={stroke}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    }

    case "emoji":
      return (
        <text x={x} y={y + h * 0.85} fontSize={Math.min(w, h) * 0.85}>
          {String(d.emoji ?? "")}
        </text>
      );

    case "image":
      return d.src ? (
        <image
          href={String(d.src)}
          x={x}
          y={y}
          width={w}
          height={h}
          preserveAspectRatio="xMidYMid slice"
        />
      ) : (
        <rect
          x={x}
          y={y}
          width={w}
          height={h}
          fill="#1f2937"
          stroke={stroke}
          strokeWidth={1.5 * u}
        />
      );

    case "chart":
      return (
        <rect
          x={x}
          y={y}
          width={w}
          height={h}
          rx={6}
          fill="#1f2937"
          stroke={stroke}
          strokeWidth={1.5 * u}
        />
      );

    default:
      return null;
  }
}

function wrapText(text: string, maxChars: number, maxLines = 6): string[] {
  const lines: string[] = [];
  for (const raw of text.split("\n")) {
    let cur = "";
    for (const word of raw.split(/\s+/).filter(Boolean)) {
      if ((cur + " " + word).trim().length > maxChars) {
        if (cur) lines.push(cur);
        cur = word;
      } else {
        cur = (cur + " " + word).trim();
      }
    }
    if (cur) lines.push(cur);
  }
  return lines.slice(0, maxLines);
}
