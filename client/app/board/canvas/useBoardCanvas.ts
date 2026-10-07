"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { BoardElement } from "@/lib/api/board.api";
import { boardApi } from "@/lib/api/board.api";
import { toast } from "sonner";
import {
  C,
  DEFAULT_CHART_DATA,
  DEFAULT_HEIGHT,
  DEFAULT_WIDTH,
  MIN_SIZE,
  NOTE_COLORS,
} from "./constants";

import type {
  CanvasTool,
  ElementHandlers,
  InsertOptions,
  LineDraft,
  Marquee,
  NewElement,
  Point,
  ResizeHandle,
} from "./types";
import { buildTransform, isEditableType } from "./utils";
import { applyStyle, getStyleSpec, type StyleKind } from "./styleSpec";

type Args = {
  boardId: string;
  elements: BoardElement[];
  zoom: number;
  activeTool: CanvasTool;
  options: InsertOptions;
  onToolChange: (tool: CanvasTool) => void;
  getSocketId: () => string | null;
  emitElementLive: (element: BoardElement) => void;
};

type DragItem = {
  id: string;
  node: SVGGElement | null;
  originalX: number;
  originalY: number;
  rotation: number;
  width: number;
  height: number;
};

type DragState = {
  items: DragItem[];
  startX: number;
  startY: number;
  dx: number;
  dy: number;
  moved: boolean;
};

type ResizeState = {
  elementId: string;
  handle: ResizeHandle;
  startX: number;
  startY: number;
  originalX: number;
  originalY: number;
  originalWidth: number;
  originalHeight: number;
  keepRatio: boolean;
};

type RotateState = {
  elementId: string;
  centerX: number;
  centerY: number;
  startAngle: number;
  originalRotation: number;
};

type PanState = {
  startClientX: number;
  startClientY: number;
  originalOffsetX: number;
  originalOffsetY: number;
};

/* ---- flat data shape helpers ---- */
const getX = (el: BoardElement) => el.data?.x ?? 0;
const getY = (el: BoardElement) => el.data?.y ?? 0;
const getW = (el: BoardElement) => el.data?.w ?? DEFAULT_WIDTH;
const getH = (el: BoardElement) => el.data?.h ?? DEFAULT_HEIGHT;

/* ---- history helpers ---- */
const cloneElement = (el: BoardElement): BoardElement => ({
  ...el,
  data: { ...el.data },
});
const cloneList = (list: BoardElement[]): BoardElement[] =>
  list.map(cloneElement);

const MAX_HISTORY = 80;

export const useBoardCanvas = ({
  boardId,
  elements,
  zoom,
  activeTool,
  options,
  onToolChange,
  getSocketId,
  emitElementLive,
}: Args) => {
  /* ---------- DOM refs ---------- */
  const svgRef = useRef<SVGSVGElement>(null);
  const worldRef = useRef<SVGGElement>(null);
  const patternRef = useRef<SVGPatternElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  /* ---------- latest-value refs ---------- */
  const toolRef = useRef(activeTool);
  const zoomRef = useRef(zoom);
  const optionsRef = useRef(options);
  const onToolChangeRef = useRef(onToolChange);
  const boardIdRef = useRef(boardId);

  /* ---------- gesture refs ---------- */
  const offsetRef = useRef({ x: 0, y: 0 });
  const rectRef = useRef<DOMRect | null>(null);
  const imagePosRef = useRef<{ x: number; y: number } | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const resizeRef = useRef<ResizeState | null>(null);
  const rotateRef = useRef<RotateState | null>(null);
  const panRef = useRef<PanState | null>(null);
  const penRef = useRef<Point[] | null>(null);
  const lineRef = useRef<LineDraft | null>(null);
  const marqueeRef = useRef<Marquee | null>(null);
  const noteCount = useRef(0);

  /* ---------- state ---------- */
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [draft, setDraft] = useState<Point[]>([]);
  const [lineDraft, setLineDraft] = useState<LineDraft | null>(null);
  const [marquee, setMarquee] = useState<Marquee | null>(null);
  const [localElements, setLocalElements] = useState<BoardElement[]>(elements);

  const selectedIdsRef = useRef<string[]>(selectedIds);
  const localElementsRef = useRef<BoardElement[]>(localElements);

  useEffect(() => {
    toolRef.current = activeTool;
    zoomRef.current = zoom;
    optionsRef.current = options;
    onToolChangeRef.current = onToolChange;
    selectedIdsRef.current = selectedIds;
    localElementsRef.current = localElements;
    boardIdRef.current = boardId;
  });

  useEffect(() => {
    setLocalElements(elements);
  }, [elements]);

  useEffect(() => {
    setEditingId(null);
    if (activeTool !== "select") setSelectedIds([]);
  }, [activeTool]);

  /* ---------- undo / redo system ---------- */
  const historyRef = useRef<BoardElement[][]>([]);
  const futureRef = useRef<BoardElement[][]>([]);
  const gestureSnapshotRef = useRef<BoardElement[] | null>(null);
  const [, setHistoryTick] = useState(0);
  const bump = useCallback(() => setHistoryTick((t) => t + 1), []);

  /** Call before any state mutation that should be undoable. */
  const beginHistory = useCallback(() => {
    if (!gestureSnapshotRef.current) {
      gestureSnapshotRef.current = cloneList(localElementsRef.current);
    }
  }, []);

  /** Call after the mutation; pushes the pre-mutation snapshot. */
  const commitHistory = useCallback(() => {
    const snap = gestureSnapshotRef.current;
    gestureSnapshotRef.current = null;
    if (!snap) return;
    historyRef.current.push(snap);
    if (historyRef.current.length > MAX_HISTORY) historyRef.current.shift();
    futureRef.current = [];
    bump();
  }, [bump]);

  /** Call when a gesture is cancelled (no mutation happened). */
  const cancelHistory = useCallback(() => {
    gestureSnapshotRef.current = null;
  }, []);

  /* ---------- rAF throttle ---------- */
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef<(() => void) | null>(null);

  const schedule = useCallback((fn: () => void) => {
    pendingRef.current = fn;
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const pending = pendingRef.current;
      pendingRef.current = null;
      pending?.();
    });
  }, []);

  const liveEdit = useCallback(
    (element: BoardElement, text: string) => {
      setLocalElements((current) =>
        current.map((item) =>
          item.id === element.id
            ? { ...item, data: { ...item.data, text } }
            : item,
        ),
      );
      emitElementLive({ ...element, data: { ...element.data, text } });
    },
    [emitElementLive],
  );

  const flush = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const pending = pendingRef.current;
    pendingRef.current = null;
    pending?.();
  }, []);

  useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  /* ---------- coordinates ---------- */
  const beginGesture = useCallback(() => {
    rectRef.current = svgRef.current?.getBoundingClientRect() ?? null;
  }, []);

  const getPointerPosition = useCallback((clientX: number, clientY: number) => {
    const rect = rectRef.current ?? svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: clientX, y: clientY };

    const scale = zoomRef.current / 100;
    return {
      x: (clientX - rect.left - offsetRef.current.x) / scale,
      y: (clientY - rect.top - offsetRef.current.y) / scale,
    };
  }, []);

  const applyCamera = useCallback(() => {
    const { x, y } = offsetRef.current;
    const transform = `translate(${x} ${y}) scale(${zoomRef.current / 100})`;
    worldRef.current?.setAttribute("transform", transform);
    patternRef.current?.setAttribute("patternTransform", transform);
  }, []);

  /* ======================================================
     REST Persistence
  ====================================================== */
  const persistCreate = useCallback(
    async (tempId: string, el: NewElement) => {
      try {
        const socketId = getSocketId() ?? undefined;
        const saved = await boardApi.createElement(
          boardIdRef.current,
          {
            type: el.type,
            data: {
              ...(el.style ?? {}),
              ...((el.content as object) ?? {}),
              x: el.x,
              y: el.y,
              w: el.w,
              h: el.h,
            },
          },
          socketId,
        );

        const current = localElementsRef.current.find((it) => it.id === tempId);

        setLocalElements((currentList) =>
          currentList.map((item) =>
            item.id === tempId ? { ...item, id: saved.id } : item,
          ),
        );

        if (current) {
          const localData = { ...current.data };
          const sentData = {
            ...(el.style ?? {}),
            ...((el.content as object) ?? {}),
            x: el.x,
            y: el.y,
            w: el.w,
            h: el.h,
          };
          if (JSON.stringify(localData) !== JSON.stringify(sentData)) {
            boardApi
              .updateElement(
                boardIdRef.current,
                saved.id,
                { data: localData },
                socketId,
              )
              .catch(() => {});
          }
        }
      } catch {
        toast.error("Could not save the element. Removing it.");
        setLocalElements((current) =>
          current.filter((item) => item.id !== tempId),
        );
      }
    },
    [getSocketId],
  );

  const persistUpdate = useCallback(
    (
      elementId: string,
      changes: { data?: Record<string, unknown>; z?: number },
    ) => {
      if (elementId.startsWith("local-")) return;

      const socketId = getSocketId() ?? undefined;
      boardApi
        .updateElement(boardIdRef.current, elementId, changes, socketId)
        .catch(() => toast.error("Could not save your change."));
    },
    [getSocketId],
  );

  const persistDelete = useCallback(
    (elementId: string, snapshotEl: BoardElement) => {
      if (elementId.startsWith("local-")) return;

      const socketId = getSocketId() ?? undefined;
      boardApi
        .deleteElement(boardIdRef.current, elementId, socketId)
        .catch(() => {
          toast.error("Could not delete the element.");
          setLocalElements((current) => [...current, snapshotEl]);
        });
    },
    [getSocketId],
  );

  /* ---------- persist delta (for undo/redo) ---------- */
  const persistDelta = useCallback(
    (from: BoardElement[], to: BoardElement[]) => {
      const fromMap = new Map(from.map((el) => [el.id, el]));
      const toMap = new Map(to.map((el) => [el.id, el]));

      // elements in `from` but not `to` → deleted on server
      // (covers: undo of a create; redo of a delete — but delete undo will
      //  leave the element local-only; refresh loses it — acceptable)
      for (const el of from) {
        if (!toMap.has(el.id) && !el.id.startsWith("local-")) {
          persistDelete(el.id, el);
        }
      }

      // elements in both → compare data
      for (const el of to) {
        const prev = fromMap.get(el.id);
        if (!prev) continue;
        if (JSON.stringify(prev.data) !== JSON.stringify(el.data)) {
          persistUpdate(el.id, { data: { ...el.data } });
        }
      }
    },
    [persistDelete, persistUpdate],
  );

  /* ---------- undo / redo ---------- */
  const undo = useCallback(() => {
    const prev = historyRef.current.pop();
    if (!prev) return;
    const current = cloneList(localElementsRef.current);
    futureRef.current.push(current);
    setLocalElements(prev);
    setSelectedIds([]);
    setEditingId(null);
    persistDelta(current, prev);
    bump();
  }, [persistDelta, bump]);

  const redo = useCallback(() => {
    const next = futureRef.current.pop();
    if (!next) return;
    const current = cloneList(localElementsRef.current);
    historyRef.current.push(current);
    setLocalElements(next);
    setSelectedIds([]);
    setEditingId(null);
    persistDelta(current, next);
    bump();
  }, [persistDelta, bump]);

  /* ---------- element helpers ---------- */
  const addElement = useCallback(
    (el: NewElement): string => {
      const id = `local-${crypto.randomUUID()}`;

      beginHistory();

      setLocalElements((current) => {
        const z =
          current.reduce((max, item) => Math.max(max, item.z ?? 0), 0) + 1;

        const created: BoardElement = {
          id,
          type: el.type,
          data: {
            x: el.x,
            y: el.y,
            w: el.w,
            h: el.h,
            ...(el.style ?? {}),
            ...((el.content as object) ?? {}),
          },
          z,
        };

        return [...current, created];
      });

      commitHistory();

      void persistCreate(id, el);
      return id;
    },
    [persistCreate, beginHistory, commitHistory],
  );

  const removeElement = useCallback(
    (id: string) => {
      const snapshotEl = localElementsRef.current.find(
        (item) => item.id === id,
      );

      beginHistory();

      setLocalElements((current) => current.filter((item) => item.id !== id));
      setSelectedIds((current) => current.filter((item) => item !== id));

      commitHistory();

      if (snapshotEl) persistDelete(id, snapshotEl);
    },
    [persistDelete, beginHistory, commitHistory],
  );

  const updateElement = useCallback(
    (id: string, updater: (element: BoardElement) => BoardElement) => {
      setLocalElements((current) =>
        current.map((item) => (item.id === id ? updater(item) : item)),
      );
    },
    [],
  );

  const commitEdit = useCallback(
    (element: BoardElement, text: string) => {
      beginHistory();

      setLocalElements((current) =>
        current.map((item) =>
          item.id === element.id
            ? { ...item, data: { ...item.data, text } }
            : item,
        ),
      );

      commitHistory();

      if (element.id.startsWith("local-")) return;

      const socketId = getSocketId() ?? undefined;
      boardApi
        .updateElement(
          boardId,
          element.id,
          { data: { ...element.data, text } },
          socketId,
        )
        .catch(() => toast.error("Could not save your change."));
    },
    [boardId, getSocketId, beginHistory, commitHistory],
  );

  const onAutoSize = useCallback(
    (id: string, height: number) => {
      setLocalElements((current) =>
        current.map((item) => {
          if (item.id !== id) return item;
          const currentHeight = item.data.h ?? DEFAULT_HEIGHT;
          if (Math.abs(currentHeight - height) < 1) return item;
          return { ...item, data: { ...item.data, h: height } };
        }),
      );

      if (id.startsWith("local-")) return;

      const el = localElementsRef.current.find((item) => item.id === id);
      if (el) {
        const socketId = getSocketId() ?? undefined;
        boardApi
          .updateElement(
            boardId,
            id,
            { data: { ...el.data, h: height } },
            socketId,
          )
          .catch(() => {});
      }
    },
    [boardId, getSocketId],
  );

  const insertImage = useCallback(
    (file: File) => {
      const pos = imagePosRef.current ?? { x: 120, y: 120 };
      const reader = new FileReader();

      reader.onload = () => {
        const url = String(reader.result);
        const img = new Image();

        img.onload = () => {
          const max = 400;
          const ratio = Math.min(1, max / Math.max(img.width, img.height));

          const id = addElement({
            type: "image",
            x: pos.x,
            y: pos.y,
            w: Math.round(img.width * ratio),
            h: Math.round(img.height * ratio),
            content: { src: url },
          });

          setSelectedIds([id]);
          onToolChangeRef.current("select");
        };

        img.src = url;
      };

      reader.readAsDataURL(file);
    },
    [addElement],
  );

  /* ---------- keyboard ---------- */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === "TEXTAREA" || target.tagName === "INPUT") return;

      const mod = event.metaKey || event.ctrlKey;

      // Undo
      if (mod && !event.shiftKey && event.key.toLowerCase() === "z") {
        event.preventDefault();
        undo();
        return;
      }
      // Redo: Cmd+Shift+Z or Cmd+Y
      if (
        (mod && event.shiftKey && event.key.toLowerCase() === "z") ||
        (mod && event.key.toLowerCase() === "y")
      ) {
        event.preventDefault();
        redo();
        return;
      }

      if (event.key === "Escape") {
        setSelectedIds([]);
        setEditingId(null);
        return;
      }

      if (
        (event.key === "Delete" || event.key === "Backspace") &&
        selectedIds.length > 0
      ) {
        event.preventDefault();
        selectedIds.forEach((id) => {
          const snapshotEl = localElementsRef.current.find(
            (item) => item.id === id,
          );
          if (snapshotEl) persistDelete(id, snapshotEl);
        });

        beginHistory();
        const ids = new Set(selectedIds);
        setLocalElements((current) =>
          current.filter((item) => !ids.has(item.id)),
        );
        setSelectedIds([]);
        commitHistory();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIds, persistDelete, undo, redo, beginHistory, commitHistory]);

  /* ---------- canvas pointer ---------- */
  const onCanvasPointerDown = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      beginGesture();
      setSelectedIds([]);
      setEditingId(null);

      const tool = toolRef.current;

      if (tool === "hand") {
        panRef.current = {
          startClientX: event.clientX,
          startClientY: event.clientY,
          originalOffsetX: offsetRef.current.x,
          originalOffsetY: offsetRef.current.y,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
        return;
      }

      const p = getPointerPosition(event.clientX, event.clientY);

      const finishCreate = (id: string, edit = false) => {
        setSelectedIds([id]);
        if (edit) setEditingId(id);
        onToolChangeRef.current("select");
      };

      switch (tool) {
        case "select": {
          marqueeRef.current = { x1: p.x, y1: p.y, x2: p.x, y2: p.y };
          event.currentTarget.setPointerCapture(event.pointerId);
          break;
        }

        case "pen": {
          penRef.current = [[p.x, p.y]];
          setDraft([[p.x, p.y]]);
          event.currentTarget.setPointerCapture(event.pointerId);
          break;
        }

        case "line":
        case "arrow": {
          lineRef.current = {
            x1: p.x,
            y1: p.y,
            x2: p.x,
            y2: p.y,
            type: tool,
          };
          event.currentTarget.setPointerCapture(event.pointerId);
          break;
        }

        case "text": {
          finishCreate(
            addElement({
              type: "text",
              x: p.x,
              y: p.y - 14,
              w: 260,
              h: 40,
              style: { fontSize: 24, color: C.ink },
              content: { text: "" },
            }),
            true,
          );
          break;
        }

        case "handwriting": {
          finishCreate(
            addElement({
              type: "handwriting",
              x: p.x,
              y: p.y - 18,
              w: 300,
              h: 48,
              style: { fontSize: 30, color: C.ink },
              content: { text: "" },
            }),
            true,
          );
          break;
        }

        case "bullet": {
          finishCreate(
            addElement({
              type: "bullet",
              x: p.x,
              y: p.y - 14,
              w: 280,
              h: 90,
              style: { fontSize: 20, color: C.ink },
              content: { text: "" },
            }),
            true,
          );
          break;
        }

        case "sticky": {
          const color = NOTE_COLORS[noteCount.current % NOTE_COLORS.length];
          noteCount.current += 1;

          finishCreate(
            addElement({
              type: "sticky",
              x: p.x - 95,
              y: p.y - 95,
              w: 190,
              h: 190,
              style: { background: color, color: C.paperInk },
              content: { text: "" },
            }),
            true,
          );
          break;
        }

        case "rectangle": {
          finishCreate(
            addElement({
              type: "shape",
              x: p.x - 80,
              y: p.y - 50,
              w: 160,
              h: 100,
              style: { shape: "rectangle", fill: C.amber, stroke: C.ink },
            }),
          );
          break;
        }

        case "circle": {
          finishCreate(
            addElement({
              type: "shape",
              x: p.x - 70,
              y: p.y - 70,
              w: 140,
              h: 140,
              style: { shape: "circle", fill: C.sky, stroke: C.ink },
            }),
          );
          break;
        }

        case "diamond": {
          finishCreate(
            addElement({
              type: "shape",
              x: p.x - 80,
              y: p.y - 60,
              w: 160,
              h: 120,
              style: { shape: "diamond", fill: C.mint, stroke: C.ink },
            }),
          );
          break;
        }

        case "emoji": {
          finishCreate(
            addElement({
              type: "emoji",
              x: p.x - 44,
              y: p.y - 44,
              w: 88,
              h: 88,
              content: { text: optionsRef.current.emoji },
            }),
          );
          break;
        }

        case "chart": {
          finishCreate(
            addElement({
              type: "chart",
              x: p.x - 180,
              y: p.y - 120,
              w: 360,
              h: 240,
              content: {
                chartType: optionsRef.current.chartType,
                data: DEFAULT_CHART_DATA,
              },
            }),
          );
          break;
        }

        case "image": {
          imagePosRef.current = { x: p.x, y: p.y };
          fileRef.current?.click();
          break;
        }

        default:
          break;
      }
    },
    [addElement, beginGesture, getPointerPosition],
  );

  const onCanvasPointerMove = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      const pan = panRef.current;

      if (pan) {
        offsetRef.current = {
          x: pan.originalOffsetX + (event.clientX - pan.startClientX),
          y: pan.originalOffsetY + (event.clientY - pan.startClientY),
        };
        schedule(applyCamera);
        return;
      }

      const marq = marqueeRef.current;

      if (marq) {
        const p = getPointerPosition(event.clientX, event.clientY);
        marq.x2 = p.x;
        marq.y2 = p.y;
        schedule(() => setMarquee({ ...marq }));
        return;
      }

      const line = lineRef.current;

      if (line) {
        const p = getPointerPosition(event.clientX, event.clientY);
        line.x2 = p.x;
        line.y2 = p.y;
        schedule(() => setLineDraft({ ...line }));
        return;
      }

      const pen = penRef.current;

      if (pen) {
        const p = getPointerPosition(event.clientX, event.clientY);
        pen.push([p.x, p.y]);
        schedule(() => setDraft([...pen]));
      }
    },
    [applyCamera, getPointerPosition, schedule],
  );

  const onCanvasPointerUp = useCallback(() => {
    flush();

    if (panRef.current) {
      panRef.current = null;
      setOffset({ ...offsetRef.current });
    }

    const marq = marqueeRef.current;
    marqueeRef.current = null;
    setMarquee(null);

    if (marq) {
      const minX = Math.min(marq.x1, marq.x2);
      const maxX = Math.max(marq.x1, marq.x2);
      const minY = Math.min(marq.y1, marq.y2);
      const maxY = Math.max(marq.y1, marq.y2);

      if (maxX - minX > 3 || maxY - minY > 3) {
        const ids = localElementsRef.current
          .filter((el) => {
            const width = getW(el);
            const height = getH(el);
            const x = getX(el);
            const y = getY(el);
            return (
              x < maxX && x + width > minX && y < maxY && y + height > minY
            );
          })
          .map((el) => el.id);

        setSelectedIds(ids);
      }
    }

    const line = lineRef.current;
    lineRef.current = null;
    setLineDraft(null);

    if (line) {
      const { x1, y1, type } = line;
      let { x2, y2 } = line;

      if (Math.hypot(x2 - x1, y2 - y1) < 6) {
        x2 = x1 + 160;
        y2 = y1;
      }

      const id = addElement({
        type,
        x: Math.min(x1, x2),
        y: Math.min(y1, y2),
        w: Math.max(1, Math.abs(x2 - x1)),
        h: Math.max(1, Math.abs(y2 - y1)),
        style: {
          stroke: C.ink,
          strokeWidth: 3,
          flipX: x2 < x1,
          flipY: y2 < y1,
        },
      });

      setSelectedIds([id]);
      onToolChangeRef.current("select");
    }

    const pen = penRef.current;
    penRef.current = null;
    setDraft([]);

    if (pen && pen.length > 1) {
      const xs = pen.map((point) => point[0]);
      const ys = pen.map((point) => point[1]);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);

      addElement({
        type: "draw",
        x: minX,
        y: minY,
        w: Math.max(8, Math.max(...xs) - minX),
        h: Math.max(8, Math.max(...ys) - minY),
        style: { stroke: C.ink, strokeWidth: 4 },
        content: { points: pen.map(([x, y]) => [x - minX, y - minY]) },
      });
    }
  }, [addElement, flush]);

  /* ---------- element drag ---------- */
  const onElementPointerDown = useCallback(
    (event: ReactPointerEvent<SVGGElement>, element: BoardElement) => {
      const tool = toolRef.current;

      if (tool === "eraser") {
        event.stopPropagation();
        removeElement(element.id);
        return;
      }

      if (tool !== "select") return;

      event.stopPropagation();
      beginGesture();

      if (event.shiftKey) {
        setSelectedIds((current) =>
          current.includes(element.id)
            ? current.filter((id) => id !== element.id)
            : [...current, element.id],
        );
        return;
      }

      let ids = selectedIdsRef.current;
      if (!ids.includes(element.id)) {
        ids = [element.id];
        setSelectedIds(ids);
      }

      const pointer = getPointerPosition(event.clientX, event.clientY);
      const items: DragItem[] = [];

      ids.forEach((id) => {
        const el = localElementsRef.current.find((item) => item.id === id);
        if (!el) return;

        items.push({
          id,
          node:
            worldRef.current?.querySelector<SVGGElement>(
              `[data-element-id="${CSS.escape(id)}"]`,
            ) ?? null,
          originalX: getX(el),
          originalY: getY(el),
          rotation: (el.data.rotation as number) ?? 0,
          width: getW(el),
          height: getH(el),
        });
      });

      dragRef.current = {
        items,
        startX: pointer.x,
        startY: pointer.y,
        dx: 0,
        dy: 0,
        moved: false,
      };

      beginHistory();
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [beginGesture, getPointerPosition, removeElement, beginHistory],
  );

  const onElementPointerMove = useCallback(
    (event: ReactPointerEvent<SVGGElement>) => {
      const drag = dragRef.current;
      if (!drag) return;

      const pointer = getPointerPosition(event.clientX, event.clientY);
      drag.dx = pointer.x - drag.startX;
      drag.dy = pointer.y - drag.startY;
      drag.moved = true;

      schedule(() => {
        drag.items.forEach((item) => {
          item.node?.setAttribute(
            "transform",
            buildTransform(
              item.originalX + drag.dx,
              item.originalY + drag.dy,
              item.rotation,
              item.width,
              item.height,
            ),
          );
        });

        if (drag.items.length === 1) {
          const item = drag.items[0];
          const el = localElementsRef.current.find((e) => e.id === item.id);
          if (el) {
            emitElementLive({
              ...el,
              data: {
                ...el.data,
                x: item.originalX + drag.dx,
                y: item.originalY + drag.dy,
              },
            });
          }
        }
      });
    },
    [getPointerPosition, schedule, emitElementLive],
  );

  const onElementPointerUp = useCallback(() => {
    const drag = dragRef.current;
    dragRef.current = null;
    flush();

    if (drag?.moved) {
      const moved = new Map(drag.items.map((item) => [item.id, item]));

      setLocalElements((current) =>
        current.map((element) => {
          const item = moved.get(element.id);
          if (!item) return element;

          return {
            ...element,
            data: {
              ...element.data,
              x: item.originalX + drag.dx,
              y: item.originalY + drag.dy,
            },
          };
        }),
      );

      commitHistory();

      drag.items.forEach((item) => {
        const el = localElementsRef.current.find((e) => e.id === item.id);
        if (!el) return;

        persistUpdate(item.id, {
          data: {
            ...el.data,
            x: item.originalX + drag.dx,
            y: item.originalY + drag.dy,
          },
        });
      });
    } else {
      cancelHistory();
    }
  }, [flush, persistUpdate, commitHistory, cancelHistory]);

  const onElementPointerEnter = useCallback(
    (event: ReactPointerEvent<SVGGElement>, element: BoardElement) => {
      if (toolRef.current === "eraser" && event.buttons === 1) {
        removeElement(element.id);
      }
    },
    [removeElement],
  );

  const onElementDoubleClick = useCallback((element: BoardElement) => {
    if (toolRef.current === "select" && isEditableType(element.type)) {
      setSelectedIds([element.id]);
      setEditingId(element.id);
    }
  }, []);

  /* ---------- resize ---------- */
  const onResizeStart = useCallback(
    (
      event: ReactPointerEvent<SVGRectElement>,
      element: BoardElement,
      handle: ResizeHandle,
    ) => {
      event.stopPropagation();
      beginGesture();
      beginHistory();

      const pointer = getPointerPosition(event.clientX, event.clientY);

      resizeRef.current = {
        elementId: element.id,
        handle,
        startX: pointer.x,
        startY: pointer.y,
        originalX: getX(element),
        originalY: getY(element),
        originalWidth: getW(element),
        originalHeight: getH(element),
        keepRatio: event.shiftKey,
      };

      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [beginGesture, getPointerPosition, beginHistory],
  );

  const onResizeMove = useCallback(
    (event: ReactPointerEvent<SVGRectElement>) => {
      const resize = resizeRef.current;
      if (!resize) return;

      const pointer = getPointerPosition(event.clientX, event.clientY);
      const dx = pointer.x - resize.startX;
      const dy = pointer.y - resize.startY;
      const { handle } = resize;

      let newX = resize.originalX;
      let newY = resize.originalY;
      let newWidth = resize.originalWidth;
      let newHeight = resize.originalHeight;

      if (handle === "e" || handle === "ne" || handle === "se") {
        newWidth = Math.max(MIN_SIZE, resize.originalWidth + dx);
      }

      if (handle === "w" || handle === "nw" || handle === "sw") {
        newWidth = Math.max(MIN_SIZE, resize.originalWidth - dx);
        newX = resize.originalX + (resize.originalWidth - newWidth);
      }

      if (handle === "s" || handle === "se" || handle === "sw") {
        newHeight = Math.max(MIN_SIZE, resize.originalHeight + dy);
      }

      if (handle === "n" || handle === "nw" || handle === "ne") {
        newHeight = Math.max(MIN_SIZE, resize.originalHeight - dy);
        newY = resize.originalY + (resize.originalHeight - newHeight);
      }

      if (resize.keepRatio) {
        const ratio = resize.originalWidth / resize.originalHeight;
        const widthDelta = newWidth - resize.originalWidth;
        const heightDelta = newHeight - resize.originalHeight;

        if (Math.abs(widthDelta) > Math.abs(heightDelta)) {
          newHeight = Math.max(MIN_SIZE, newWidth / ratio);

          if (handle === "n" || handle === "nw" || handle === "ne") {
            newY = resize.originalY + resize.originalHeight - newHeight;
          }
        } else {
          newWidth = Math.max(MIN_SIZE, newHeight * ratio);

          if (handle === "w" || handle === "nw" || handle === "sw") {
            newX = resize.originalX + resize.originalWidth - newWidth;
          }
        }
      }

      schedule(() =>
        updateElement(resize.elementId, (element) => ({
          ...element,
          data: {
            ...element.data,
            x: newX,
            y: newY,
            w: newWidth,
            h: newHeight,
          },
        })),
      );
    },
    [getPointerPosition, schedule, updateElement],
  );

  const onResizeEnd = useCallback(() => {
    flush();
    const resize = resizeRef.current;
    resizeRef.current = null;

    if (resize) {
      const el = localElementsRef.current.find(
        (e) => e.id === resize.elementId,
      );
      if (el) {
        commitHistory();
        persistUpdate(resize.elementId, { data: { ...el.data } });
      }
    }
  }, [flush, persistUpdate, commitHistory]);

  /* ---------- rotate ---------- */
  const onRotateStart = useCallback(
    (event: ReactPointerEvent<SVGCircleElement>, element: BoardElement) => {
      event.stopPropagation();
      beginGesture();
      beginHistory();

      const width = getW(element);
      const height = getH(element);
      const centerX = getX(element) + width / 2;
      const centerY = getY(element) + height / 2;
      const pointer = getPointerPosition(event.clientX, event.clientY);

      rotateRef.current = {
        elementId: element.id,
        centerX,
        centerY,
        startAngle:
          (Math.atan2(pointer.y - centerY, pointer.x - centerX) * 180) /
          Math.PI,
        originalRotation: (element.data.rotation as number) ?? 0,
      };

      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [beginGesture, getPointerPosition, beginHistory],
  );

  const onRotateMove = useCallback(
    (event: ReactPointerEvent<SVGCircleElement>) => {
      const rotate = rotateRef.current;
      if (!rotate) return;

      const pointer = getPointerPosition(event.clientX, event.clientY);
      const currentAngle =
        (Math.atan2(pointer.y - rotate.centerY, pointer.x - rotate.centerX) *
          180) /
        Math.PI;

      const rotation =
        rotate.originalRotation + currentAngle - rotate.startAngle;

      schedule(() =>
        updateElement(rotate.elementId, (element) => ({
          ...element,
          data: { ...element.data, rotation },
        })),
      );
    },
    [getPointerPosition, schedule, updateElement],
  );

  const onRotateEnd = useCallback(() => {
    flush();
    const rotate = rotateRef.current;
    rotateRef.current = null;

    if (rotate) {
      const el = localElementsRef.current.find(
        (e) => e.id === rotate.elementId,
      );
      if (el) {
        commitHistory();
        persistUpdate(rotate.elementId, { data: { ...el.data } });
      }
    }
  }, [flush, persistUpdate, commitHistory]);

  /* ---------- socket event merge ---------- */
  const applyRemoteCreate = useCallback((element: BoardElement) => {
    setLocalElements((current) => {
      if (current.some((item) => item.id === element.id)) return current;
      return [...current, element];
    });
  }, []);

  const applyRemoteUpdate = useCallback((element: BoardElement) => {
    if (dragRef.current?.items.some((item) => item.id === element.id)) return;

    setLocalElements((current) =>
      current.map((item) => (item.id === element.id ? element : item)),
    );
  }, []);

  const applyRemoteDelete = useCallback((elementId: string) => {
    setLocalElements((current) =>
      current.filter((item) => item.id !== elementId),
    );
    setSelectedIds((current) => current.filter((id) => id !== elementId));
  }, []);

  const applyRemoteLive = useCallback((element: BoardElement) => {
    setLocalElements((current) =>
      current.map((item) =>
        item.id === element.id
          ? {
              ...item,
              data: {
                ...item.data,
                x: element.data.x,
                y: element.data.y,
              },
            }
          : item,
      ),
    );
  }, []);

  /* ---------- stable handlers object ---------- */
  const handlers: ElementHandlers = useMemo(
    () => ({
      onPointerDown: onElementPointerDown,
      onPointerMove: onElementPointerMove,
      onPointerUp: onElementPointerUp,
      onPointerEnter: onElementPointerEnter,
      onDoubleClick: onElementDoubleClick,
      onCommitEdit: commitEdit,
      onLiveEdit: liveEdit,
      onAutoSize,
      onResizeStart,
      onResizeMove,
      onResizeEnd,
      onRotateStart,
      onRotateMove,
      onRotateEnd,
    }),
    [
      onElementPointerDown,
      onElementPointerMove,
      onElementPointerUp,
      onElementPointerEnter,
      onElementDoubleClick,
      commitEdit,
      liveEdit,
      onAutoSize,
      onResizeStart,
      onResizeMove,
      onResizeEnd,
      onRotateStart,
      onRotateMove,
      onRotateEnd,
    ],
  );

  /* ---------- derived ---------- */
  const sortedElements = useMemo(
    () => [...localElements].sort((a, b) => (a.z ?? 0) - (b.z ?? 0)),
    [localElements],
  );

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const singleId = selectedIds.length === 1 ? selectedIds[0] : null;

  const selectedElements = useMemo(
    () => localElements.filter((item) => selectedSet.has(item.id)),
    [localElements, selectedSet],
  );

  const styleSpec = useMemo(() => {
    for (const element of selectedElements) {
      const spec = getStyleSpec(element);
      if (spec) return spec;
    }
    return null;
  }, [selectedElements]);

  /* ---------- style change (with history) ---------- */
  const changeSelectedStyle = useCallback(
    (kind: StyleKind, value: string | number) => {
      const ids = new Set(selectedIdsRef.current);
      const patches = new Map<string, Record<string, unknown>>();

      localElementsRef.current.forEach((element) => {
        if (!ids.has(element.id)) return;
        const patch = applyStyle(element, kind, value);
        if (patch) patches.set(element.id, patch);
      });

      if (patches.size === 0) return;

      beginHistory();

      const next = localElementsRef.current.map((element) => {
        const patch = patches.get(element.id);
        return patch
          ? { ...element, data: { ...element.data, ...patch } }
          : element;
      });

      setLocalElements(next);

      commitHistory();

      next.forEach((element) => {
        if (patches.has(element.id)) {
          persistUpdate(element.id, { data: { ...element.data } });
        }
      });
    },
    [persistUpdate, beginHistory, commitHistory],
  );

  return {
    svgRef,
    worldRef,
    patternRef,
    fileRef,
    offset,
    draft,
    lineDraft,
    marquee,
    sortedElements,
    selectedSet,
    singleId,
    editingId,
    hasSelection: selectedIds.length > 0,
    styleSpec,
    changeSelectedStyle,
    insertImage,
    handlers,
    canvasHandlers: {
      onPointerDown: onCanvasPointerDown,
      onPointerMove: onCanvasPointerMove,
      onPointerUp: onCanvasPointerUp,
    },
    remoteHandlers: {
      applyRemoteCreate,
      applyRemoteUpdate,
      applyRemoteDelete,
      applyRemoteLive,
    },
    /* undo / redo */
    undo,
    redo,
    canUndo: historyRef.current.length > 0,
    canRedo: futureRef.current.length > 0,
  };
};
