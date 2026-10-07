"use client";

import { useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, PenLine, Plus } from "lucide-react";
import { gsap, useMotion } from "@/lib/gsap";


import { boardId, useBoards, useCreateBoard } from "@/hooks/useBoards";
import Container from "@/components/common/Container";
import { btnGhost, btnPrimary } from "@/components/common/Ui";

const dots =
  "bg-[radial-gradient(var(--hb-dot)_1.4px,transparent_1.4px)] bg-[size:24px_24px]";

const formatDate = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

const Dashboard = () => {
  const root = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { data: boards, isPending, isError, refetch } = useBoards();
  const createBoard = useCreateBoard();

  const onCreate = async () => {
    const board = await createBoard.mutateAsync("Untitled board");
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
            New board
          </button>
        </Container>
      </header>

      <main>
        <Container className="py-10 sm:py-14">
          <h1 className="text-[clamp(1.9rem,4vw,2.75rem)] font-extrabold leading-[1.04] tracking-[-0.03em]">
            Your boards
          </h1>
          <p className="mt-2 max-w-[52ch] text-hb-muted sm:text-lg">
            Pick up where you left off, or start a fresh canvas.
          </p>

          {isError ? (
            <div className="mt-10 rounded-3xl border border-hb-line bg-hb-surface p-8 text-center">
              <p className="font-semibold">Could not load your boards.</p>
              <button
                type="button"
                onClick={() => refetch()}
                className={`${btnGhost} mt-4`}
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
                    className="h-56 animate-pulse rounded-3xl border border-hb-line bg-hb-surface"
                  />
                ))
              ) : (
                <>
                  <li className="board-card">
                    <button
                      type="button"
                      onClick={onCreate}
                      disabled={creating}
                      className="group flex h-56 w-full flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-hb-line bg-hb-surface text-hb-muted transition-[translate,border-color,color] duration-200 hover:-translate-y-1 hover:border-hb-ink hover:text-hb-ink disabled:opacity-60"
                    >
                      <span className="grid size-11 place-items-center rounded-full bg-hb-brand-soft">
                        {creating ? (
                          <Loader2 className="size-5 animate-spin" />
                        ) : (
                          <Plus className="size-5" />
                        )}
                      </span>
                      <span className="font-semibold">Blank board</span>
                    </button>
                  </li>

                  {boards?.map((b) => (
                    <li key={boardId(b)} className="board-card">
                      <Link
                        href={`/board/${boardId(b)}`}
                        className="group flex h-56 flex-col overflow-hidden rounded-3xl border border-hb-line bg-hb-surface transition-[translate,border-color,box-shadow] duration-200 hover:-translate-y-1 hover:border-hb-ink hover:shadow-[0_14px_28px_-18px_rgba(0,0,0,0.45)]"
                      >
                        <div
                          className={`grid flex-1 place-items-center border-b border-hb-line bg-hb-bg ${dots}`}
                        >
                          <PenLine className="size-8 text-hb-line transition-colors group-hover:text-hb-muted" />
                        </div>
                        <div className="px-4 py-3">
                          <h2 className="truncate font-bold">
                            {b.title || "Untitled board"}
                          </h2>
                          {b.updatedAt && (
                            <p className="mt-0.5 text-sm text-hb-muted">
                              Edited {formatDate(b.updatedAt)}
                            </p>
                          )}
                        </div>
                      </Link>
                    </li>
                  ))}
                </>
              )}
            </ul>
          )}
        </Container>
      </main>
    </div>
  );
};

export default Dashboard;
