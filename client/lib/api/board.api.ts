// lib/api/board.api.ts
import { API } from "@/lib/axios";

export type BoardBackground = "dots" | "grid" | "plain";

/* ------------------------------------------------------------------ */
/* Backend element data shape (flat)                                   */
/* ------------------------------------------------------------------ */
export interface ElementData {
  x: number;
  y: number;
  w: number;
  h: number;

  // type-specific optional fields
  text?: string;
  color?: string;
  rotation?: number;
  points?: [number, number][];
  src?: string; // image
  chartType?: string; // chart
  emoji?: string; // emoji

  [key: string]: unknown;
}

/* ------------------------------------------------------------------ */
/* Board element as it arrives from backend                            */
/* ------------------------------------------------------------------ */
export interface BoardElement {
  id: string;
  type: string;
  data: ElementData;
  z: number;
  createdBy?: string;
  updatedAt?: string;
}

/* ------------------------------------------------------------------ */
/* Request payloads                                                    */
/* ------------------------------------------------------------------ */
export interface CreateElementPayload {
  type: string;
  data?: Partial<ElementData>;
  z?: number;
}

export interface UpdateElementPayload {
  data?: Partial<ElementData>;
  z?: number;
}

/* ------------------------------------------------------------------ */
/* Helpers to read element geometry safely                             */
/* ------------------------------------------------------------------ */
export const elX = (el: BoardElement): number => el.data?.x ?? 0;
export const elY = (el: BoardElement): number => el.data?.y ?? 0;
export const elW = (el: BoardElement): number => el.data?.w ?? 240;
export const elH = (el: BoardElement): number => el.data?.h ?? 140;

export const elPosition = (el: BoardElement) => ({
  x: elX(el),
  y: elY(el),
});

export const elSize = (el: BoardElement) => ({
  width: elW(el),
  height: elH(el),
});

/* ------------------------------------------------------------------ */
/* Normalizer — backend থেকে যা আসে, তার default পূরণ করে দেয়          */
/* ------------------------------------------------------------------ */
export function normalizeElement(raw: any): BoardElement {
  const d = raw?.data ?? {};
  return {
    id: raw.id,
    type: raw.type,
    z: raw.z ?? 0,
    createdBy: raw.createdBy,
    updatedAt: raw.updatedAt,
    data: {
      x: typeof d.x === "number" ? d.x : 0,
      y: typeof d.y === "number" ? d.y : 0,
      w: typeof d.w === "number" ? d.w : 240,
      h: typeof d.h === "number" ? d.h : 140,
      ...d,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Board summary / list                                                */
/* ------------------------------------------------------------------ */
export interface BoardSummary {
  id?: string;
  _id?: string;
  title: string;
  description?: string | null;
  background?: BoardBackground;
  bgColor?: string;
  ownerId?: string;
  updatedAt?: string;
  createdAt?: string;
  isOwner?: boolean;
  elementCount?: number;
}

export interface CreateBoardPayload {
  title: string;
  description?: string;
  background?: BoardBackground;
  bgColor?: string;
}

export interface BoardMember {
  userId?: string;
  id?: string;
  name?: string;
  email?: string;
  avatar?: string;
  role?: "owner" | "editor" | "viewer";
}

export interface BoardData {
  board: BoardSummary & {
    role?: "owner" | "editor" | "viewer";
  };
  elements: BoardElement[];
  members: BoardMember[];
}

/* ------------------------------------------------------------------ */
/* API                                                                 */
/* ------------------------------------------------------------------ */
export const boardApi = {
  list: async () => {
    const res = await API.get("/boards");
    return res.data;
  },

  create: async (payload: CreateBoardPayload) => {
    const res = await API.post("/boards", payload);
    return res.data;
  },

  get: async (boardId: string): Promise<BoardData> => {
    const res = await API.get(`/boards/${boardId}`);
    const body = res.data;

    const payload: any = body?.data?.board ? body.data : body;

    const elements: BoardElement[] = (payload.elements ?? []).map(
      normalizeElement,
    );

    return {
      board: payload.board,
      members: payload.members ?? [],
      elements,
    };
  },

  update: async (boardId: string, payload: Partial<CreateBoardPayload>) => {
    const res = await API.patch(`/boards/${boardId}`, payload);
    return res.data;
  },

  remove: async (boardId: string) => {
    const res = await API.delete(`/boards/${boardId}`);
    return res.data;
  },

  /* ---------------- Elements ---------------- */

  createElement: async (
    boardId: string,
    payload: CreateElementPayload,
    socketId?: string,
  ): Promise<BoardElement> => {
    const res = await API.post(`/boards/${boardId}/elements`, payload, {
      headers: socketId ? { "x-socket-id": socketId } : undefined,
    });

    // ResponseInterceptor এর কারণে { data: element } আসে
    const raw = res.data?.data ?? res.data;
    return normalizeElement(raw);
  },

  updateElement: async (
    boardId: string,
    elementId: string,
    payload: UpdateElementPayload,
    socketId?: string,
  ): Promise<BoardElement> => {
    const res = await API.patch(
      `/boards/${boardId}/elements/${elementId}`,
      payload,
      { headers: socketId ? { "x-socket-id": socketId } : undefined },
    );

    const raw = res.data?.data ?? res.data;
    return normalizeElement(raw);
  },

  deleteElement: async (
    boardId: string,
    elementId: string,
    socketId?: string,
  ) => {
    const res = await API.delete(`/boards/${boardId}/elements/${elementId}`, {
      headers: socketId ? { "x-socket-id": socketId } : undefined,
    });
    return res.data;
  },

  bulkCreate: async (
    boardId: string,
    elements: CreateElementPayload[],
    socketId?: string,
  ): Promise<BoardElement[]> => {
    const res = await API.post(
      `/boards/${boardId}/elements/bulk`,
      { elements },
      { headers: socketId ? { "x-socket-id": socketId } : undefined },
    );

    const raw = res.data?.data ?? res.data;
    return Array.isArray(raw) ? raw.map(normalizeElement) : [];
  },
};
