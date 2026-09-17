/* eslint-disable @typescript-eslint/no-require-imports */
const http = require("http");
const { Server } = require("socket.io");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const hostname = "0.0.0.0";
const port = Number(process.env.SOCKET_PORT || 3001);

const roomState = new Map();

function getRoom(boardId) {
  if (!roomState.has(boardId)) {
    roomState.set(boardId, {
      elements: [],
      participants: new Map(),
    });
  }

  return roomState.get(boardId);
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

function getPresencePayload(boardId) {
  const room = getRoom(boardId);
  return Array.from(room.participants.values()).map((participant) => ({
    id: participant.id,
    name: participant.name,
    color: participant.color,
    x: participant.x,
    y: participant.y,
    connected: participant.connected,
  }));
}

function broadcastPresence(boardId) {
  const room = getRoom(boardId);
  const io = global.__boardIo;
  if (!io) return;
  io.to(boardId).emit("presence-update", {
    boardId,
    participants: getPresencePayload(boardId),
  });

  room.participants.forEach((participant) => {
    participant.connected = true;
  });
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

const httpServer = http.createServer();
const io = new Server(httpServer, {
  transports: ["websocket", "polling"],
  cors: {
    origin: "*",
  },
});

global.__boardIo = io;

io.on("connection", (socket) => {
  console.log("socket connected:", {
    id: socket.id,
    transport: socket.conn.transport.name,
  });

  socket.on("join-board", async ({ boardId, userName, sessionId }) => {
    console.log("join-board received:", {
      socketId: socket.id,
      boardId,
      userName,
      sessionId,
    });
    if (!boardId) {
      console.warn("join-board rejected: missing boardId", {
        socketId: socket.id,
      });
      return;
    }

    socket.join(boardId);

    const room = getRoom(boardId);
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
      elements: room.elements,
    });

    io.to(boardId).emit("presence-update", {
      boardId,
      participants: getPresencePayload(boardId),
    });

    if (typeof sessionId === "string" && sessionId.trim()) {
      socket.emit("session-joined", { boardId, sessionId });
    }
  });

  socket.on("board-state-change", ({ boardId, elements }) => {
    console.log("board-state-change received:", {
      socketId: socket.id,
      boardId,
      elementCount: Array.isArray(elements) ? elements.length : "invalid",
    });
    if (!boardId) {
      console.warn("board-state-change rejected: missing boardId", {
        socketId: socket.id,
      });
      return;
    }

    const room = getRoom(boardId);
    room.elements = Array.isArray(elements) ? elements : room.elements;
    void persistBoardState(boardId, room.elements);
    io.to(boardId).emit("board-update", {
      boardId,
      elements: room.elements,
    });
  });

  socket.on("cursor-move", ({ boardId, x, y, userName }) => {
    console.log("cursor-move received:", {
      socketId: socket.id,
      boardId,
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

    const room = getRoom(boardId);
    const participant = room.participants.get(socket.id);
    if (!participant) {
      return;
    }

    participant.x = Number.isFinite(x) ? x : participant.x;
    participant.y = Number.isFinite(y) ? y : participant.y;
    if (typeof userName === "string" && userName.trim()) {
      participant.name = userName.trim();
    }

    socket.to(boardId).emit("cursor-update", {
      userId: socket.id,
      name: participant.name,
      color: participant.color,
      x: participant.x,
      y: participant.y,
    });
  });

  socket.on("leave-board", ({ boardId }) => {
    console.log("leave-board received:", { socketId: socket.id, boardId });
    if (!boardId) {
      console.warn("leave-board rejected: missing boardId", {
        socketId: socket.id,
      });
      return;
    }

    socket.leave(boardId);
    const room = getRoom(boardId);
    if (room.participants.has(socket.id)) {
      room.participants.delete(socket.id);
    }
    broadcastPresence(boardId);
  });

  socket.on("disconnect", (reason) => {
    console.log("socket disconnected:", { socketId: socket.id, reason });
    for (const [boardId, room] of roomState.entries()) {
      if (room.participants.has(socket.id)) {
        room.participants.delete(socket.id);
        broadcastPresence(boardId);
        if (room.participants.size === 0) {
          roomState.delete(boardId);
        }
      }
    }
  });
});

httpServer.listen(port, hostname, () => {
  console.log(`Socket server ready at http://${hostname}:${port}`);
});
