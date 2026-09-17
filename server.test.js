/* eslint-disable @typescript-eslint/no-require-imports */
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  roomState,
  getRoom,
  removeParticipantFromRoom,
  removeSocketFromAllRooms,
  resolveRoomId,
  isSocketAuthorizedForBoard,
  isSocketMemberOfRoom,
} = require("./server.js");

test("resolveRoomId prefers a session ID when present", () => {
  assert.equal(resolveRoomId("board-123", "session-abc"), "session-abc");
  assert.equal(resolveRoomId("board-123", ""), "board-123");
});

test("leave-board does not wipe the room when other users remain", () => {
  roomState.clear();
  const room = getRoom("room-1", "board-1");
  room.participants.set("socket-a", { id: "socket-a", name: "A" });
  room.participants.set("socket-b", { id: "socket-b", name: "B" });

  removeParticipantFromRoom("room-1", "socket-a");

  assert.equal(roomState.has("room-1"), true);
  assert.equal(room.participants.has("socket-b"), true);
  assert.equal(room.participants.has("socket-a"), false);
});

test("disconnect cleanup removes a socket from every joined room without breaking after the first match", () => {
  roomState.clear();
  getRoom("room-1", "board-1").participants.set("socket-c", {
    id: "socket-c",
    name: "C",
  });
  getRoom("room-2", "board-2").participants.set("socket-c", {
    id: "socket-c",
    name: "C",
  });
  getRoom("room-2", "board-2").participants.set("socket-d", {
    id: "socket-d",
    name: "D",
  });

  removeSocketFromAllRooms("socket-c");

  assert.equal(roomState.has("room-1"), false);
  assert.equal(roomState.has("room-2"), true);
  assert.equal(roomState.get("room-2").participants.has("socket-d"), true);
});

test("socket mutations require active room membership and board ownership", () => {
  roomState.clear();
  const room = getRoom("room-1", "board-1");
  room.participants.set("authorized-socket", {
    id: "authorized-socket",
    name: "Alice",
  });

  assert.equal(isSocketMemberOfRoom("authorized-socket", "room-1"), true);
  assert.equal(isSocketMemberOfRoom("unknown-socket", "room-1"), false);
  assert.equal(
    isSocketAuthorizedForBoard({
      socketId: "authorized-socket",
      boardId: "board-1",
      roomId: "room-1",
    }),
    true,
  );
  assert.equal(
    isSocketAuthorizedForBoard({
      socketId: "unknown-socket",
      boardId: "board-1",
      roomId: "room-1",
    }),
    false,
  );
  assert.equal(
    isSocketAuthorizedForBoard({
      socketId: "authorized-socket",
      boardId: "board-2",
      roomId: "room-1",
    }),
    false,
  );
});

test("board ownership validation rejects mismatched authenticated user IDs", () => {
  const board = { id: "board-1", userId: "user-123" };
  assert.equal(
    require("./server.js").isBoardOwnedByUser(board, "user-123"),
    true,
  );
  assert.equal(
    require("./server.js").isBoardOwnedByUser(board, "user-456"),
    false,
  );
  assert.equal(
    require("./server.js").isBoardOwnedByUser({ id: "board-2" }, "user-456"),
    true,
  );
});
