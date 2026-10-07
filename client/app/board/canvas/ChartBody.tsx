// app/board/canvas/ChartBody.tsx
import type { BoardElement } from "@/lib/api/board.api";
import { C } from "./constants";
import { getChartData, getElementSize } from "./utils";

const PAD = 16;

const ChartBody = ({ element }: { element: BoardElement }) => {
  const { width, height } = getElementSize(element);

  // ✅ element.content → element.data (flat shape)
  const { chartType, data } = getChartData(element.data);

  const frame = (
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

  const max = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((sum, d) => sum + d.value, 0);

  /* ---------- bar / line ---------- */
  if (chartType === "bar" || chartType === "line") {
    const innerW = Math.max(1, width - PAD * 2);
    const baseY = height - 28;
    const innerH = Math.max(1, baseY - PAD);
    const step = innerW / data.length;

    const pointsAt = data.map((d, i) => ({
      x: PAD + step * (i + 0.5),
      y: baseY - (d.value / max) * innerH,
    }));

    return (
      <>
        {frame}

        <line
          x1={PAD}
          y1={baseY}
          x2={width - PAD}
          y2={baseY}
          stroke={C.line}
          strokeWidth={1.5}
        />

        {chartType === "bar" &&
          data.map((d, i) => {
            const barW = step * 0.6;
            const barH = (d.value / max) * innerH;
            return (
              <rect
                key={i}
                x={PAD + step * i + (step - barW) / 2}
                y={baseY - barH}
                width={barW}
                height={barH}
                rx={4}
                fill={d.color}
              />
            );
          })}

        {chartType === "line" && (
          <>
            <polyline
              points={pointsAt.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke={C.ink}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {pointsAt.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={5}
                fill={data[i].color}
                stroke={C.ink}
                strokeWidth={1.5}
              />
            ))}
          </>
        )}

        {data.map((d, i) => (
          <text
            key={i}
            x={PAD + step * (i + 0.5)}
            y={baseY + 17}
            textAnchor="middle"
            fontSize={11}
            fill={C.ink}
          >
            {d.label}
          </text>
        ))}
      </>
    );
  }

  /* ---------- pie / donut ---------- */
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.max(4, Math.min(width, height) / 2 - PAD);

  let angle = -Math.PI / 2;

  const slices = data.map((d) => {
    const sweep = total > 0 ? (d.value / total) * Math.PI * 2 : 0;
    const start = angle;
    angle += sweep;
    return { d, start, end: angle, sweep };
  });

  return (
    <>
      {frame}

      {slices.map(({ d, start, end, sweep }, i) => {
        if (sweep <= 0) return null;

        if (sweep >= Math.PI * 2 - 0.001) {
          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              fill={d.color}
              stroke={C.surface}
              strokeWidth={2}
            />
          );
        }

        const x0 = cx + r * Math.cos(start);
        const y0 = cy + r * Math.sin(start);
        const x1 = cx + r * Math.cos(end);
        const y1 = cy + r * Math.sin(end);
        const large = sweep > Math.PI ? 1 : 0;

        return (
          <path
            key={i}
            d={`M${cx} ${cy} L${x0} ${y0} A${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`}
            fill={d.color}
            stroke={C.surface}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        );
      })}

      {chartType === "donut" && (
        <circle cx={cx} cy={cy} r={r * 0.55} fill={C.surface} />
      )}
    </>
  );
};

export default ChartBody;
