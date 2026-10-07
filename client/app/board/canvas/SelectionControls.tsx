import type { BoardElement } from "@/lib/api/board.api";
import { C } from "./constants";
import type { ElementHandlers, ResizeHandle } from "./types";

type SelectionControlsProps = {
  element: BoardElement;
  width: number;
  height: number;
  handlers: ElementHandlers;
};

const SelectionControls = ({
  element,
  width,
  height,
  handlers,
}: SelectionControlsProps) => {
  const handles: Array<{
    key: ResizeHandle;
    x: number;
    y: number;
    cursor: string;
  }> = [
    { key: "nw", x: -6, y: -6, cursor: "nwse-resize" },
    { key: "n", x: width / 2 - 4, y: -6, cursor: "ns-resize" },
    { key: "ne", x: width - 2, y: -6, cursor: "nesw-resize" },
    { key: "e", x: width - 2, y: height / 2 - 4, cursor: "ew-resize" },
    { key: "se", x: width - 2, y: height - 2, cursor: "nwse-resize" },
    { key: "s", x: width / 2 - 4, y: height - 2, cursor: "ns-resize" },
    { key: "sw", x: -6, y: height - 2, cursor: "nesw-resize" },
    { key: "w", x: -6, y: height / 2 - 4, cursor: "ew-resize" },
  ];

  return (
    <>
      <rect
        x={-6}
        y={-6}
        width={width + 12}
        height={height + 12}
        rx={14}
        fill="transparent"
        stroke={C.ink}
        strokeWidth={1.5}
        strokeDasharray="6 4"
        pointerEvents="none"
      />

      {handles.map((handle) => (
        <rect
          key={handle.key}
          x={handle.x}
          y={handle.y}
          width={8}
          height={8}
          rx={2}
          fill={C.surface}
          stroke={C.ink}
          strokeWidth={1.5}
          style={{ cursor: handle.cursor }}
          onPointerDown={(event) =>
            handlers.onResizeStart(event, element, handle.key)
          }
          onPointerMove={handlers.onResizeMove}
          onPointerUp={handlers.onResizeEnd}
        />
      ))}

      <line
        x1={width / 2}
        y1={-8}
        x2={width / 2}
        y2={-34}
        stroke={C.ink}
        strokeWidth={1.5}
        pointerEvents="none"
      />

      <circle
        cx={width / 2}
        cy={-42}
        r={7}
        fill={C.surface}
        stroke={C.ink}
        strokeWidth={1.5}
        style={{ cursor: "grab" }}
        onPointerDown={(event) => handlers.onRotateStart(event, element)}
        onPointerMove={handlers.onRotateMove}
        onPointerUp={handlers.onRotateEnd}
      />
    </>
  );
};

export default SelectionControls;
