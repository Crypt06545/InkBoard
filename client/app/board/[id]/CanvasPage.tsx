"use client";

import { useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, PenLine } from "lucide-react";

import { useBoard } from "@/hooks/useBoards";
import { useBoardSocket } from "@/hooks/useBoardSocket";
import type { BoardElement } from "@/lib/api/board.api";

import BoardCanvas, { type CanvasTool } from "@/components/board/BoardCanvas";

import BoardToolbar from "../BoardToolbar";
import type { InsertOptions } from "../canvas/types";

type RemoteElementsRef = {
  applyRemoteCreate: (element: BoardElement) => void;
  applyRemoteUpdate: (element: BoardElement) => void;
  applyRemoteDelete: (id: string) => void;
  applyRemoteLive: (element: BoardElement) => void;
};

const CanvasPage = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const boardId = params.id;

  const [activeTool, setActiveTool] = useState<CanvasTool>("select");

  const [options, setOptions] = useState<InsertOptions>({
    emoji: "😀",
    chartType: "bar",
  });

  const [zoom] = useState<number>(100);

  /* BoardCanvas এখানে নিজের remote handlers register করবে */
  const remoteElementsRef = useRef<RemoteElementsRef | null>(null);

  /* REST — initial board data */
  const { data, isPending, isError, refetch } = useBoard(boardId);

  /* ✅ Socket — এটাই আগে missing ছিল
     hook টা socket connect করে, wb:join emit করে,
     element:created/updated/deleted/live শোনে,
     পেলে remoteElementsRef.current এর handler call করে */
  const { getSocketId, emitElementLive } = useBoardSocket({
    boardId,
    onElementCreated: (el) => remoteElementsRef.current?.applyRemoteCreate(el),
    onElementUpdated: (el) => remoteElementsRef.current?.applyRemoteUpdate(el),
    onElementDeleted: (id) => remoteElementsRef.current?.applyRemoteDelete(id),
    onElementLive: (el) => remoteElementsRef.current?.applyRemoteLive(el),
  });

  const elements: BoardElement[] = data?.elements ?? [];

  /* ❌ পুরনো placeholder দুটো এখান থেকে DELETED:
     const getSocketId = () => null;
     const emitElementLive = (el) => { void el; }
     — এখন hook থেকে আসছে */

  /* Loading */
  if (isPending) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[#0a0a0a] font-display text-[#ededed]">
        <div className="flex flex-col items-center">
          <div className="grid size-12 place-items-center rounded-2xl bg-[#fafafa] text-[#0a0a0a]">
            <PenLine className="size-5" />
          </div>

          <div className="mt-4 flex items-center gap-2 text-sm text-[#9a9a9a]">
            <Loader2 className="size-4 animate-spin" />
            Opening your canvas...
          </div>
        </div>
      </div>
    );
  }

  /* Error */
  if (isError || !data?.board) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[#0a0a0a] px-6 font-display text-[#ededed]">
        <div className="w-full max-w-md rounded-3xl border border-[#262626] bg-[#121212] p-8 text-center">
          <h1 className="text-xl font-bold tracking-[-0.02em]">
            Could not open this board
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#9a9a9a]">
            This board may have been removed, or you may not have permission to
            access it.
          </p>

          <div className="mt-6 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="h-10 rounded-xl px-4 text-sm font-medium text-[#9a9a9a] transition-colors hover:text-[#ededed]"
            >
              Back to boards
            </button>

            <button
              type="button"
              onClick={() => void refetch()}
              className="h-10 rounded-xl bg-[#fafafa] px-4 text-sm font-semibold text-[#0a0a0a] transition-opacity hover:opacity-90"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* Canvas */
  return (
    <div className="fixed inset-0 overflow-hidden bg-[#0a0a0a] font-display antialiased">
      <BoardCanvas
        boardId={boardId}
        elements={elements}
        zoom={zoom}
        activeTool={activeTool}
        options={options}
        onToolChange={setActiveTool}
        getSocketId={getSocketId} /* ✅ hook থেকে */
        emitElementLive={emitElementLive} /* ✅ hook থেকে */
        remoteElementsRef={remoteElementsRef}
      />

      <BoardToolbar
        activeTool={activeTool}
        onChange={setActiveTool}
        options={options}
        onOptionsChange={setOptions}
      />
    </div>
  );
};

export default CanvasPage;
