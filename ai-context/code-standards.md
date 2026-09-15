# Code Standards

## General Best Practices

- **Single Responsibility**: Keep modules, components, and functions small and single-purpose.
- **Root Causes**: Fix root causes; do not layer workarounds on top of existing bugs.
- **Separation of Concerns**: Do not mix unrelated concerns in one component or route. Keep business logic separate from UI components.
- **Early Returns**: Use early returns to reduce nesting and improve code readability.
- **Self-Documenting Code**: Write clear, descriptive variable and function names. Use comments to explain _why_, not _what_.

## TypeScript

- **Strict Mode**: Strict mode is required throughout the project (`strict: true` in `tsconfig.json`).
- **Avoid `any`**: Do not use `any`. Use `unknown` if the type is truly not known ahead of time, and type-narrow it. Avoid `@ts-ignore` without a descriptive comment explaining why it's necessary.
- **Interfaces vs Types**: Prefer `interface` for object structures (especially for React props) and `type` for unions, intersections, and mapped types.
- **Runtime Validation**: Validate unknown external input at system boundaries before trusting it using a library like `zod`.

## Framework — Next.js (App Router)

- **Server Components by Default**: Default to React Server Components (RSC) to reduce client JavaScript payload and improve performance.
- **Strategic Client Components**: Add `'use client'` only at the leaf nodes or components where browser interactivity (hooks, state, event listeners) is strictly required.
- **Data Fetching**: Fetch data on the server in Server Components whenever possible. Use Next.js caching and revalidation features.
- **Server Actions**: Use Server Actions for form submissions and simple mutations to simplify data flow.
- **Route Handlers**: Keep route handlers (`route.ts`) focused on a single responsibility.

## React & Performance

- **Dependency Arrays**: Never lie to the `useEffect`, `useCallback`, or `useMemo` dependency array. Address the warnings instead of suppressing them.
- **Event Listeners**: Always clean up event listeners, intervals, and timeouts in the `useEffect` cleanup function to prevent memory leaks, especially critical for real-time applications.
- **Throttling & Debouncing**: Throttle or debounce high-frequency events (like window resizing, mouse movements on canvas, or WebSocket broadcasts) to avoid performance bottlenecks.
- **Memoization**: Use `useMemo` and `useCallback` judiciously to prevent unnecessary re-renders in heavy components like the canvas or real-time UI overlays.

## Real-time & WebSocket (Socket.IO)

- **Connection Management**: Handle connection drops and reconnections gracefully. Inform the user when they are offline or syncing.
- **Payload Size**: Keep WebSocket payload sizes small. Transmit only the changed state (deltas) instead of the entire canvas state when possible.
- **Namespaces & Rooms**: Use Socket.IO rooms securely to isolate collaboration boards. Validate user access before joining a room.

## Styling (Tailwind CSS & shadcn/ui)

- **Utility-First**: Use Tailwind CSS utility classes instead of writing custom CSS.
- **Dynamic Classes**: Use `clsx` and `tailwind-merge` (e.g., the `cn()` utility) when conditionally combining Tailwind classes to prevent style conflicts.
- **Theme Variables**: Use CSS custom property tokens for colors — no hardcoded hex values in components (refer to `ui-context.md`).
- **Consistency**: Follow the border radius scale and typography defined in the UI context.

## API Routes & Security

- **Validation**: Validate and parse request input (query parameters, body) using Zod before executing any logic.
- **Authorization**: Enforce authentication and ownership checks before any data mutation or reading sensitive data.
- **Consistent Responses**: Return consistent, predictable response shapes. Use proper HTTP status codes (e.g., 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 500 Internal Server Error).

## Data and Storage

- **Database Models**: Keep models normalized where appropriate, but optimize for read performance if necessary.
- **Canvas State**: Store canvas state efficiently (e.g., as compressed JSON). If individual element updates are needed, structure the schema to support atomic updates instead of full document replacements.
- **External Storage**: Large generated content (like exported PNGs or PDFs) should be generated dynamically or stored in blob storage (e.g., AWS S3, Vercel Blob) rather than directly in the database.

## File Organization

- `app/` — Next.js App Router pages, layouts, and route handlers.
- `components/` — Reusable React components.
  - `components/ui/` — Base shadcn/ui components.
  - `components/board/` — Feature-specific components related to the canvas and whiteboard.
- `lib/` — Utility functions, shared logic, and third-party library configurations (e.g., Prisma client, Socket instance).
- `hooks/` — Custom React hooks.
- `types/` — Global TypeScript definitions and shared interfaces.
- `context/` (or `store/`) — React Context providers or state management stores (e.g., Zustand) for global state.
