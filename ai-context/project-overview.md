# Real-Time Collaboration Board (Excalidraw Clone)

## Overview

A web-based collaborative whiteboard application allowing users to draw, add shapes, write text, and track cursors in real-time.

## Goals

#### 1. Core Canvas & Drawing Mechanics

Goal: Build the client-side whiteboard UI and core rendering logic using the Canvas API.

- Canvas Initialization: Create a full-screen React component wrapping the HTML5 `<canvas>` element. Handle window resize and resolution scaling (devicePixelRatio).

- State Management: Define the data structure for canvas elements (e.g., freehand paths, rectangles, circles, text).

- Tool Selection UI: Build a toolbar for selecting tools: Select, Freehand Draw, Rectangle, Circle, Line, Text.

- Drawing Logic: Implement mouse/touch event listeners (pointerdown, pointermove, pointerup) to capture user input and render shapes/paths to the canvas.

- Text Rendering: Implement an overlay text input that renders to the canvas upon losing focus.

#### 2. Real-Time Collaboration & Room Management

Goal: Enable multiple users to interact on the same board simultaneously.

- Room Management: Allow users to create or join a board using a unique URL ID. Implement Socket.IO join(roomId) logic.

- State Synchronization: When a user draws an element, emit the element_added or element_updated event to the server, which broadcasts it to the room.

- Initial State Load: When a new user joins a room, request the current canvas state from other clients or the database to sync them up.

- Live Cursor Tracking: Capture pointermove events and emit the user's X/Y coordinates and user color/ID. Render other users' cursors as custom absolute-positioned overlays on top of the canvas.

#### 3. Advanced Canvas Features (Undo/Redo & Selection)

Goal: Improve user experience with standard editor functionalities.

- Undo/Redo Stack: Implement two stacks (history and future). Save snapshots or delta actions on every pointerup. Bind to Ctrl+Z and Ctrl+Shift+Z.
- Element Selection: Implement a bounding box detection system to allow users to click and select previously drawn shapes/strokes.
- Move/Transform: Allow users to drag selected elements to new coordinates. Broadcast these transformations via WebSockets.

#### 4. Persistence

Goal: Save board progress so users can return to their work later.

- Auto-save Mechanism: Implement a debounced save function that sends the serialized canvas state (JSON) to the PostgreSQL database every few seconds when changes are detected.
- DB Hydration: Modify the room join logic to fetch the latest board state from PostgreSQL if no active clients are in the room.

#### 5. Export & Final Polish

Goal: Allow users to download their creations.

- PNG Export: Use the Canvas toDataURL('image/png') method. Implement logic to crop the output to the bounding box of drawn elements and handle background transparency.
- PDF Export: Integrate a library like jsPDF. Draw the canvas image into the PDF document and trigger a browser download.
- UI Polish: Add loading states, error handling (e.g., connection lost), and styling refinements using Tailwind.

## Core User Flow

1. Create or join a board
   - User creates a new board or opens a board using a unique URL/Board ID.
   - The user joins the corresponding real-time collaboration room.
2. Load board
   - Existing board state is loaded from PostgreSQL.
   - Canvas is initialized and rendered.
3. Create content
   - User selects a tool:
     - Select
     - Freehand
     - Rectangle
     - Circle
     - Line
     - Text
   - User draws or adds elements to the canvas.
4. Collaborate in real time
   - Changes are sent through Socket.IO.
   - Other users in the same room immediately receive the changes.
   - Other users' cursors are displayed with their IDs/names and colors.
5. Edit board
   - User selects, moves, transforms, or deletes elements.
   - User can use Undo/Redo.
6. Persist changes
   - Board state is automatically saved to PostgreSQL after changes.
7. Export
   - User exports the completed board as PNG or PDF.

## Features

#### Core Features

- Infinite or fixed-size Canvas
- Freehand drawing
- Shape rendering (Rectangles, Circles, Lines, Arrows)
- Text insertion
- Color and stroke width selection

#### Collaboration features

- Room generation via URL
- Live WebSocket synchronization of elements
- Live multiplayer cursors with names/colors

#### UX & Utility

- Undo / Redo functionality
- Select, move, and delete existing elements
- Persistent saving to PostgreSQL
- Export board as PNG
- Export board as PDF

## Scope

### In Scope

- Canvas & Drawing
  - Full-screen HTML5 Canvas
  - Freehand drawing
  - Rectangles
  - Circles
  - Lines
  - Arrows
  - Text
  - Color selection
  - Stroke-width selection
  - Select, move, and delete elements
- Real-Time Collaboration
  - Create/join boards using unique URLs
  - Socket.IO-based real-time synchronization
  - Multiplayer cursor tracking
  - User names/colors for cursors
  - Room-based collaboration
  - Redis Pub/Sub for multi-server scaling
- Persistence
  - PostgreSQL database
  - Board state stored as JSON
  - Automatic/debounced saving
  - Restore board state when users return
- Editor Features
  - Undo
  - Redo
  - Element selection
  - Element movement/transformation
- Export
  - PNG export
  - PDF export
  - Crop exported image to the drawn content
  - Background transparency support
- UX
  - Loading states
  - Connection-lost/error handling
  - Responsive canvas
  - Basic Tailwind-based UI polish

### Out of Scope

For the initial MVP, keep these out unless they become necessary later:

- Public/private sharing permissions
- Comments and reactions
- Board templates
- External integrations
- Mobile-native applications
- Advanced shape libraries
- Image/video uploads
- AI-assisted drawing
- Advanced vector editing
- Offline-first synchronization
- Conflict-resolution/versioning beyond the planned real-time state synchronization

## Success Criteria

1. Board Creation & Access
   - A user can create/open a board through a unique URL.
   - Multiple users can join the same board/room.
2. Drawing
   - Users can draw freehand paths.
   - Users can create rectangles, circles, lines/arrows, and text.
   - Canvas interactions work smoothly with pointer input.
3. Real-Time Collaboration
   - When User A adds or updates an element, User B sees the change without refreshing.
   - Multiple users can work on the same board simultaneously.
   - User cursors are visible to other participants.
4. Editing
   - Users can select and move existing elements.
   - Undo and redo work reliably.
   - Elements can be deleted.
5. Persistence
   - Board changes are automatically saved.
   - Refreshing or leaving/rejoining the board restores the latest saved state.
6. Scaling
   - Redis Pub/Sub successfully synchronizes Socket.IO events when multiple server instances are running.
7. Export
   - Users can export the board as PNG.
   - Users can export the board as PDF.
8. Reliability
   - Connection failures display an appropriate error/loading state.
   - The application does not lose persisted board data when a client disconnects.
   - MVP Success Test

   Two users open the same board URL, draw simultaneously, see each other's drawings and cursors in real time, move/undo elements, refresh the page without losing saved work, and successfully export the final board as PNG/PDF.

   That single scenario is a strong end-to-end acceptance test for the project.
