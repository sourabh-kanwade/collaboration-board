# Project Tracker

Update this file after every meaningful implementation
change.

## Current Phase

- In progress

## Current Goal

- Implement live collaboration session flow

## Completed

- Project Sidebar (`components/editor/project-sidebar.tsx`)
- Editor Tool Bar (`components/editor/project-toolbar.tsx`) and Database auto-save
- Export Image functionality with preview modal (PNG, SVG, Clipboard) in `BoardClient` and `ProjectSidebar`
- Canvas strokes and text now follow the selected light/dark theme, including SVG exports
- Canvas background now automatically switches between default light/dark presets when the theme is toggled
- Element strokes now automatically switch between black and white for contrast with the selected background
- Live collaboration session modal with name capture, copyable share link, QR code, participant chips, and session stop action
- Session records persisted in Prisma and linked to the active board

## In Progress

- Verification and cleanup

## Next Up

- Final validation and build verification

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
