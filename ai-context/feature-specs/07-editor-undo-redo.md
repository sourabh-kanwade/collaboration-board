We need to add standard editor functionality for undo and redo using keyboard shortcuts.

### Undo/Redo Mechanics

Update `components/editor/board-client.tsx`

Requirements:

- Implement two stacks (`history` and `future`) to track the state of canvas elements.
- On every completed drawing action (`pointerup`), save a snapshot of the current `elements` array into the `history` stack.
- Clear the `future` stack whenever a new canvas action is performed.
- Bind keyboard events to the window or document:
  - `Ctrl+Z` (or `Cmd+Z` on Mac) for Undo:
    - Move the current state to `future`.
    - Apply the new last entry from `history` by updating `elements`.
  - `Ctrl+Shift+Z` or `Ctrl+Y` (or `Cmd+Shift+Z` / `Cmd+Y` on Mac) for Redo:
    - Pop the most recent state from `future`.
    - Append that state to `history`.
    - Apply the popped state to `elements`.
- Make sure undo and redo trigger the necessary state sync via Socket.IO so other collaborators see the undone/redone changes.

### Check when done

- `Ctrl+Z` successfully restores the canvas to its previous state.
- `Ctrl+Shift+Z` or `Ctrl+Y` successfully reapplies the undone state.
- Drawing a new shape after an undo correctly clears the future stack.
- No typescript errors.
- No lint errors.
