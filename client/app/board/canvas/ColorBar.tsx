import type { ReactNode } from "react";
import { COLOR_PALETTE } from "./constants";
import type { FontKind, StrokeStyle, StyleKind, StyleSpec } from "./styleSpec";

type Props = {
  spec: StyleSpec;
  onChange: (kind: StyleKind, value: string | number) => void;
};

const WIDTHS = [2, 4, 7];
const BORDER_WIDTHS = [1, 2, 4, 6];
const STYLES: StrokeStyle[] = ["solid", "dashed", "dotted"];
const FONT_SIZES = [14, 18, 24, 32, 48, 64];

/* Trim palette so both groups fit on one row */
const SHORT_PALETTE = COLOR_PALETTE.slice(0, 9);

const FONTS: { key: FontKind; label: string; family: string }[] = [
  { key: "hand", label: "Aa", family: "var(--font-hand), cursive" },
  { key: "sans", label: "Aa", family: "inherit" },
];

const isHex = (v: string) => /^#[0-9a-f]{6}$/i.test(v);

const Group = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex items-center gap-1.5">
    <span className="text-[10px] font-bold uppercase tracking-wider text-white/80">
      {label}
    </span>
    <div className="flex items-center gap-1">{children}</div>
  </div>
);

const Swatches = ({
  value,
  onPick,
  allowNone,
}: {
  value: string;
  onPick: (c: string) => void;
  allowNone?: boolean;
}) => (
  <>
    {allowNone && (
      <button
        type="button"
        aria-label="None"
        onClick={() => onPick("transparent")}
        className="relative size-5 overflow-hidden rounded-full border border-white/35 transition-transform hover:scale-110"
        style={{
          boxShadow: value === "transparent" ? "0 0 0 2px #fff" : "none",
        }}
      >
        <span className="absolute left-1/2 top-[-3px] h-[26px] w-px rotate-45 bg-red-400" />
      </button>
    )}

    {SHORT_PALETTE.map((c) => (
      <button
        key={c}
        type="button"
        aria-label={c}
        onClick={() => onPick(c)}
        className="size-5 rounded-full border border-white/25 transition-transform hover:scale-110"
        style={{
          backgroundColor: c,
          boxShadow: c === value ? "0 0 0 2px #fff" : "none",
        }}
      />
    ))}

    <label
      title="Custom color"
      className="relative flex size-5 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-white/35"
      style={{
        background: isHex(value)
          ? value
          : "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)",
      }}
    >
      <input
        type="color"
        value={isHex(value) ? value : "#000000"}
        onChange={(e) => onPick(e.target.value)}
        className="absolute inset-0 size-full cursor-pointer opacity-0"
      />
    </label>
  </>
);

const Divider = () => <span className="h-5 w-px shrink-0 bg-white/20" />;

const optBtn = (active: boolean) =>
  `grid h-7 w-8 shrink-0 place-items-center rounded-md border transition-colors ${
    active
      ? "border-white/70 bg-white/25 text-white"
      : "border-transparent text-white/75 hover:bg-white/15 hover:text-white"
  }`;

const sizeBtn = (active: boolean) =>
  `grid h-7 min-w-[2rem] shrink-0 place-items-center rounded-md border px-1.5 text-[12px] font-bold transition-colors ${
    active
      ? "border-white/70 bg-white/25 text-white"
      : "border-transparent text-white/75 hover:bg-white/15 hover:text-white"
  }`;

const ColorBar = ({ spec, onChange }: Props) => {
  const closestWidth =
    spec.width !== undefined
      ? WIDTHS.reduce((a, b) =>
          Math.abs(b - spec.width!) < Math.abs(a - spec.width!) ? b : a,
        )
      : null;

  const closestBorderWidth =
    spec.borderWidth !== undefined
      ? BORDER_WIDTHS.reduce((a, b) =>
          Math.abs(b - spec.borderWidth!) < Math.abs(a - spec.borderWidth!)
            ? b
            : a,
        )
      : null;

  const showBorderRow =
    spec.border !== undefined || spec.borderWidth !== undefined;

  return (
    <div
      className="absolute left-1/2 top-4 z-50 flex -translate-x-1/2 flex-col gap-1.5 rounded-xl border border-white/15 bg-[#1c1c1c]/95 px-3 py-1.5 shadow-2xl backdrop-blur-xl"
      onPointerDown={(e) => e.stopPropagation()}
      style={{ maxWidth: "calc(100vw - 5rem)" }}
    >
      {/* Row 1 — jemon chilo temon */}
      <div className="flex flex-nowrap items-center gap-2.5 overflow-x-auto">
        {spec.stroke && (
          <Group label={spec.stroke.label}>
            <Swatches
              value={spec.stroke.value}
              onPick={(c) => onChange("stroke", c)}
            />
          </Group>
        )}

        {spec.fill && (
          <>
            <Divider />
            <Group label={spec.fill.label}>
              <Swatches
                value={spec.fill.value}
                onPick={(c) => onChange("fill", c)}
                allowNone={spec.fill.prop === "fill"}
              />
            </Group>
          </>
        )}

        {spec.width !== undefined && (
          <>
            <Divider />
            <Group label="W">
              {WIDTHS.map((w) => (
                <button
                  key={w}
                  type="button"
                  aria-label={`Width ${w}`}
                  onClick={() => onChange("width", w)}
                  className={optBtn(closestWidth === w)}
                >
                  <span
                    className="block w-4 rounded-full bg-current"
                    style={{ height: w }}
                  />
                </button>
              ))}
            </Group>
          </>
        )}

        {spec.style && (
          <>
            <Divider />
            <Group label="Style">
              {STYLES.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-label={s}
                  onClick={() => onChange("style", s)}
                  className={optBtn(spec.style === s)}
                >
                  <svg width="20" height="4" viewBox="0 0 20 4">
                    <line
                      x1="1"
                      y1="2"
                      x2="19"
                      y2="2"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeDasharray={
                        s === "dashed"
                          ? "5 3"
                          : s === "dotted"
                            ? "0.1 4"
                            : undefined
                      }
                    />
                  </svg>
                </button>
              ))}
            </Group>
          </>
        )}

        {spec.font && (
          <>
            <Divider />
            <Group label="Font">
              {FONTS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  aria-label={`${f.key} font`}
                  onClick={() => onChange("font", f.key)}
                  className={`${optBtn(spec.font === f.key)} text-base`}
                  style={{ fontFamily: f.family }}
                >
                  {f.label}
                </button>
              ))}
            </Group>
          </>
        )}

        {spec.fontSize !== undefined && (
          <>
            <Divider />
            <Group label="Size">
              {FONT_SIZES.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-label={`Font size ${s}`}
                  onClick={() => onChange("fontSize", s)}
                  className={sizeBtn(spec.fontSize === s)}
                >
                  {s}
                </button>
              ))}

              <input
                type="number"
                min={6}
                max={400}
                value={Math.round(spec.fontSize)}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v)) {
                    onChange("fontSize", Math.max(6, Math.min(400, v)));
                  }
                }}
                className="h-7 w-14 shrink-0 rounded-md border border-white/25 bg-white/10 px-1.5 text-[12px] font-bold text-white outline-none transition-colors focus:border-white/60 focus:bg-white/15"
              />
            </Group>
          </>
        )}
      </div>

      {/* Row 2 — Border (only for sticky) — same compact style */}
      {showBorderRow && (
        <div className="flex flex-nowrap items-center gap-2.5 overflow-x-auto border-t border-white/10 pt-1.5">
          {spec.border && (
            <Group label={spec.border.label}>
              <Swatches
                value={spec.border.value}
                onPick={(c) => onChange("border", c)}
                allowNone
              />
            </Group>
          )}

          {spec.borderWidth !== undefined && (
            <>
              <Divider />
              <Group label="B.W">
                {BORDER_WIDTHS.map((w) => (
                  <button
                    key={w}
                    type="button"
                    aria-label={`Border width ${w}`}
                    onClick={() => onChange("borderWidth", w)}
                    className={optBtn(closestBorderWidth === w)}
                  >
                    <span
                      className="block w-4 rounded-full bg-current"
                      style={{ height: Math.max(2, w) }}
                    />
                  </button>
                ))}
              </Group>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ColorBar;
