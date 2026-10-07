"use client";

import { boardApi } from "@/lib/api/board.api";
import type {
  BoardData,
  BoardSummary,
  CreateBoardPayload,
} from "@/lib/api/board.api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export type {
  BoardData,
  BoardSummary,
  CreateBoardPayload,
} from "@/lib/api/board.api";

export const boardId = (board: BoardSummary): string =>
  board.id ?? board._id ?? "";

const BOARDS_KEY = ["boards"];

export const useBoards = () =>
  useQuery({
    queryKey: BOARDS_KEY,

    queryFn: async (): Promise<BoardSummary[]> => {
      const res = await boardApi.list();

      if (Array.isArray(res)) {
        return res;
      }

      if (Array.isArray(res?.boards)) {
        return res.boards;
      }

      if (Array.isArray(res?.data)) {
        return res.data;
      }

      return [];
    },

    refetchOnWindowFocus: false,
    retry: 1,
  });

export const useBoard = (id: string) =>
  useQuery({
    queryKey: ["board", id],

    queryFn: (): Promise<BoardData> => boardApi.get(id),

    enabled: Boolean(id),

    refetchOnWindowFocus: false,

    retry: 1,
  });

export const useCreateBoard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateBoardPayload): Promise<BoardSummary> => {
      const res = await boardApi.create(payload);

      return res?.board ?? res?.data ?? res;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: BOARDS_KEY,
      });
    },

    onError: () => {
      toast.error("Could not create the board. Try again.");
    },
  });
};

export const useUpdateBoard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      boardId,
      payload,
    }: {
      boardId: string;
      payload: Partial<CreateBoardPayload>;
    }) => {
      return boardApi.update(boardId, payload);
    },

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: BOARDS_KEY,
      });

      queryClient.invalidateQueries({
        queryKey: ["board", variables.boardId],
      });
    },

    onError: () => {
      toast.error("Could not update the board.");
    },
  });
};

export const useDeleteBoard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return boardApi.remove(id);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: BOARDS_KEY,
      });

      toast.success("Board deleted.");
    },

    onError: () => {
      toast.error("Could not delete the board.");
    },
  });
};
