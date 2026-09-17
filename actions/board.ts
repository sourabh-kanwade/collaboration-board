"use server";

import { createBrowserBoardId, isValidBrowserBoardId } from "@/lib/board-id";
import { prisma } from "@/lib/db";

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
  hostToken?: string;
};

export async function generateHostToken() {
  return crypto.randomUUID();
}

export async function validateSessionStopAuthorization({
  sessionHostToken,
  providedHostToken,
}: {
  sessionHostToken?: string | null;
  providedHostToken?: string | null;
}) {
  const sanitizedSessionToken =
    typeof sessionHostToken === "string" ? sessionHostToken.trim() : "";
  const sanitizedProvidedToken =
    typeof providedHostToken === "string" ? providedHostToken.trim() : "";

  if (!sanitizedSessionToken || !sanitizedProvidedToken) {
    return false;
  }

  return sanitizedSessionToken === sanitizedProvidedToken;
}

export async function getDefaultBoard() {
  const boardId = createBrowserBoardId();
  if (isValidBrowserBoardId(boardId)) {
    return await ensureBoard(boardId);
  }

  return await ensureBoard("browser-default");
}

export async function getOrCreateBrowserBoard() {
  return await getDefaultBoard();
}

const normalizeUserId = (value: unknown): string => {
  return typeof value === "string" ? value.trim() : "";
};

const isBoardOwnedByUser = (
  board: { userId?: string | null } | null,
  userId?: string,
) => {
  const normalizedBoardUserId = board?.userId?.trim() ?? "";
  const normalizedUserId = normalizeUserId(userId);

  if (!normalizedBoardUserId) {
    return true;
  }

  if (!normalizedUserId) {
    return false;
  }

  return normalizedBoardUserId === normalizedUserId;
};

export async function getBoardState(id: string) {
  const board = await ensureBoard(id);

  if (Array.isArray(board.elements)) {
    return board.elements as unknown[];
  }

  if (typeof board.elements === "string") {
    try {
      return JSON.parse(board.elements) as unknown[];
    } catch {
      return [];
    }
  }

  return [];
}

export async function saveBoardState(
  id: string,
  elements: unknown,
  userId?: string,
) {
  const normalizedUserId = normalizeUserId(userId);
  const board = await prisma.board.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      elements: true,
    },
  });

  if (!board) {
    return { success: false, error: "Board not found." };
  }

  if (!isBoardOwnedByUser(board, normalizedUserId)) {
    return { success: false, error: "You do not own this board." };
  }

  try {
    await prisma.board.update({
      where: { id },
      data: {
        elements: elements as never,
        ...(board.userId || normalizedUserId
          ? { userId: board.userId || normalizedUserId }
          : {}),
      },
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to save board state:", error);
    return { success: false, error: "Failed to save board state" };
  }
}

export async function ensureBoard(id: string, userId?: string) {
  const normalizedUserId = normalizeUserId(userId);
  const existingBoard = await prisma.board.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      elements: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (existingBoard) {
    if (!isBoardOwnedByUser(existingBoard, normalizedUserId)) {
      throw new Error("You do not own this board.");
    }

    if (!existingBoard.userId && normalizedUserId) {
      return await prisma.board.update({
        where: { id },
        data: { userId: normalizedUserId },
      });
    }

    return existingBoard;
  }

  return await prisma.board.create({
    data: {
      id,
      userId: normalizedUserId,
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
  hostToken?: string | null;
}): LiveSessionRecord {
  return {
    id: session.id,
    boardId: session.boardId,
    displayName: session.displayName,
    status: session.status === "stopped" ? "stopped" : "active",
    link: session.link,
    participants: normalizeParticipants(session.participants),
    hostToken:
      typeof session.hostToken === "string" ? session.hostToken : undefined,
  };
}

function createSessionLink(sessionId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  return `${normalizedBase}?session=${encodeURIComponent(sessionId)}`;
}

export async function getActiveSession(boardId?: string, sessionId?: string) {
  if (boardId) {
    await ensureBoard(boardId);
  }

  const session = sessionId
    ? await prisma.session.findFirst({
        where: {
          id: sessionId,
          ...(boardId ? { boardId } : {}),
          status: "active",
        },
        select: {
          id: true,
          boardId: true,
          displayName: true,
          status: true,
          link: true,
          participants: true,
          hostToken: true,
          userId: true,
          createdAt: true,
          updatedAt: true,
        },
      })
    : await prisma.session.findFirst({
        where: {
          boardId,
          status: "active",
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          boardId: true,
          displayName: true,
          status: true,
          link: true,
          participants: true,
          hostToken: true,
          userId: true,
          createdAt: true,
          updatedAt: true,
        },
      });

  if (!session || session.status === "stopped") {
    return null;
  }

  return serializeSession(session);
}

export async function createLiveSession(
  boardId: string,
  displayName: string,
  userId?: string,
) {
  const cleanName = displayName.trim();
  const normalizedUserId = normalizeUserId(userId);
  if (!cleanName) {
    throw new Error("Please enter a display name.");
  }

  await ensureBoard(boardId, normalizedUserId);

  const hostToken = await generateHostToken();

  const existingSession = await prisma.session.findFirst({
    where: {
      boardId,
      status: "active",
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      boardId: true,
      displayName: true,
      status: true,
      link: true,
      participants: true,
      hostToken: true,
      userId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (existingSession) {
    const participants = normalizeParticipants(existingSession.participants);
    const alreadyRegistered = participants.some(
      (participant) =>
        participant.name.toLowerCase() === cleanName.toLowerCase(),
    );

    if (!alreadyRegistered) {
      const updatedSession = await prisma.session.update({
        where: { id: existingSession.id },
        data: {
          userId: existingSession.userId || normalizedUserId,
          participants: [
            ...participants,
            {
              name: cleanName,
              role: "guest",
              joinedAt: new Date().toISOString(),
            },
          ],
          hostToken,
        },
      });
      return serializeSession(updatedSession);
    }

    return serializeSession({
      ...existingSession,
      hostToken: existingSession.hostToken ?? hostToken,
    });
  }

  const session = await prisma.session.create({
    data: {
      boardId,
      userId: normalizedUserId,
      displayName: cleanName,
      status: "active",
      link: "",
      hostToken,
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
  userId?: string,
) {
  const cleanName = displayName.trim();
  const normalizedUserId = normalizeUserId(userId);
  if (!cleanName) {
    throw new Error("Please enter a display name.");
  }

  const session = await prisma.session.findFirst({
    where: {
      id: sessionId,
      boardId,
      status: "active",
    },
    select: {
      id: true,
      boardId: true,
      displayName: true,
      status: true,
      link: true,
      participants: true,
      hostToken: true,
      userId: true,
      createdAt: true,
      updatedAt: true,
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
      userId: session.userId || normalizedUserId,
      displayName: session.displayName || cleanName,
      participants: nextParticipants,
    },
  });

  return serializeSession(updatedSession);
}

export async function stopLiveSession(
  boardId: string,
  hostToken: string,
  sessionId?: string,
) {
  const cleanHostToken = hostToken.trim();
  if (!cleanHostToken) {
    throw new Error("A host token is required to stop the session.");
  }

  const activeSession = sessionId
    ? await prisma.session.findFirst({
        where: {
          id: sessionId,
          boardId,
          status: "active",
        },
        select: {
          id: true,
          boardId: true,
          displayName: true,
          status: true,
          link: true,
          participants: true,
          hostToken: true,
          userId: true,
          createdAt: true,
          updatedAt: true,
        },
      })
    : await prisma.session.findFirst({
        where: {
          boardId,
          status: "active",
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          boardId: true,
          displayName: true,
          status: true,
          link: true,
          participants: true,
          hostToken: true,
          userId: true,
          createdAt: true,
          updatedAt: true,
        },
      });

  if (!activeSession) {
    return null;
  }

  const isAuthorized = validateSessionStopAuthorization({
    sessionHostToken: activeSession.hostToken,
    providedHostToken: cleanHostToken,
  });

  if (!isAuthorized) {
    throw new Error("Only the session host can stop this session.");
  }

  const updatedSession = await prisma.session.update({
    where: { id: activeSession.id },
    data: { status: "stopped" },
  });

  return serializeSession(updatedSession);
}
