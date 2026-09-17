# Project Tracker

Update this file after every meaningful implementation
change.

## Current Phase

- In progress

## Current Goal

- Implement live collaboration session flow

## Completed

- Browser-scoped board IDs are now generated and persisted via a cookie so each browser keeps its own unique board instead of sharing the default room
- Refreshes no longer create a new board because the app reuses the stored browser board ID for the same browser session
- Stale boards older than 30 days are pruned before board creation or save operations, preventing the database from accumulating unused boards
- Real-time Socket.IO room sync for board state and cursors is connected to the client
- Live collaboration presence status and remote cursor overlays are displayed in the editor UI
- Collaboration session metadata remains tied to the active board and room
- Board updates are propagated across connected users without a page refresh
- Session lifecycle and join state are managed from the existing share-link flow
- Socket startup was corrected so the browser uses a stable socket URL and the Socket.IO server starts with the app for local development

- Project Sidebar (`components/editor/project-sidebar.tsx`)
- Editor Tool Bar (`components/editor/project-toolbar.tsx`) and Database auto-save
- Export Image functionality with preview modal (PNG, SVG, Clipboard) in `BoardClient` and `ProjectSidebar`
- Canvas strokes and text now follow the selected light/dark theme, including SVG exports
- Canvas background now automatically switches between default light/dark presets when the theme is toggled
- Element strokes now automatically switch between black and white for contrast with the selected background
- Live collaboration session modal with name capture, copyable share link, QR code, participant chips, and session stop action
- Session records persisted in Prisma and linked to the active board
- Session stop now requires and verifies the host identity
- Reused active sessions register new callers without duplicate participants
- Session hydration and stop failures are reported without closing the dialog
- Top-right collaboration control now mirrors the sidebar: connected sessions show Stop session, while disconnected state shows Live Session
- Undo and redo logic with `Ctrl+Z` and `Ctrl+Shift+Z`/`Ctrl+Y` keyboard shortcuts, synced across the live session

## In Progress

- Complete

## Next Up

- None

## Open Questions

- Pan, Select, and Text tools are currently disabled on the toolbar. When should they be implemented?
- Should we use a dynamic route (e.g. `/board/[id]`) for boards to support multiple distinct boards, since we currently use a single default board ID?

## Architecture Decisions

- Setup Prisma ORM with a PostgreSQL database.
- Created `Board` schema storing `elements` as JSON.
- `app/page.tsx` converted to a React Server Component to fetch initial board state, passing data to `BoardClient` client component.

## Session Notes

- Run `npm run dev` to test the board.
- Ensure a valid `DATABASE_URL` is set in `.env` for Prisma to connect to the Postgres database.
- Board element validation rejects non-finite IDs, bounds, and point coordinates.
