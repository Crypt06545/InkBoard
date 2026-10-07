"use client";

import { useEffect } from "react";

import ColorBar from "@/app/board/canvas/ColorBar";
import { C } from "@/app/board/canvas/constants";
import ElementView from "@/app/board/canvas/ElementView";
import { CanvasTool, InsertOptions } from "@/app/board/canvas/types";
import { useBoardCanvas } from "@/app/board/canvas/useBoardCanvas";
import { arrowHeadPoints, toPath } from "@/app/board/canvas/utils";
import {
  buildEmbeddedFontCss,
  inlineComputedStyles,
} from "@/app/board/canvas/exportUtils";
import type { BoardElement } from "@/lib/api/board.api";
import type { BoardBackground } from "@/hooks/useBoardBackground";

export type { CanvasTool };

export type CanvasHistoryRef = {
  undo: () => void;
  redo: () => void;
};

export type CanvasExportKind = "png" | "svg";

export type CanvasExportRef = {
  exportAs: (kind: CanvasExportKind, fileName: string) => Promise<boolean>;
};

type RemoteElementsRef = {
  applyRemoteCreate: (el: BoardElement) => void;
  applyRemoteUpdate: (el: BoardElement) => void;
  applyRemoteDelete: (id: string) => void;
  applyRemoteLive: (el: BoardElement) => void;
};

type BoardCanvasProps = {
  boardId: string;
  elements: BoardElement[];
  zoom: number;
  activeTool: CanvasTool;
  options: InsertOptions;
  background?: BoardBackground;
  onToolChange: (tool: CanvasTool) => void;
  getSocketId: () => string | null;
  emitElementLive: (element: BoardElement) => void;
  remoteElementsRef: React.MutableRefObject<RemoteElementsRef | null>;
  historyRef?: React.MutableRefObject<CanvasHistoryRef | null>;
  exportRef?: React.MutableRefObject<CanvasExportRef | null>;
  onHistoryChange?: (s: { canUndo: boolean; canRedo: boolean }) => void;
};

const cursorFor = (tool: CanvasTool) => {
  if (tool === "hand") return "cursor-grab active:cursor-grabbing";
  if (tool === "select") return "cursor-default";
  if (tool === "eraser") return "cursor-cell";
  return "cursor-crosshair";
};

const SVG_NS = "http://www.w3.org/2000/svg";
const EXPORT_PADDING = 48;
const PNG_SCALE = 2;
const PNG_MAX_SIDE = 8000;

const safeFileName = (name: string) =>
  name
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .slice(0, 80) || "board";

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const BoardCanvas = ({
  boardId,
  elements,
  zoom,
  activeTool,
  options,
  background = "dots",
  onToolChange,
  getSocketId,
  emitElementLive,
  remoteElementsRef,
  historyRef,
  exportRef,
  onHistoryChange,
}: BoardCanvasProps) => {
  const canvas = useBoardCanvas({
    boardId,
    elements,
    zoom,
    activeTool,
    options,
    onToolChange,
    getSocketId,
    emitElementLive,
  });

  /* expose remote handlers to the parent (CanvasPage) */
  useEffect(() => {
    remoteElementsRef.current = canvas.remoteHandlers;
    return () => {
      remoteElementsRef.current = null;
    };
  }, [canvas.remoteHandlers, remoteElementsRef]);

  /* expose undo / redo to the parent */
  useEffect(() => {
    if (!historyRef) return;
    historyRef.current = {
      undo: canvas.undo,
      redo: canvas.redo,
    };
    return () => {
      historyRef.current = null;
    };
  }, [historyRef, canvas.undo, canvas.redo]);

  /* report canUndo / canRedo changes */
  useEffect(() => {
    onHistoryChange?.({
      canUndo: canvas.canUndo,
      canRedo: canvas.canRedo,
    });
  }, [onHistoryChange, canvas.canUndo, canvas.canRedo]);

  /* expose export to the parent */
  useEffect(() => {
    if (!exportRef) return;

    const buildExportSvg = async () => {
      const world = canvas.worldRef.current;
      if (!world) return null;

      const box = world.getBBox();
      if (box.width === 0 && box.height === 0) return null;

      const x = box.x - EXPORT_PADDING;
      const y = box.y - EXPORT_PADDING;
      const width = Math.ceil(box.width + EXPORT_PADDING * 2);
      const height = Math.ceil(box.height + EXPORT_PADDING * 2);

      const svg = document.createElementNS(SVG_NS, "svg");
      svg.setAttribute("xmlns", SVG_NS);
      svg.setAttribute("viewBox", `${x} ${y} ${width} ${height}`);
      svg.setAttribute("width", String(width));
      svg.setAttribute("height", String(height));
      svg.setAttribute("style", "max-width:100%;height:auto");

      /* clone the board and bake the real styles + fonts into it */
      const clone = world.cloneNode(true) as SVGGElement;
      clone.removeAttribute("transform");

      const families = inlineComputedStyles(world, clone);
      const fontCss = await buildEmbeddedFontCss(families);

      if (fontCss) {
        const defs = document.createElementNS(SVG_NS, "defs");
        const style = document.createElementNS(SVG_NS, "style");
        style.textContent = fontCss;
        defs.appendChild(style);
        svg.appendChild(defs);
      }

      const bg = document.createElementNS(SVG_NS, "rect");
      bg.setAttribute("x", String(x));
      bg.setAttribute("y", String(y));
      bg.setAttribute("width", String(width));
      bg.setAttribute("height", String(height));
      bg.setAttribute("fill", C.bg);
      svg.appendChild(bg);

      svg.appendChild(clone);

      const source = new XMLSerializer().serializeToString(svg);
      return { source, width, height };
    };

    const exportAs = async (kind: CanvasExportKind, fileName: string) => {
      const built = await buildExportSvg();
      if (!built) return false;

      const base = safeFileName(fileName);

      if (kind === "svg") {
        downloadBlob(
          new Blob([built.source], { type: "image/svg+xml;charset=utf-8" }),
          `${base}.svg`,
        );
        return true;
      }

      const scale = Math.min(
        PNG_SCALE,
        PNG_MAX_SIDE / Math.max(built.width, built.height),
      );

      const image = new Image();
      const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
        built.source,
      )}`;

      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Could not render board"));
        image.src = dataUrl;
      });

      /* make sure the embedded fonts are ready before drawing */
      try {
        await image.decode();
      } catch {
        /* decode is best-effort */
      }

      const el = document.createElement("canvas");
      el.width = Math.max(1, Math.round(built.width * scale));
      el.height = Math.max(1, Math.round(built.height * scale));
      const ctx = el.getContext("2d");
      if (!ctx) return false;
      ctx.drawImage(image, 0, 0, el.width, el.height);

      const blob = await new Promise<Blob | null>((resolve) =>
        el.toBlob(resolve, "image/png"),
      );
      if (!blob) return false;

      downloadBlob(blob, `${base}.png`);
      return true;
    };

    exportRef.current = { exportAs };
    return () => {
      exportRef.current = null;
    };
  }, [exportRef, canvas.worldRef]);

  const scale = zoom / 100;
  const cameraTransform = `translate(${canvas.offset.x} ${canvas.offset.y}) scale(${scale})`;
  const line = canvas.lineDraft;
  const box = canvas.marquee;

  return (
    <>
      {canvas.hasSelection && canvas.styleSpec && activeTool === "select" && (
        <ColorBar
          spec={canvas.styleSpec}
          onChange={canvas.changeSelectedStyle}
        />
      )}

      <svg
        ref={canvas.svgRef}
        className={`absolute inset-0 h-full w-full touch-none select-none ${cursorFor(
          activeTool,
        )}`}
        xmlns="http://www.w3.org/2000/svg"
        onPointerDown={canvas.canvasHandlers.onPointerDown}
        onPointerMove={canvas.canvasHandlers.onPointerMove}
        onPointerUp={canvas.canvasHandlers.onPointerUp}
        onPointerCancel={canvas.canvasHandlers.onPointerUp}
      >
        <defs>
          <pattern
            ref={canvas.patternRef}
            id="canvas-dots"
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
            patternTransform={cameraTransform}
          >
            {background === "dots" && (
              <circle cx="2" cy="2" r="1.3" fill={C.dot} />
            )}
            {background === "grid" && (
              <path d="M24 0H0V24" fill="none" stroke={C.dot} strokeWidth="1" />
            )}
          </pattern>
        </defs>

        <rect x="0" y="0" width="100%" height="100%" fill={C.bg} />
        {background !== "plain" && (
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="url(#canvas-dots)"
          />
        )}

        <g ref={canvas.worldRef} transform={cameraTransform}>
          {canvas.sortedElements.map((element) => (
            <ElementView
              key={element.id}
              element={element}
              isSelected={canvas.selectedSet.has(element.id)}
              showControls={canvas.singleId === element.id}
              isEditing={canvas.editingId === element.id}
              tool={activeTool}
              handlers={canvas.handlers}
            />
          ))}

          {canvas.draft.length > 1 && (
            <path
              d={toPath(canvas.draft)}
              fill="none"
              stroke={C.ink}
              strokeWidth={4}
              strokeLinecap="round"
              strokeLinejoin="round"
              pointerEvents="none"
            />
          )}

          {line && (
            <g pointerEvents="none">
              <line
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke={C.ink}
                strokeWidth={3}
                strokeLinecap="round"
              />
              {line.type === "arrow" && (
                <polyline
                  points={arrowHeadPoints(line.x1, line.y1, line.x2, line.y2)}
                  fill="none"
                  stroke={C.ink}
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </g>
          )}

          {box && (
            <rect
              x={Math.min(box.x1, box.x2)}
              y={Math.min(box.y1, box.y2)}
              width={Math.abs(box.x2 - box.x1)}
              height={Math.abs(box.y2 - box.y1)}
              fill={C.ink}
              fillOpacity={0.06}
              stroke={C.ink}
              strokeWidth={1.5 / scale}
              strokeDasharray={`${6 / scale} ${4 / scale}`}
              pointerEvents="none"
            />
          )}
        </g>
      </svg>

      <input
        ref={canvas.fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) canvas.insertImage(file);
          event.target.value = "";
        }}
      />
    </>
  );
};

export default BoardCanvas;
