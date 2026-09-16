"use server";

import { prisma } from "@/lib/db";

const DEFAULT_BOARD_ID = "default-board-1";

type SessionParticipant = {
  name: string;
  role: "host" | "guest";
  joinedAt: string;
};

export type LiveSessionRecord = {
  id: string;
  boardId: string;
  displayName: string;
  link: string;
  status: "active" | "stopped";
  participants: SessionParticipant[];
};

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
      data: { elements },
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to save board state:", error);
    return { success: false, error: "Failed to save board state" };
  }
}

export async function ensureBoard(id: string) {
  return await prisma.board.upsert({
    where: { id },
    update: {},
    create: {
      id,
      elements: [],
    },
  });
}

function normalizeParticipants(value: unknown): SessionParticipant[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null,
    )
    .map((item) => {
      const role = item.role === "host" ? "host" : "guest";
      return {
        name: typeof item.name === "string" ? item.name : "Guest",
        role,
        joinedAt:
          typeof item.joinedAt === "string"
            ? item.joinedAt
            : new Date().toISOString(),
      } satisfies SessionParticipant;
    })
    .filter((item) => item.name.trim().length > 0);
}

function serializeSession(session: {
  id: string;
  boardId: string;
  displayName: string;
  status: string;
  link: string;
  participants: unknown;
}): LiveSessionRecord {
  return {
    id: session.id,
    boardId: session.boardId,
    displayName: session.displayName,
    status: session.status === "stopped" ? "stopped" : "active",
    link: session.link,
    participants: normalizeParticipants(session.participants),
  };
}

function createSessionLink(sessionId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  return `${normalizedBase}?session=${encodeURIComponent(sessionId)}`;
}

export async function getActiveSession(boardId: string, sessionId?: string) {
  await ensureBoard(boardId);

  const session = sessionId
    ? await prisma.session.findFirst({
        where: {
          id: sessionId,
          boardId,
        },
      })
    : await prisma.session.findFirst({
        where: {
          boardId,
          status: "active",
        },
        orderBy: { createdAt: "desc" },
      });

  if (!session || session.status === "stopped") {
    return null;
  }

  return serializeSession(session);
}

export async function createLiveSession(boardId: string, displayName: string) {
  const cleanName = displayName.trim();
  if (!cleanName) {
    throw new Error("Please enter a display name.");
  }

  await ensureBoard(boardId);

  const existingSession = await prisma.session.findFirst({
    where: {
      boardId,
      status: "active",
    },
    orderBy: { createdAt: "desc" },
  });

  if (existingSession) {
    const existing = serializeSession(existingSession);
    return existing;
  }

  const session = await prisma.session.create({
    data: {
      boardId,
      displayName: cleanName,
      status: "active",
      link: "",
      participants: [
        {
          name: cleanName,
          role: "host",
          joinedAt: new Date().toISOString(),
        },
      ],
    },
  });

  const updatedSession = await prisma.session.update({
    where: { id: session.id },
    data: {
      link: createSessionLink(session.id),
    },
  });

  return serializeSession(updatedSession);
}

export async function joinLiveSession(
  boardId: string,
  sessionId: string,
  displayName: string,
) {
  const cleanName = displayName.trim();
  if (!cleanName) {
    throw new Error("Please enter a display name.");
  }

  const session = await prisma.session.findFirst({
    where: {
      id: sessionId,
      boardId,
      status: "active",
    },
  });

  if (!session) {
    throw new Error("This session is no longer active.");
  }

  const participants = normalizeParticipants(session.participants);
  const now = new Date().toISOString();
  const existingParticipant = participants.find(
    (participant) => participant.name.toLowerCase() === cleanName.toLowerCase(),
  );

  const nextParticipants = existingParticipant
    ? participants
    : [...participants, { name: cleanName, role: "guest", joinedAt: now }];

  const updatedSession = await prisma.session.update({
    where: { id: session.id },
    data: {
      displayName: session.displayName || cleanName,
      participants: nextParticipants,
    },
  });

  return serializeSession(updatedSession);
}

export async function stopLiveSession(boardId: string, sessionId?: string) {
  const activeSession = sessionId
    ? await prisma.session.findFirst({
        where: {
          id: sessionId,
          boardId,
          status: "active",
        },
      })
    : await prisma.session.findFirst({
        where: {
          boardId,
          status: "active",
        },
        orderBy: { createdAt: "desc" },
      });

  if (!activeSession) {
    return null;
  }

  const updatedSession = await prisma.session.update({
    where: { id: activeSession.id },
    data: { status: "stopped" },
  });

  return serializeSession(updatedSession);
}
