import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const BOARD_STALE_AFTER_MS = 30 * 24 * 60 * 60 * 1000;

export async function pruneUnusedBoards() {
  const cutoff = new Date(Date.now() - BOARD_STALE_AFTER_MS);

  const staleBoards = await prisma.board.findMany({
    where: {
      updatedAt: {
        lt: cutoff,
      },
      sessions: {
        none: {},
      },
    },
    select: { id: true },
  });

  if (staleBoards.length === 0) {
    return { deletedCount: 0 };
  }

  const result = await prisma.board.deleteMany({
    where: {
      id: {
        in: staleBoards.map((board) => board.id),
      },
    },
  });

  return { deletedCount: result.count };
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader =
    request.headers.get("authorization") ??
    request.headers.get("x-vercel-cron");
  const isAuthorized =
    !secret || authHeader === secret || authHeader === `Bearer ${secret}`;

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await pruneUnusedBoards();
  return NextResponse.json(result);
}
