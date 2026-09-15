# Architecture Context

## Stack

| Layer           | Technology                      | Role                                                                             |
| :-------------- | :------------------------------ | :------------------------------------------------------------------------------- |
| Framework       | Next.js + TypeScript            | Full-stack application foundation and App Router.                                |
| UI & Rendering  | Tailwind CSS + HTML5 Canvas API | User interface styling, toolbars, and core whiteboard rendering.                 |
| Real-time       | Socket.IO                       | WebSockets for live collaboration, element synchronization, and cursor tracking. |
| Scaling         | Redis                           | Pub/Sub messaging for Socket.IO cross-server scaling via the Redis Adapter.      |
| Database        | Prisma + PostgreSQL             | Persistent storage of the `Board` schema and serialized canvas state.            |
| Package Manager | pnpm                            | The main JavaScript package manager                                              |

## System Boundaries

- `Client/Canvas` — Owns the full-screen React component wrapping the `<canvas>` element, handles window resizing/scaling, and captures user pointer events for drawing.
- `WebSocket Server` — Owns real-time communication, processing room assignments via `join(roomId)`, and broadcasting elements or transformations to other clients.
- `Persistence/ORM` — Owns the automated, debounced saving of canvas state to the PostgreSQL database when changes are detected.
- `Export Tools` — Owns generating downloadable artifacts, including cropping logic for PNGs via Native Canvas API and PDF generation via jsPDF.

## Storage Model

- **PostgreSQL Database**: Persistent storage housing the `Board` schema, which includes the board `id`, `name`, `state JSON` (serialized canvas state), `created_at`, and `updated_at`.
- **Redis (Pub/Sub)**: Ephemeral storage and message broker routing real-time drawing events across multiple Node.js/Express server instances.

## Auth and Access Model

- **URL-Based Access**: Users access and collaborate on specific boards by navigating to a unique URL ID.
- **Room Isolation**: The unique URL ID acts as the identifier for Socket.IO rooms; users only broadcast to and receive updates from others in the same room.

## Invariants

1. **State Hydration Rule**: When a new user joins, they must request the current state from active clients first; database hydration should only occur if no active clients are in the room.
2. **Auto-save Protocol**: Continuous drawing events must not spam the database; saves must be debounced and trigger only every few seconds when changes are detected.
3. **Action Reversibility**: The application must maintain history and future stacks, capturing snapshots or action deltas specifically on `pointerup` to support Undo (`Ctrl+Z`) and Redo (`Ctrl+Shift+Z`).
4. **Export Integrity**: Downloaded images must crop directly to the bounding box of the drawn elements rather than exporting empty canvas space, and must handle background transparency correctly.
