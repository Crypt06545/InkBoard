"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  Minus,
  Plus,
  Redo2,
  Share2,
  Sparkles,
  Undo2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import BoardBackgroundMenu from "@/components/board/BoardBackgroundMenu";
import type { BoardBackground } from "@/hooks/useBoardBackground";

export type ExportKind = "png" | "svg";

type Props = {
  title: string;
  onTitleChange: (value: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  zoom: number;
  onZoomChange: (value: number) => void;
  onAI?: () => void;
  onExport?: (kind: ExportKind) => void;
  onShare?: () => void;
  onBackground?: (bg: BoardBackground) => void;
  background?: BoardBackground;
};

const ZOOM_MIN = 15;
const ZOOM_MAX = 500;
const ZOOM_STEP = 10;

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

const iconBtn =
  "grid size-9 shrink-0 place-items-center rounded-xl text-[#9a9a9a] transition-colors hover:bg-[#262626] hover:text-[#ededed] disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#9a9a9a]";

const pillBtn =
  "flex h-9 shrink-0 items-center gap-2 rounded-full border border-[#262626] bg-[#121212] px-3 text-sm font-medium text-[#ededed] transition-colors hover:bg-[#262626] sm:px-4";

const zoomBtn =
  "grid size-7 place-items-center rounded-full text-[#9a9a9a] transition-colors hover:bg-[#262626] hover:text-[#ededed]";

const divider = "mx-1 hidden h-6 w-px shrink-0 bg-[#262626] sm:block";

const menuContent =
  "rounded-xl border border-[#262626] bg-[#121212] p-1.5 text-[#ededed] shadow-xl ring-1 ring-[#262626]";

const menuItem =
  "flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-[#ededed] outline-none transition-colors hover:bg-[#262626] focus:bg-[#262626] focus:text-[#ededed] data-[highlighted]:bg-[#262626] data-[highlighted]:text-[#ededed]";

const BoardTopBar = ({
  title,
  onTitleChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  zoom,
  onZoomChange,
  onAI,
  onExport,
  onShare,
  onBackground,
  background = "dots",
}: Props) => {
  const router = useRouter();
  const [draft, setDraft] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(title);
  }, [title]);

  const commitTitle = () => {
    const next = draft.trim();
    if (!next) {
      setDraft(title);
      return;
    }
    if (next !== title) onTitleChange(next);
  };

  const stepZoom = (dir: 1 | -1) => {
    const next = clamp(
      dir > 0 ? zoom + ZOOM_STEP : zoom - ZOOM_STEP,
      ZOOM_MIN,
      ZOOM_MAX,
    );
    onZoomChange(next);
  };

  const resetZoom = () => onZoomChange(100);

  return (
    <header className="pointer-events-auto absolute inset-x-0 top-0 z-40 flex h-14 items-center gap-1.5 border-b border-[#262626] bg-[#0a0a0a] px-3 sm:gap-2 sm:px-4">
      {/* LEFT: back + title */}
      <button
        type="button"
        aria-label="Back to dashboard"
        onClick={() => router.push("/dashboard")}
        className={iconBtn}
      >
        <ArrowLeft className="size-[18px]" />
      </button>

      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commitTitle}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            inputRef.current?.blur();
          }
          if (e.key === "Escape") {
            setDraft(title);
            inputRef.current?.blur();
          }
        }}
        spellCheck={false}
        className="h-9 w-24 min-w-0 shrink rounded-xl border border-transparent bg-transparent px-2.5 text-[15px] font-medium text-[#ededed] outline-none transition-colors hover:border-[#262626] focus:border-[#262626] focus:bg-[#121212] sm:w-56"
      />

      <span className={divider} />

      {/* Undo / Redo */}
      <button
        type="button"
        aria-label="Undo"
        disabled={!canUndo}
        onClick={onUndo}
        className={iconBtn}
        title="⌘Z"
      >
        <Undo2 className="size-[18px]" />
      </button>
      <button
        type="button"
        aria-label="Redo"
        disabled={!canRedo}
        onClick={onRedo}
        className={iconBtn}
        title="⇧⌘Z"
      >
        <Redo2 className="size-[18px]" />
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Background */}
      <BoardBackgroundMenu
        value={background}
        onChange={(bg) => onBackground?.(bg)}
      />

      <span className={divider} />

      {/* Zoom pill */}
      <div className="flex h-9 shrink-0 items-center gap-0.5 rounded-full border border-[#262626] bg-[#121212] px-1">
        <button
          type="button"
          aria-label="Zoom out"
          onClick={() => stepZoom(-1)}
          className={zoomBtn}
        >
          <Minus className="size-4" />
        </button>
        <button
          type="button"
          onClick={resetZoom}
          className="min-w-[2.75rem] rounded-full px-1 text-center text-[13px] font-medium tabular-nums text-[#ededed] transition-colors hover:text-[#fafafa] sm:min-w-[3.25rem]"
          title="Reset zoom"
        >
          {Math.round(zoom)}%
        </button>
        <button
          type="button"
          aria-label="Zoom in"
          onClick={() => stepZoom(1)}
          className={zoomBtn}
        >
          <Plus className="size-4" />
        </button>
      </div>

      {/* AI */}
      <button type="button" onClick={onAI} aria-label="AI" className={pillBtn}>
        <Sparkles className="size-4" />
        <span className="hidden sm:inline">AI</span>
      </button>

      {/* Export */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button type="button" aria-label="Export" className={pillBtn}>
              <Download className="size-4" />
              <span className="hidden sm:inline">Export</span>
              <svg
                viewBox="0 0 20 20"
                className="hidden size-3.5 opacity-70 sm:block"
                aria-hidden="true"
              >
                <path
                  d="M5 7l5 6 5-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          }
        />
        <DropdownMenuContent align="end" className={`w-44 ${menuContent}`}>
          <DropdownMenuItem
            onClick={() => onExport?.("png")}
            className={menuItem}
          >
            Download PNG
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onExport?.("svg")}
            className={menuItem}
          >
            Download SVG
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Share */}
      <button
        type="button"
        onClick={onShare}
        aria-label="Share"
        className="flex h-9 shrink-0 items-center gap-2 rounded-full bg-[#fafafa] px-3 text-sm font-semibold text-[#0a0a0a] transition-opacity hover:opacity-90 sm:ml-1 sm:px-5"
      >
        <Share2 className="size-4" />
        <span className="hidden sm:inline">Share</span>
      </button>
    </header>
  );
};

export default BoardTopBar;
