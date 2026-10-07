import { memo } from "react";
import type { BoardElement } from "@/lib/api/board.api";
import { C } from "./constants";
import ElementBody from "./ElementBody";
import SelectionControls from "./SelectionControls";
import type { CanvasTool, ElementHandlers } from "./types";
import { getElementSize, getElementTransform, isEditableType } from "./utils";

type ElementViewProps = {
  element: BoardElement;
  isSelected: boolean;
  /* resize / rotate handle dekhabe kina (shudhu single selection e) */
  showControls: boolean;
  isEditing: boolean;
  tool: CanvasTool;
  handlers: ElementHandlers;
};

/* memo: pan/drag er shomoy shudhu bodlano element-i re-render hoy */
const ElementView = memo(
  ({
    element,
    isSelected,
    showControls,
    isEditing,
    tool,
    handlers,
  }: ElementViewProps) => {
    const { width, height } = getElementSize(element);
    const selectable = isSelected && !isEditing && tool === "select";

    return (
      <g
        data-element-id={element.id}
        transform={getElementTransform(element)}
        className={tool === "select" ? "cursor-move" : ""}
        onPointerDown={(event) => handlers.onPointerDown(event, element)}
        onPointerMove={handlers.onPointerMove}
        onPointerUp={handlers.onPointerUp}
        onPointerEnter={(event) => handlers.onPointerEnter(event, element)}
        onDoubleClick={() => {
          if (tool === "select" && isEditableType(element.type)) {
            handlers.onDoubleClick(element);
          }
        }}
      >
        <ElementBody
          element={element}
          editing={isEditing}
          onCommitEdit={handlers.onCommitEdit}
          onLiveEdit={handlers.onLiveEdit}
          onAutoSize={handlers.onAutoSize}
        />

        {selectable && showControls && (
          <SelectionControls
            element={element}
            width={width}
            height={height}
            handlers={handlers}
          />
        )}

        {/* multi-select: shudhu dashed outline */}
        {selectable && !showControls && (
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
        )}
      </g>
    );
  },
);

ElementView.displayName = "ElementView";

export default ElementView;
