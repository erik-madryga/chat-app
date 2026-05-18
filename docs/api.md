# API Reference (server routes)

This file lists the public server API endpoints implemented under `app/api/` and their expected behavior. All endpoints return `application/json` unless noted otherwise.

Auth

- `POST /api/auth/signup` — create a new user.
  - Body: `{ "username": string, "password": string }`
  - Response: `201` with `{ user: { id, username } }` and a `Set-Cookie` header (session cookie).
- `POST /api/auth/login` — sign in with username/password.
  - Body: `{ "username": string, "password": string }`
  - Response: `200` with `{ user: { id, username } }` and a `Set-Cookie` header.
- `POST /api/auth/logout` — clears the session cookie.
  - Response: `200` with `{ message: 'Signed out' }` and `Set-Cookie` to clear cookie.
- `GET /api/auth/me` — returns the authenticated user or `null`.
  - Response: `200` with `{ user: { id, username } | null }`.
- `GET /api/auth/google` — initiates Google OAuth (302 redirect, sets state cookie).
- `GET /api/auth/google/callback` — OAuth callback; exchanges code for profile, creates/updates user, sets session cookie, and redirects to `/chats`.

Chat & Messages

- `GET /api/chats` — list sessions for the authenticated user.
  - Requires auth (session cookie).
  - Response: `{ sessions: ChatSession[] }`.
- `POST /api/chats` — create a new chat session.
  - Body: `{ participantUsernames: string[], groupName?: string }`
  - Response: `201` with `{ session }`.
- `GET /api/chats/:sessionId/messages` — fetch messages for a session.
  - Query params: `?limit=50&before=<ISO-timestamp>`
  - Response: `{ messages: Message[] }`.
- `POST /api/chats/:sessionId/messages` — post a new message to a session.
  - Body: `{ content: string }`
  - Response: `201` with `{ message }`.
- `GET /api/chats/:sessionId/stream` — SSE stream for new messages.
  - Returns `text/event-stream`. Clients should maintain the request open to receive `event: message` chunks.

Connections / Social

- `GET /api/connections` — returns `connectedUsers`, `incomingRequests`, `outgoingRequests` for the authenticated user.
- `GET /api/connections/search?q=` — username search (minimum 2 chars). Returns users and connection statuses.
- `POST /api/connections/requests` — send a connection request. Body: `{ toUserId: string }`.
- `PATCH /api/connections/requests` — respond to or cancel a request. Body: `{ requestId: string, action: 'accept'|'decline'|'cancel' }`.

Users

- `GET /api/users` — returns users that are connected to the authenticated user (safe subset `id` and `username`).

Examples

Sign up and persist cookies for later requests (curl):

```bash
curl -c cookies.txt -H "Content-Type: application/json" -X POST -d '{"username":"alice","password":"pass123"}' http://localhost:3000/api/auth/signup
# reuse cookies for authenticated requests
curl -b cookies.txt http://localhost:3000/api/chats
```

Notes

- Most endpoints use `getUserIdFromRequest(req)` in `lib/auth.ts` to enforce authentication (JWT stored in an HttpOnly cookie).
- Rate limits are applied to sensitive endpoints (signup/login) using `lib/rateLimit.ts`.
