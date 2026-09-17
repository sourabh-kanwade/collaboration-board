export const BROWSER_BOARD_STORAGE_KEY = "collab-board-id";

export function createBrowserBoardId() {
  return `browser-${crypto.randomUUID()}`;
}

export function isValidBrowserBoardId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.startsWith("browser-") &&
    value.length > "browser-".length
  );
}

export function getStoredBrowserBoardId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.localStorage.getItem(BROWSER_BOARD_STORAGE_KEY);
  return isValidBrowserBoardId(value) ? value : null;
}

export function getOrCreateStoredBrowserBoardId(): string {
  if (typeof window === "undefined") {
    return createBrowserBoardId();
  }

  const existingBoardId = getStoredBrowserBoardId();
  if (existingBoardId) {
    return existingBoardId;
  }

  const nextBoardId = createBrowserBoardId();
  window.localStorage.setItem(BROWSER_BOARD_STORAGE_KEY, nextBoardId);
  return nextBoardId;
}

export function persistBrowserBoardId(boardId: string) {
  if (typeof window === "undefined") {
    return;
  }

  if (!isValidBrowserBoardId(boardId)) {
    return;
  }

  window.localStorage.setItem(BROWSER_BOARD_STORAGE_KEY, boardId);
}
