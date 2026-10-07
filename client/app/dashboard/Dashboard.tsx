"use client";

import { useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, PenLine, Plus } from "lucide-react";
import { toast } from "sonner";
import { gsap, useMotion } from "@/lib/gsap";

import { boardId, useBoards, useCreateBoard } from "@/hooks/useBoards";
import Container from "@/components/common/Container";
import { btnPrimary } from "@/components/common/Ui";
import BoardCard, { type BoardMenuAction } from "@/components/board/BoardCard";
import type { ThumbBoard } from "@/components/board/BoardThumbnail";

const Dashboard = () => {
  const root = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { data: boards, isPending, isError, refetch } = useBoards();
  const createBoard = useCreateBoard();

  const onCreate = async () => {
    const board = await createBoard.mutateAsync({ title: "Untitled board" });
    router.push(`/board/${boardId(board)}`);
  };

  useMotion(root, () => {
    if (isPending) return;
    gsap.from(".board-card", {
      y: 20,
      opacity: 0,
      duration: 0.5,
      stagger: 0.06,
      ease: "power3.out",
    });
  }, [isPending]);

  const creating = createBoard.isPending;
  const count = boards?.length ?? 0;

  // Placeholder dispatcher — rename / duplicate / delete pore wire korbo.
  const onMenuAction = (action: BoardMenuAction, board: ThumbBoard) => {
    if (action === "open") {
      router.push(`/board/${boardId(board)}`);
      return;
    }
    toast.info(`${action} — coming soon`);
  };

  return (
    <div
      ref={root}
      className="home min-h-screen bg-hb-bg font-display text-hb-ink antialiased"
    >
      <header className="sticky top-0 z-40 border-b border-hb-line bg-hb-bg/85 backdrop-blur-xl">
        <Container className="flex h-16 items-center justify-between">
          <Link
            href="/"
            aria-label="Inkboard home"
            className="flex items-center gap-2.5 text-xl font-extrabold tracking-tight"
          >
            <span className="grid size-8 place-items-center rounded-[10px] bg-hb-brand text-hb-brand-ink">
              <PenLine className="size-[18px]" strokeWidth={2.4} />
            </span>
            Inkboard
          </Link>
        </Container>
      </header>

      <main>
        <Container className="py-10 sm:py-14">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-[clamp(1.9rem,4vw,2.75rem)] font-extrabold leading-[1.04] tracking-[-0.03em]">
                Your whiteboards
              </h1>
              <p className="mt-1 text-hb-muted">
                {isPending
                  ? "Loading…"
                  : `${count} ${count === 1 ? "board" : "boards"}`}
              </p>
            </div>

            <button
              type="button"
              onClick={onCreate}
              disabled={creating}
              className={`${btnPrimary} disabled:opacity-60`}
            >
              {creating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" strokeWidth={2.4} />
              )}
              New whiteboard
            </button>
          </div>

          {isError ? (
            <div className="mt-10 rounded-3xl border border-hb-line bg-hb-surface p-8 text-center">
              <p className="font-semibold">Could not load your boards.</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="mt-4 rounded-full border border-hb-line px-4 py-2 text-sm font-semibold hover:bg-hb-brand-soft"
              >
                Try again
              </button>
            </div>
          ) : (
            <ul className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {isPending ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <li
                    key={i}
                    className="h-64 animate-pulse rounded-3xl border border-hb-line bg-hb-surface"
                  />
                ))
              ) : count === 0 ? (
                <li className="col-span-full rounded-3xl border border-dashed border-hb-line bg-hb-surface p-10 text-center">
                  <p className="font-semibold">No boards yet.</p>
                  <p className="mt-1 text-sm text-hb-muted">
                    Create your first whiteboard to get started.
                  </p>
                </li>
              ) : (
                boards.map((b) => (
                  <li key={boardId(b)} className="board-card">
                    <BoardCard board={b} onMenuAction={onMenuAction} />
                  </li>
                ))
              )}
            </ul>
          )}
        </Container>
      </main>
    </div>
  );
};

export default Dashboard;
