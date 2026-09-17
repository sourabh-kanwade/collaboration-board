import test from "node:test";
import assert from "node:assert/strict";

import {
  BROWSER_BOARD_STORAGE_KEY,
  createBrowserBoardId,
  getStoredBrowserBoardId,
  isValidBrowserBoardId,
} from "./board-id";

test("browser board IDs are treated as valid when they use the browser prefix", () => {
  const boardId = "browser-123e4567-e89b-12d3-a456-426614174000";

  assert.equal(isValidBrowserBoardId(boardId), true);
  assert.equal(isValidBrowserBoardId("custom-board"), false);
});

test("board IDs are restored from the saved browser storage value when present", () => {
  const boardId = "browser-123e4567-e89b-12d3-a456-426614174000";

  assert.equal(isValidBrowserBoardId(boardId), true);
  assert.equal(getStoredBrowserBoardId(), null);
  assert.equal(BROWSER_BOARD_STORAGE_KEY, "collab-board-id");
});

test("generated board IDs always include the browser prefix and storage key", () => {
  const boardId = createBrowserBoardId();

  assert.equal(boardId.startsWith("browser-"), true);
  assert.equal(BROWSER_BOARD_STORAGE_KEY, "collab-board-id");
  assert.equal(boardId.length > "browser-".length, true);
});
