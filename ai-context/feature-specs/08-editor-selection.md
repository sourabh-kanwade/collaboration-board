# Selection of element

Implement a bounding box detection system to allow users to click and select previously drawn shapes/strokes. Provide options to move or delete the selected elements.

### Requirement

Update `components/editor/board-client.tsx`

- **Visual Bounding Box:** When an element is selected (`selectedElementId`), render a dashed bounding box around it.
  - Calculate the bounding box (`minX`, `minY`, `maxX`, `maxY`) based on the shape type and its coordinates/points.
  - Add a small padding (e.g., 8px) around the calculated bounds.
  - Draw the bounding box using a distinctive stroke style (e.g., `#3b82f6` color and dashed line).
- **Selection Mechanics:**
  - Clicking on an element with the `select` tool should set it as the active `selectedElementId`.
  - Clicking on the canvas background should deselect the current element.
- **Move Elements:**
  - Dragging a selected element should update its coordinates, moving it across the canvas.
  - Emitting the changes via `board-state-change` over WebSockets when the drag finishes (`pointerup` or `mouseup`), along with saving history and board state.
- **Delete Elements:**
  - Bind a keyboard listener for `Delete` and `Backspace` keys.
  - If there is an active `selectedElementId`, remove that element from the `elements` array.
  - Update `history`, emit the changes to WebSockets, and save the updated board state.
  - Clear the selection after deletion.

### Check when done

- Selected elements display a visible dashed bounding box.
- Bounding box accurately encapsulates different shape types (pencil strokes, circles, shapes, text).
- Selected elements can be dragged, and their new position is synced with collaborators.
- Pressing `Delete` or `Backspace` removes the selected element and syncs the removal with collaborators.
- No typescript errors.
- No lint errors.
