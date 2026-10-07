"use client";

import { useEffect } from "react";

import ColorBar from "@/app/board/canvas/ColorBar";
import { C } from "@/app/board/canvas/constants";
import ElementView from "@/app/board/canvas/ElementView";
import { CanvasTool, InsertOptions } from "@/app/board/canvas/types";
import { useBoardCanvas } from "@/app/board/canvas/useBoardCanvas";
import { arrowHeadPoints, toPath } from "@/app/board/canvas/utils";
import type { BoardElement } from "@/lib/api/board.api";

/* BoardToolbar / CanvasPage ager moto ei path theke import korte pare */
export type { CanvasTool };

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

  onToolChange: (tool: CanvasTool) => void;

  getSocketId: () => string | null;

  emitElementLive: (element: BoardElement) => void;

  remoteElementsRef: React.MutableRefObject<RemoteElementsRef | null>;
};

const cursorFor = (tool: CanvasTool) => {
  if (tool === "hand") return "cursor-grab active:cursor-grabbing";
  if (tool === "select") return "cursor-default";
  if (tool === "eraser") return "cursor-cell";

  return "cursor-crosshair";
};

const BoardCanvas = ({
  boardId,
  elements,
  zoom,
  activeTool,
  options,
  onToolChange,
  getSocketId,
  emitElementLive,
  remoteElementsRef,
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

  /*
   * CanvasPage / parent component এখান থেকে
   * remote socket event handlers access করতে পারবে।
   */
  useEffect(() => {
    remoteElementsRef.current = canvas.remoteHandlers;

    return () => {
      remoteElementsRef.current = null;
    };
  }, [canvas.remoteHandlers, remoteElementsRef]);

  const scale = zoom / 100;

  const cameraTransform = `translate(${canvas.offset.x} ${canvas.offset.y}) scale(${scale})`;

  const line = canvas.lineDraft;

  const box = canvas.marquee;

  return (
    <>
      {canvas.hasSelection && canvas.colorTarget && activeTool === "select" && (
        <ColorBar
          target={canvas.colorTarget}
          onChange={canvas.changeSelectedColor}
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
            <circle cx="2" cy="2" r="1.3" fill={C.dot} />
          </pattern>
        </defs>

        <rect x="0" y="0" width="100%" height="100%" fill={C.bg} />

        <rect x="0" y="0" width="100%" height="100%" fill="url(#canvas-dots)" />

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

          {/* Drag-select box */}
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

          if (file) {
            canvas.insertImage(file);
          }

          event.target.value = "";
        }}
      />
    </>
  );
};

export default BoardCanvas;
