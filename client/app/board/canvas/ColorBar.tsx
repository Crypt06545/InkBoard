import { COLOR_PALETTE } from "./constants";
import type { ColorTarget } from "./types";

type ColorBarProps = {
  target: ColorTarget;
  onChange: (color: string) => void;
};

const ColorBar = ({ target, onChange }: ColorBarProps) => (
  <div
    className="absolute left-1/2 top-4 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-white/10 bg-[#161616] px-3 py-2 shadow-2xl"
    onPointerDown={(event) => event.stopPropagation()}
  >
    <span className="mr-1 text-xs font-medium text-white/50">Color</span>

    {COLOR_PALETTE.map((color) => (
      <button
        key={color}
        type="button"
        aria-label={`Change color to ${color}`}
        onClick={() => onChange(color)}
        className="h-6 w-6 rounded-full border border-white/20 transition-transform hover:scale-110"
        style={{
          backgroundColor: color,
          boxShadow: color === target.value ? "0 0 0 2px #ffffff" : "none",
        }}
      />
    ))}

    {/* Custom color picker */}
    <label
      className="relative ml-1 flex h-7 w-7 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-white/20"
      style={{ backgroundColor: target.value }}
      title="Custom color"
    >
      <input
        type="color"
        value={target.value}
        onChange={(event) => onChange(event.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />

      <span className="pointer-events-none text-xs text-white mix-blend-difference">
        +
      </span>
    </label>
  </div>
);

export default ColorBar;
