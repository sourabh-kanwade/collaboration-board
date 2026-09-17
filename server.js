/* eslint-disable @typescript-eslint/no-require-imports */
const http = require("http");
const { Server } = require("socket.io");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const hostname = "0.0.0.0";
const port = Number(process.env.SOCKET_PORT || 3001);

const roomState = new Map();

function getRoom(roomId, boardId = roomId) {
  if (!roomState.has(roomId)) {
    roomState.set(roomId, {
      boardId,
      elements: [],
      participants: new Map(),
    });
  }

  const room = roomState.get(roomId);
  if (boardId && room && !room.boardId) {
    room.boardId = boardId;
  }

  return room;
}

function normalizeBoardElements(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error("Failed to parse board elements from storage", error);
      return [];
    }
  }

  return [];
}

function getPresencePayload(roomId) {
  const room = roomState.get(roomId);
  if (!room) {
    return [];
  }

  return Array.from(room.participants.values()).map((participant) => ({
    id: participant.id,
    name: participant.name,
    color: participant.color,
    x: participant.x,
    y: participant.y,
    connected: participant.connected,
  }));
}

function removeParticipantFromRoom(roomId, socketId) {
  const room = roomState.get(roomId);
  if (!room) return;

  room.participants.delete(socketId);

  if (room.participants.size === 0) {
    roomState.delete(roomId);
  }
}

function removeSocketFromAllRooms(socketId) {
  const roomIds = Array.from(roomState.keys());

  for (const roomId of roomIds) {
    if (!roomState.get(roomId)?.participants.has(socketId)) {
      continue;
    }

    removeParticipantFromRoom(roomId, socketId);
    const remainingRoom = roomState.get(roomId);
    if (remainingRoom && remainingRoom.participants.size > 0) {
      const io = global.__boardIo;
      if (io) {
        io.to(roomId).emit("presence-update", {
          boardId: remainingRoom.boardId || roomId,
          sessionId: roomId,
          participants: getPresencePayload(roomId),
        });
      }
    }
    // Continue processing all joined rooms instead of exiting after the first match.
  }
}

function isSocketMemberOfRoom(socketId, roomId) {
  return !!roomId && !!roomState.get(roomId)?.participants.has(socketId);
}

function isBoardOwnedByUser(board, userId) {
  const boardUserId =
    typeof board?.userId === "string" ? board.userId.trim() : "";
  const normalizedUserId = typeof userId === "string" ? userId.trim() : "";

  if (!boardUserId) {
    return true;
  }

  if (!normalizedUserId) {
    return false;
  }

  return boardUserId === normalizedUserId;
}

function isSocketAuthorizedForBoard({ socketId, boardId, roomId }) {
  if (!socketId || !boardId || !roomId) {
    return false;
  }

  const room = roomState.get(roomId);
  if (!room) {
    return false;
  }

  const isParticipant = room.participants.has(socketId);
  if (!isParticipant) {
    return false;
  }

  return !room.boardId || room.boardId === boardId;
}

async function persistBoardState(boardId, elements) {
  if (!boardId || !Array.isArray(elements)) {
    return;
  }

  try {
    await prisma.board.update({
      where: { id: boardId },
      data: { elements },
    });
  } catch (error) {
    console.error("Failed to persist board state for room", boardId, error);
  }
}

const allowedOrigins = (
  process.env.SOCKET_ALLOWED_ORIGINS ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://localhost:3000"
)
  .split(",")
  .map((entry) => entry.trim())
  .filter(Boolean);

const httpServer = http.createServer();
const io = new Server(httpServer, {
  transports: ["websocket", "polling"],
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by Socket.IO CORS`));
    },
    credentials: true,
    methods: ["GET", "POST"],
  },
});

global.__boardIo = io;

module.exports = {
  roomState,
  getRoom,
  normalizeBoardElements,
  getPresencePayload,
  removeParticipantFromRoom,
  removeSocketFromAllRooms,
  isSocketMemberOfRoom,
  isSocketAuthorizedForBoard,
  isBoardOwnedByUser,
  resolveRoomId: (boardId, sessionId) => {
    if (typeof sessionId === "string" && sessionId.trim()) {
      return sessionId.trim();
    }

    return boardId;
  },
};

io.on("connection", (socket) => {
  console.log("socket connected:", {
    id: socket.id,
    transport: socket.conn.transport.name,
  });

  socket.on("join-board", async ({ boardId, userName, sessionId, userId }) => {
    console.log("join-board received:", {
      socketId: socket.id,
      boardId,
      userName,
      sessionId,
      userId,
    });
    if (!boardId) {
      console.warn("join-board rejected: missing boardId", {
        socketId: socket.id,
      });
      return;
    }

    const normalizedUserId = typeof userId === "string" ? userId.trim() : "";
    const board = boardId
      ? await prisma.board
          .findUnique({ where: { id: boardId } })
          .catch(() => null)
      : null;
    if (board && !isBoardOwnedByUser(board, normalizedUserId)) {
      console.warn("join-board rejected: board ownership mismatch", {
        socketId: socket.id,
        boardId,
        userId: normalizedUserId,
      });
      return;
    }

    const roomId =
      typeof sessionId === "string" && sessionId.trim()
        ? sessionId.trim()
        : boardId;
    const room = getRoom(roomId, boardId);
    if (!room) {
      console.warn("join-board rejected: room not available", {
        socketId: socket.id,
        roomId,
      });
      return;
    }
    socket.join(roomId);

    const displayName =
      typeof userName === "string" && userName.trim().length > 0
        ? userName.trim()
        : "Guest";
    const participant = {
      id: socket.id,
      name: displayName,
      color: `hsl(${Math.abs(displayName.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0)) % 360}, 75%, 60%)`,
      x: 0,
      y: 0,
      connected: true,
    };

    room.participants.set(socket.id, participant);

    try {
      const board = await prisma.board.findUnique({ where: { id: boardId } });
      const elements = normalizeBoardElements(board?.elements);
      if (elements.length > 0) {
        room.elements = elements;
      }
    } catch (error) {
      console.error("Failed to hydrate board from database on join", error);
    }

    socket.emit("board-state", {
      boardId,
      sessionId: roomId,
      elements: room.elements,
    });

    io.to(roomId).emit("presence-update", {
      boardId,
      sessionId: roomId,
      participants: getPresencePayload(roomId),
    });

    if (typeof sessionId === "string" && sessionId.trim()) {
      socket.emit("session-joined", { boardId, sessionId });
    }
  });

  socket.on(
    "board-state-change",
    async ({ boardId, elements, sessionId, userId }) => {
      console.log("board-state-change received:", {
        socketId: socket.id,
        boardId,
        sessionId,
        userId,
        elementCount: Array.isArray(elements) ? elements.length : "invalid",
      });
      if (!boardId) {
        console.warn("board-state-change rejected: missing boardId", {
          socketId: socket.id,
        });
        return;
      }

      const roomId =
        typeof sessionId === "string" && sessionId.trim()
          ? sessionId.trim()
          : boardId;

      if (
        !isSocketAuthorizedForBoard({ socketId: socket.id, boardId, roomId })
      ) {
        console.warn("board-state-change rejected: unauthorized socket", {
          socketId: socket.id,
          boardId,
          roomId,
        });
        return;
      }

      const normalizedUserId = typeof userId === "string" ? userId.trim() : "";
      const board = await prisma.board
        .findUnique({ where: { id: boardId } })
        .catch(() => null);
      if (!isBoardOwnedByUser(board, normalizedUserId)) {
        console.warn("board-state-change rejected: board ownership mismatch", {
          socketId: socket.id,
          boardId,
          roomId,
          userId: normalizedUserId,
        });
        return;
      }

      if (board && !board.userId && normalizedUserId) {
        await prisma.board.update({
          where: { id: boardId },
          data: { userId: normalizedUserId },
        });
      }

      const room = roomState.get(roomId);
      if (!room) {
        void persistBoardState(
          boardId,
          Array.isArray(elements) ? elements : [],
        );
        return;
      }

      room.elements = Array.isArray(elements) ? elements : room.elements;
      void persistBoardState(boardId, room.elements);
      io.to(roomId).emit("board-update", {
        boardId,
        sessionId: roomId,
        elements: room.elements,
      });
    },
  );

  socket.on("cursor-move", ({ boardId, sessionId, x, y, userName }) => {
    console.log("cursor-move received:", {
      socketId: socket.id,
      boardId,
      sessionId,
      x,
      y,
      userName,
    });
    if (!boardId) {
      console.warn("cursor-move rejected: missing boardId", {
        socketId: socket.id,
      });
      return;
    }

    const roomId =
      typeof sessionId === "string" && sessionId.trim()
        ? sessionId.trim()
        : boardId;

    if (!isSocketAuthorizedForBoard({ socketId: socket.id, boardId, roomId })) {
      console.warn("cursor-move rejected: unauthorized socket", {
        socketId: socket.id,
        boardId,
        roomId,
      });
      return;
    }

    const room = roomState.get(roomId);
    if (!room) {
      return;
    }

    const participant = room.participants.get(socket.id);
    if (!participant) {
      return;
    }

    participant.x = Number.isFinite(x) ? x : participant.x;
    participant.y = Number.isFinite(y) ? y : participant.y;
    if (typeof userName === "string" && userName.trim()) {
      participant.name = userName.trim();
    }

    socket.to(roomId).emit("cursor-update", {
      userId: socket.id,
      name: participant.name,
      color: participant.color,
      x: participant.x,
      y: participant.y,
    });
  });

  socket.on("leave-board", ({ boardId, sessionId }) => {
    console.log("leave-board received:", {
      socketId: socket.id,
      boardId,
      sessionId,
    });
    if (!boardId && !sessionId) {
      console.warn("leave-board rejected: missing boardId or sessionId", {
        socketId: socket.id,
      });
      return;
    }

    const roomId =
      typeof sessionId === "string" && sessionId.trim()
        ? sessionId.trim()
        : boardId;

    if (!roomId || !isSocketMemberOfRoom(socket.id, roomId)) {
      return;
    }

    socket.leave(roomId);
    removeParticipantFromRoom(roomId, socket.id);

    const remainingRoom = roomState.get(roomId);
    if (remainingRoom && remainingRoom.participants.size > 0) {
      io.to(roomId).emit("presence-update", {
        boardId: remainingRoom.boardId || roomId,
        sessionId: roomId,
        participants: getPresencePayload(roomId),
      });
    }
  });

  socket.on("disconnect", (reason) => {
    console.log("socket disconnected:", { socketId: socket.id, reason });
    removeSocketFromAllRooms(socket.id);
  });
});

if (require.main === module) {
  httpServer.listen(port, hostname, () => {
    console.log(`Socket server ready at http://${hostname}:${port}`);
  });
}
