# Live Collaboration

Real-time multi-user syncing layer behind the session model so all joined users can see each other’s board updates live.

### Requirements

- Create a board session from the editor so one user can generate a shareable collaboration link.
- When a user opens the collaboration dialog, they should enter a display name and receive a unique session URL for that board.
- The session link must be read-only for the viewer side, while the host can continue editing the canvas.
- The board should support room-based collaboration using a unique room identifier, and users joining the same link should land in the same live session.
- On join, the client should connect to the real-time server and register the user in the room before syncing canvas state.
- When a new user joins, the server should send the latest board state to that client so they start in sync with current content.
- Each canvas action, including drawing, moving, deleting, and undo/redo changes, must be broadcast to all connected users in the room.
- Live updates should be applied without requiring a page refresh and should respect the current board state in the shared session.
- Show each connected user’s cursor on the canvas with a unique color and display name so collaboration is visible in real time.
- Track pointer movement and emit cursor coordinates to the room so remote cursor positions update smoothly.
- Maintain a user presence list showing active collaborators, their names, and online status.
- Detect disconnects and reconnects so the board state can be re-synced and removed participants are no longer shown as active.
- Save session metadata in the database, including board id, room id, participants, created_at, and updated_at.
- Keep collaboration state isolated per board so users in one room cannot see or edit another room’s data.
- Use the existing board persistence flow so live edits are preserved and recoverable after reload or reconnect.
- Provide a clear way to stop the collaboration session from the UI and disconnect all participants from the live room.
- Show connection status or error states when the real-time service is unavailable or a user cannot join a board.

### Technical Notes

- The board id from the current session should be used as the room key for all live collaboration events.
- Socket.IO events should be scoped to the room so only users in that board receive updates.
- The initial sync order should favor active room participants first, with PostgreSQL hydration used only if no active client can provide current state.
- Cursor coordinates and participant metadata should be lightweight to avoid heavy payloads on every pointer movement.
- Board updates should still be debounced for persistence, while collaboration messages should remain real-time and low latency.
- use typescript

### Check when done

- new components compile without typescript errors
- no lint errors
- users can join the same board using a shareable link
- drawings and edits sync across connected clients in real time
- cursor positions and names are visible for all collaborators
- presence status updates correctly when users connect or disconnect
- board state is restored after refresh or reconnect
- collaboration session can be ended cleanly from the UI
- use pnpm
