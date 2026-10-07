"use client";

import Link from "next/link";
import {
  Copy,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { boardId, useBoard } from "@/hooks/useBoards";
import BoardThumbnail, { type ThumbBoard } from "./BoardThumbnail";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type BoardMenuAction = "open" | "rename" | "duplicate" | "delete";

type Props = {
  board: ThumbBoard;
  onMenuAction?: (action: BoardMenuAction, board: ThumbBoard) => void;
};

function timeAgo(iso?: string): string {
  if (!iso) return "";
  const secs = Math.max(
    1,
    Math.round((Date.now() - new Date(iso).getTime()) / 1000),
  );
  if (secs < 60) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const wks = Math.round(days / 7);
  if (wks < 5) return `${wks}w ago`;
  const mos = Math.round(days / 30);
  if (mos < 12) return `${mos}mo ago`;
  return `${Math.round(days / 365)}y ago`;
}

export default function BoardCard({ board, onMenuAction }: Props) {
  const id = boardId(board);
  const title = board.title || "Untitled board";
  const ago = timeAgo(board.updatedAt);

  // Fetch this board's elements for the preview (only if the list didn't include them).
  const needFetch = !board.elements && !board.thumbnail;
  const { data, isPending } = useBoard(needFetch ? id : "");

  const elements = board.elements ?? data?.elements ?? [];
  const count = board.elementCount ?? elements.length;

  return (
    <div className="group relative flex h-64 flex-col overflow-hidden rounded-3xl border border-hb-line bg-hb-surface transition-[translate,border-color,box-shadow] duration-200 hover:-translate-y-1 hover:border-hb-ink hover:shadow-[0_14px_28px_-18px_rgba(0,0,0,0.45)]">
      <Link
        href={`/board/${id}`}
        aria-label={title}
        className="flex flex-1 flex-col"
      >
        <div className="relative flex-1 overflow-hidden border-b border-hb-line">
          <BoardThumbnail
            board={board}
            elements={elements}
            loading={needFetch && isPending}
          />
        </div>

        <div className="px-4 py-3">
          <h2 className="truncate font-bold">{title}</h2>
          <div className="mt-0.5 flex items-center justify-between text-sm text-hb-muted">
            <span>
              {count} {count === 1 ? "item" : "items"}
            </span>
            <span>{ago}</span>
          </div>
        </div>
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              aria-label="Board menu"
              className="absolute right-2.5 top-2.5 z-10 grid size-8 place-items-center rounded-full bg-hb-surface/85 text-hb-muted opacity-0 backdrop-blur transition-opacity duration-150 hover:bg-hb-surface hover:text-hb-ink focus:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
            >
              <MoreHorizontal className="size-4" />
            </button>
          }
        />
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={() => onMenuAction?.("open", board)}>
            <ExternalLink className="mr-2 size-4" /> Open
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onMenuAction?.("rename", board)}>
            <Pencil className="mr-2 size-4" /> Rename
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onMenuAction?.("duplicate", board)}>
            <Copy className="mr-2 size-4" /> Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => onMenuAction?.("delete", board)}
          >
            <Trash2 className="mr-2 size-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
