"use server";

import { prisma } from "@/lib/db";

const DEFAULT_BOARD_ID = "default-board-1";

export async function getDefaultBoard() {
  return await prisma.board.upsert({
    where: { id: DEFAULT_BOARD_ID },
    update: {},
    create: {
      id: DEFAULT_BOARD_ID,
      elements: [],
    },
  });
}

export async function saveBoardState(id: string, elements: unknown) {
  try {
    await prisma.board.update({
      where: { id },
      // @ts-expect-error - elements is unknown but Prisma accepts it as JSON
      data: { elements: elements },
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to save board state:", error);
    return { success: false, error: "Failed to save board state" };
  }
}
