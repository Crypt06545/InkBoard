"use client";

import type { CSSProperties } from "react";
import EmojiPicker, {
  EmojiStyle,
  Theme,
  type EmojiClickData,
} from "emoji-picker-react";
import { CanvasTool, ChartType, InsertOptions } from "@/app/board/canvas/types";


const CHARTS: { type: ChartType; label: string }[] = [
  { type: "bar", label: "Bar" },
  { type: "line", label: "Line" },
  { type: "pie", label: "Pie" },
  { type: "donut", label: "Donut" },
];

/* picker-er rong toolbar-er sathe milano */
const pickerStyle = {
  "--epr-bg-color": "#121212",
  "--epr-picker-border-color": "#262626",
  "--epr-category-label-bg-color": "#121212",
  "--epr-search-input-bg-color": "#1c1c1c",
  "--epr-hover-bg-color": "#1c1c1c",
  "--epr-focus-bg-color": "#1c1c1c",
  "--epr-highlight-color": "#ededed",
} as CSSProperties;

type ToolPickerProps = {
  tool: CanvasTool;
  options: InsertOptions;
  onChange: (options: InsertOptions) => void;
};

const ToolPicker = ({ tool, options, onChange }: ToolPickerProps) => {
  if (tool !== "emoji" && tool !== "chart") return null;

  if (tool === "emoji") {
    return (
      <div className="absolute left-full top-1/2 ml-3 -translate-y-1/2 overflow-hidden rounded-2xl shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)]">
        <EmojiPicker
          theme={Theme.DARK}
          emojiStyle={EmojiStyle.NATIVE}
          width={320}
          height={400}
          lazyLoadEmojis
          previewConfig={{ showPreview: false }}
          style={pickerStyle}
          onEmojiClick={(data: EmojiClickData) =>
            onChange({ ...options, emoji: data.emoji })
          }
        />

        <div className="border-t border-[#262626] bg-[#121212] px-3 py-2 text-xs text-[#9a9a9a]">
          Selected: <span className="text-base">{options.emoji}</span> ·
          canvas-e click korun
        </div>
      </div>
    );
  }

  return (
    <div className="absolute left-full top-1/2 ml-3 w-64 -translate-y-1/2 rounded-2xl border border-[#262626] bg-[#121212]/95 p-3 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl">
      <p className="mb-2 text-xs font-semibold text-[#ededed]">Chart type</p>

      <div className="grid grid-cols-2 gap-1.5">
        {CHARTS.map(({ type, label }) => (
          <button
            key={type}
            type="button"
            aria-pressed={options.chartType === type}
            onClick={() => onChange({ ...options, chartType: type })}
            className={`h-9 rounded-lg text-sm font-medium transition-colors ${
              options.chartType === type
                ? "bg-[#ededed] text-[#0a0a0a]"
                : "text-[#9a9a9a] hover:bg-[#1c1c1c] hover:text-[#ededed]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <p className="mt-2 text-[11px] text-[#9a9a9a]">
        Bachar por canvas-e click korun.
      </p>
    </div>
  );
};

export default ToolPicker;
