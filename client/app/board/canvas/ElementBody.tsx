// app/board/canvas/ElementBody.tsx
import type { CSSProperties } from "react";
import type { BoardElement } from "@/lib/api/board.api";
import ChartBody from "./ChartBody";
import { C, HAND_FONT } from "./constants";
import EditorTextarea from "./EditorTextarea";
import {
  arrowHeadPoints,
  getContentText,
  getElementSize,
  getNumber,
  getPoints,
  getString,
  toPath,
} from "./utils";

type ElementBodyProps = {
  element: BoardElement;
  editing: boolean;
  onCommitEdit: (element: BoardElement, value: string) => void;
  onLiveEdit: (element: BoardElement, value: string) => void;
  onAutoSize: (id: string, height: number) => void;
};

const BULLET = "• ";

const editorStyle = (
  fontSize: number,
  color: string,
  hand: boolean,
): CSSProperties => ({
  width: "100%",
  height: "100%",
  resize: "none",
  border: "none",
  outline: "none",
  background: "transparent",
  padding: 0,
  color,
  fontSize,
  fontFamily: hand ? HAND_FONT : "inherit",
  fontWeight: hand ? 600 : 500,
  lineHeight: hand ? 1.1 : 1.35,
});

/* text / handwriting / bullet ekii block */
const TextBlock = ({
  element,
  editing,
  onCommitEdit,
  onLiveEdit,
  onAutoSize,
}: ElementBodyProps) => {
  const { width, height } = getElementSize(element);

  const data = element.data ?? {};

  const hand = element.type === "handwriting";
  const bullet = element.type === "bullet";

  const fontSize = getNumber(data.fontSize, hand ? 30 : bullet ? 20 : 22);
  const color = getString(data.color, C.ink);
  const content = getContentText(data);

  const lines = content.split("\n").filter((line) => line.trim() !== "");
  const placeholder = hand ? "Handwriting" : bullet ? "Item" : "Text";

  const base: CSSProperties = {
    color,
    fontSize,
    fontFamily: hand ? HAND_FONT : undefined,
    fontWeight: hand ? 600 : getNumber(data.fontWeight, 500),
    lineHeight: hand ? 1.1 : 1.35,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    userSelect: "none",
  };

  const bulletInitial = lines.length
    ? lines.map((line) => BULLET + line).join("\n")
    : BULLET;

  return (
    <foreignObject x={0} y={0} width={width} height={height} overflow="visible">
      {editing ? (
        <EditorTextarea
          bullet={bullet}
          defaultValue={bullet ? bulletInitial : content}
          placeholder="Type…"
          style={editorStyle(fontSize, color, hand)}
          onCommit={(value) => onCommitEdit(element, value)}
          onLiveChange={(value) => onLiveEdit(element, value)}
          onFit={(contentHeight) =>
            onAutoSize(element.id, Math.max(32, Math.ceil(contentHeight) + 4))
          }
        />
      ) : bullet ? (
        <div style={base}>
          {(lines.length ? lines : [placeholder]).map((line, i) => (
            <div key={i} style={{ display: "flex", gap: 10 }}>
              <span aria-hidden="true">•</span>
              <span>{line}</span>
            </div>
          ))}
        </div>
      ) : (
        <div style={base}>{content || placeholder}</div>
      )}
    </foreignObject>
  );
};

const ElementBody = ({
  element,
  editing,
  onCommitEdit,
  onLiveEdit,
  onAutoSize,
}: ElementBodyProps) => {
  const { width, height } = getElementSize(element);

  const data = element.data ?? {};

  const fill = getString(data.fill, getString(data.background, C.sky));
  const stroke = getString(data.stroke, C.ink);
  const strokeWidth = getNumber(data.strokeWidth, 2.4);
  const content = getContentText(data);

  switch (element.type) {
    case "text":
    case "handwriting":
    case "bullet":
      return (
        <TextBlock
          element={element}
          editing={editing}
          onCommitEdit={onCommitEdit}
          onLiveEdit={onLiveEdit}
          onAutoSize={onAutoSize}
        />
      );

    case "sticky-note":
    case "sticky": {
      const fontSize = getNumber(data.fontSize, 24);
      const color = getString(data.color, C.paperInk);

      return (
        <>
          <rect
            x={4}
            y={14}
            width={Math.max(0, width - 8)}
            height={height - 4}
            rx={8}
            fill="#000000"
            opacity={0.22}
            pointerEvents="none"
          />
          <rect
            x={2}
            y={8}
            width={Math.max(0, width - 4)}
            height={height - 2}
            rx={7}
            fill="#000000"
            opacity={0.28}
            pointerEvents="none"
          />
          <rect
            x={0}
            y={0}
            width={width}
            height={height}
            rx={6}
            fill={getString(data.background, C.amber)}
          />

          <foreignObject
            x={14}
            y={12}
            width={Math.max(0, width - 28)}
            height={Math.max(0, height - 24)}
          >
            {editing ? (
              <EditorTextarea
                defaultValue={content}
                placeholder="Write…"
                style={editorStyle(fontSize, color, true)}
                onCommit={(value) => onCommitEdit(element, value)}
                onLiveChange={(value) => onLiveEdit(element, value)}
                onFit={(contentHeight) =>
                  onAutoSize(
                    element.id,
                    Math.max(height, Math.ceil(contentHeight) + 28),
                  )
                }
              />
            ) : (
              <div
                style={{
                  color,
                  fontFamily: HAND_FONT,
                  fontWeight: 600,
                  fontSize,
                  lineHeight: 1.1,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  userSelect: "none",
                }}
              >
                {content || "Sticky note"}
              </div>
            )}
          </foreignObject>
        </>
      );
    }

    case "shape": {
      const shape = getString(data.shape, "rectangle");

      if (shape === "circle") {
        return (
          <ellipse
            cx={width / 2}
            cy={height / 2}
            rx={Math.max(1, width / 2 - 2)}
            ry={Math.max(1, height / 2 - 2)}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        );
      }

      if (shape === "diamond") {
        return (
          <polygon
            points={`${width / 2},2 ${width - 2},${height / 2} ${width / 2},${height - 2} 2,${height / 2}`}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        );
      }

      return (
        <rect
          x={0}
          y={0}
          width={width}
          height={height}
          rx={12}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />
      );
    }

    case "line":
    case "arrow": {
      const flipX = data.flipX === true;
      const flipY = data.flipY === true;

      const x1 = flipX ? width : 0;
      const y1 = flipY ? height : 0;
      const x2 = flipX ? 0 : width;
      const y2 = flipY ? 0 : height;

      const lineWidth = getNumber(data.strokeWidth, 3);

      return (
        <>
          <line
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="transparent"
            strokeWidth={18}
            strokeLinecap="round"
          />
          <line
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={stroke}
            strokeWidth={lineWidth}
            strokeLinecap="round"
          />
          {element.type === "arrow" && (
            <polyline
              points={arrowHeadPoints(x1, y1, x2, y2)}
              fill="none"
              stroke={stroke}
              strokeWidth={lineWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </>
      );
    }

    case "draw":
    case "pen":
      return (
        <path
          d={toPath(getPoints(data))}
          fill="none"
          stroke={stroke}
          strokeWidth={getNumber(data.strokeWidth, 4)}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );

    case "emoji":
      return (
        <text
          x={width / 2}
          y={height / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={Math.max(width, height) * 0.7}
        >
          {getString(data.text, "✨")}
        </text>
      );

    case "chart":
      return <ChartBody element={element} />;

    case "image": {
      const imageUrl = getString(
        data.src,
        getString(data.url, typeof data === "string" ? data : ""),
      );

      return imageUrl ? (
        <image
          href={imageUrl}
          x={0}
          y={0}
          width={width}
          height={height}
          preserveAspectRatio="xMidYMid slice"
        />
      ) : (
        <rect
          x={0}
          y={0}
          width={width}
          height={height}
          rx={12}
          fill={C.surface}
          stroke={C.line}
          strokeWidth={1.5}
        />
      );
    }

    default:
      return (
        <rect
          x={0}
          y={0}
          width={width}
          height={height}
          rx={12}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />
      );
  }
};

export default ElementBody;
