"use client";

import { useEffect } from "react";
import type { ComponentType } from "react";
import {
  ArrowRight,
  BarChart3,
  Circle,
  Diamond,
  Eraser,
  Feather,
  Hand,
  ImagePlus,
  List,
  Minus,
  MousePointer2,
  Pencil,
  Smile,
  Square,
  StickyNote,
  Type,
} from "lucide-react";
import { CanvasTool, InsertOptions } from "./canvas/types";
import ToolPicker from "@/components/board/ToolPicker";

type ToolItem = {
  tool: CanvasTool;
  label: string;
  key: string;
  icon: ComponentType<{ className?: string }>;
};

const GROUPS: ToolItem[][] = [
  [
    { tool: "select", label: "Select", key: "V", icon: MousePointer2 },
    { tool: "hand", label: "Pan", key: "H", icon: Hand },
  ],
  [
    { tool: "text", label: "Text", key: "T", icon: Type },
    { tool: "handwriting", label: "Handwriting", key: "G", icon: Feather },
    { tool: "sticky", label: "Sticky note", key: "S", icon: StickyNote },
    { tool: "bullet", label: "Bullet list", key: "B", icon: List },
  ],
  [
    { tool: "rectangle", label: "Rectangle", key: "R", icon: Square },
    { tool: "circle", label: "Ellipse", key: "O", icon: Circle },
    { tool: "diamond", label: "Diamond", key: "D", icon: Diamond },
    { tool: "line", label: "Line", key: "L", icon: Minus },
    { tool: "arrow", label: "Arrow", key: "A", icon: ArrowRight },
  ],
  [
    { tool: "pen", label: "Draw", key: "P", icon: Pencil },
    { tool: "eraser", label: "Eraser", key: "E", icon: Eraser },
  ],
  [
    { tool: "emoji", label: "Emoji", key: "M", icon: Smile },
    { tool: "image", label: "Image", key: "I", icon: ImagePlus },
    { tool: "chart", label: "Chart", key: "C", icon: BarChart3 },
  ],
];

const SHORTCUTS: Record<string, CanvasTool> = Object.fromEntries(
  GROUPS.flat().map((t) => [t.key.toLowerCase(), t.tool]),
);

type BoardToolbarProps = {
  activeTool: CanvasTool;
  onChange: (tool: CanvasTool) => void;
  options: InsertOptions;
  onOptionsChange: (options: InsertOptions) => void;
};

const BoardToolbar = ({
  activeTool,
  onChange,
  options,
  onOptionsChange,
}: BoardToolbarProps) => {
  /* single-key shortcuts (typing korar shomoy ignore) */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA") return;
      const tool = SHORTCUTS[e.key.toLowerCase()];
      if (tool) onChange(tool);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onChange]);

  return (
    <aside
      aria-label="Tools"
      className="absolute left-4 top-1/2 z-50 -translate-y-1/2"
    >
      <div className="flex max-h-[calc(100dvh-2rem)] flex-col gap-1 overflow-y-auto rounded-2xl border border-[#262626] bg-[#121212]/95 p-1.5 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {GROUPS.map((group, gi) => (
          <div key={gi} className="flex flex-col gap-1">
            {gi > 0 && <div className="my-0.5 h-px bg-[#262626]" />}
            {group.map(({ tool, label, key, icon: Icon }) => {
              const active = activeTool === tool;
              return (
                <button
                  key={tool}
                  type="button"
                  title={`${label} (${key})`}
                  aria-label={`${label} (${key})`}
                  aria-pressed={active}
                  onClick={() => onChange(tool)}
                  className={`grid size-9 shrink-0 place-items-center rounded-xl transition-colors duration-150 ${
                    active
                      ? "bg-[#ededed] text-[#0a0a0a]"
                      : "text-[#9a9a9a] hover:bg-[#1c1c1c] hover:text-[#ededed]"
                  }`}
                >
                  <Icon className="size-[18px]" />
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <ToolPicker
        tool={activeTool}
        options={options}
        onChange={onOptionsChange}
      />
    </aside>
  );
};

export default BoardToolbar;
