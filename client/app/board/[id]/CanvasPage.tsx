"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, PenLine } from "lucide-react";
import { toast } from "sonner";

import { useBoard, useUpdateBoard } from "@/hooks/useBoards";
import { useBoardSocket } from "@/hooks/useBoardSocket";
import { useBoardBackground } from "@/hooks/useBoardBackground";
import type { BoardElement } from "@/lib/api/board.api";

import BoardCanvas, {
  type CanvasTool,
  type CanvasHistoryRef,
  type CanvasExportRef,
} from "@/components/board/BoardCanvas";

import BoardToolbar from "../BoardToolbar";

import type { InsertOptions } from "../canvas/types";
import BoardTopBar, { type ExportKind } from "@/components/board/BoardTopBar";

type RemoteElementsRef = {
  applyRemoteCreate: (element: BoardElement) => void;
  applyRemoteUpdate: (element: BoardElement) => void;
  applyRemoteDelete: (id: string) => void;
  applyRemoteLive: (element: BoardElement) => void;
};

const ZOOM_ANIMATION_MS = 180;

const CanvasPage = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const boardId = params.id;

  const [activeTool, setActiveTool] = useState<CanvasTool>("select");
  const [options, setOptions] = useState<InsertOptions>({
    emoji: "😀",
    chartType: "bar",
  });

  /* smooth zoom: zoomTarget = what the user asked for, zoom = animated value */
  const [zoomTarget, setZoomTarget] = useState<number>(100);
  const [zoom, setZoom] = useState<number>(100);
  const zoomRef = useRef<number>(100);

  useEffect(() => {
    const from = zoomRef.current;
    if (from === zoomTarget) return;

    const start = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ZOOM_ANIMATION_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      const value = from + (zoomTarget - from) * eased;
      zoomRef.current = value;
      setZoom(value);
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [zoomTarget]);

  /* background (remembered per board) */
  const { background, setBackground } = useBoardBackground(boardId);

  /* undo / redo bridge */
  const historyRef = useRef<CanvasHistoryRef | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const onHistoryChange = useCallback(
    (s: { canUndo: boolean; canRedo: boolean }) => {
      setCanUndo(s.canUndo);
      setCanRedo(s.canRedo);
    },
    [],
  );

  const remoteElementsRef = useRef<RemoteElementsRef | null>(null);
  const exportRef = useRef<CanvasExportRef | null>(null);

  const { data, isPending, isError, refetch } = useBoard(boardId);

  /* Title update */
  const updateBoard = useUpdateBoard();
  const handleTitleChange = (next: string) => {
    if (!data?.board) return;
    if (next === data.board.title) return;
    updateBoard.mutate({ boardId, payload: { title: next } });
  };

  const { getSocketId, emitElementLive } = useBoardSocket({
    boardId,
    onElementCreated: (el) => remoteElementsRef.current?.applyRemoteCreate(el),
    onElementUpdated: (el) => remoteElementsRef.current?.applyRemoteUpdate(el),
    onElementDeleted: (id) => remoteElementsRef.current?.applyRemoteDelete(id),
    onElementLive: (el) => remoteElementsRef.current?.applyRemoteLive(el),
  });

  const handleExport = async (kind: ExportKind) => {
    const api = exportRef.current;
    if (!api) return;
    try {
      const ok = await api.exportAs(kind, data?.board?.title ?? "board");
      if (!ok) toast.info("Nothing to export yet");
    } catch {
      toast.error(`Could not export ${kind.toUpperCase()}`);
    }
  };

  const elements: BoardElement[] = data?.elements ?? [];

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

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#0a0a0a] font-display antialiased">
      <BoardCanvas
        boardId={boardId}
        elements={elements}
        zoom={zoom}
        activeTool={activeTool}
        options={options}
        background={background}
        onToolChange={setActiveTool}
        getSocketId={getSocketId}
        emitElementLive={emitElementLive}
        remoteElementsRef={remoteElementsRef}
        historyRef={historyRef}
        exportRef={exportRef}
        onHistoryChange={onHistoryChange}
      />

      <BoardTopBar
        title={data.board.title ?? "Untitled board"}
        onTitleChange={handleTitleChange}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={() => historyRef.current?.undo()}
        onRedo={() => historyRef.current?.redo()}
        zoom={zoomTarget}
        onZoomChange={setZoomTarget}
        background={background}
        onBackground={setBackground}
        onAI={() => toast.info("AI assistant coming soon")}
        onExport={(kind: ExportKind) => void handleExport(kind)}
        onShare={() => toast.info("Share coming soon")}
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
