# Real-Time Collaboration Board

A web-based collaborative whiteboard application allowing users to draw, add shapes, write text, and track cursors in real-time. Built with Next.js, HTML5 Canvas, Socket.IO, Redis, and Prisma.

## Features

- **Core Canvas & Drawing:** Infinite or fixed-size HTML5 Canvas with freehand drawing, shapes (rectangles, circles, lines, arrows), and text insertion. Color and stroke width selection.
- **Real-Time Collaboration:** Instant multi-user collaboration through Socket.IO. Room generation via unique URLs. Live multiplayer cursors with names and colors. Redis Pub/Sub for multi-server scaling.
- **UX & Utility:** Full Undo / Redo functionality. Select, move, and delete existing elements. Responsive design and error handling.
- **Persistence:** Automatic, debounced persistent saving to a PostgreSQL database via Prisma.
- **Export:** Export your board as cropped PNG or PDF with background transparency support.

## Tech Stack

- **Framework:** Next.js (App Router), React, TypeScript
- **Styling:** Tailwind CSS
- **Drawing Engine:** HTML5 Canvas API
- **Real-time:** Socket.IO
- **Scaling:** Redis Pub/Sub
- **Database:** PostgreSQL + Prisma ORM
- **Package Manager:** pnpm

## Getting Started

### Prerequisites

- Node.js (v20+)
- pnpm
- PostgreSQL database
- Redis server

### Installation

1. **Clone the repository**

   ```bash
   git clone <your-repo-url>
   cd collaboration-board
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory and add the required variables.

   ```env
   DATABASE_URL="postgres://postgres:postgres@localhost:5432/collab-board"
   NEXT_PUBLIC_SOCKET_URL="http://localhost:3001"
   ```

4. **Initialize the database**

   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Run the development server**
   Start the Next.js app and the Socket.IO server together:

   ```bash
   pnpm dev
   ```

   The app will be available at [http://localhost:3000](http://localhost:3000) and the Socket.IO server runs on port 3001.

## Usage

1. Open the application.
2. Create a new board or join an existing one using a unique URL ID.
3. Select a tool from the toolbar to start drawing or adding shapes.
4. Share the URL with others to collaborate in real-time.

## Architecture

- **Client/Canvas:** Handles the full-screen React component wrapping the `<canvas>` element and pointer events.
- **WebSocket Server:** Processes room assignments and broadcasts elements or transformations to other clients.
- **Persistence:** Debounced saving of canvas state (JSON) to PostgreSQL.
- **Export:** Handles generating downloadable artifacts (PNG/PDF) with cropping logic.

## Contributing

Contributions are welcome! Please follow the code standards and architectural invariants when submitting improvements.

## License

This project is licensed under the MIT License.
