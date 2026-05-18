# Architecture Overview

This document gives a high-level view of how the Chat App is organized and where to look when you want to understand or extend its behavior.

Core ideas

- Framework: Next.js (App Router) + TypeScript. Server code and API routes live under `app/api/` and page/ui code lives under `app/` and `components/`.
- Storage abstraction: `lib/blobClient.ts` provides `readJSON` / `writeJSON` / `deleteJSON` and is used throughout the server code to persist small JSON artifacts.
- Business logic: `lib/chatClient.ts` and `lib/connectionClient.ts` implement chat/session/message and connection/request logic on top of the storage abstraction.
- Auth: `lib/auth.ts` implements JWT signing/verification and helper functions for creating and clearing the session cookie.
- Realtime: a simple Server-Sent Events (SSE) stream is exposed at `app/api/chats/[sessionId]/stream/route.ts` to push new messages to the UI.
- Client state: lightweight state management with Zustand in `hooks/`.

Primary runtime flow (simplified)

1. User signs up / logs in via `app/api/auth/*` endpoints which set an HttpOnly JWT cookie.
2. Authenticated client requests hit API routes under `app/api/`; each route calls `getUserIdFromRequest(req)` to obtain the current user id.
3. API routes use the storage abstraction (`readJSON` / `writeJSON`) and higher-level helpers in `lib/` to read/write sessions, messages, users, and connection requests.
4. The chat UI uses the SSE stream endpoint and periodic fetches to display messages and session updates.

Where to look first

- `app/api/auth/` — auth endpoints (login/signup/logout/me, Google OAuth handlers)
- `app/api/chats/` — session listing, creation, messages, SSE stream
- `lib/chatClient.ts` — chat session & message helpers and schemas
- `lib/connectionClient.ts` — connection request lifecycle
- `components/` + `hooks/` — UI and client-side logic
- `data/` — seed/sample JSON data used for local development

Types

- User shape: `lib/types.ts`
- Chat and Message shapes: defined in `lib/chatClient.ts`

Notes about extensibility

- Storage swap: replace `lib/blobClient.ts` with a DB-backed implementation (Prisma / Postgres / SQLite) and keep the `lib/*Client` helpers unchanged.
- Realtime upgrade: swap SSE for WebSockets or a real-time backend (Redis pub/sub, Pusher, etc.) if you need lower latency or more advanced presence features.
