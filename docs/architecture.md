# Architecture Overview

This document gives a high-level view of how the Chat App is organized and where to look when you want to understand or extend its behavior.

## System Architecture

The application follows a layered architecture where the Next.js App Router serves both the UI and the API. All server-side business logic is accessed through API routes, which delegate to library helpers for auth, chat, and connection logic. Data flows through a single storage abstraction (`blobClient`) that currently persists JSON documents to Vercel Blob.

```mermaid
graph TB
    subgraph Client["Client (Browser)"]
        Pages["Pages<br/>app/page.tsx<br/>app/sign-in/page.tsx<br/>app/chats/page.tsx"]
        Components["Components<br/>ChatApp · AuthForm<br/>SiteHeader · HomeActions"]
        Hooks["Hooks<br/>useMessages · useChatStore<br/>useUserStore"]
        SSEClient["EventSource<br/>(SSE Client)"]
    end

    subgraph NextJS["Next.js App Router"]
        subgraph APIRoutes["API Routes — app/api/"]
            AuthRoutes["Auth Routes<br/>/auth/signup · /auth/login<br/>/auth/logout · /auth/me<br/>/auth/google · /auth/google/callback"]
            ChatRoutes["Chat Routes<br/>/chats · /chats/[sessionId]/messages<br/>/chats/[sessionId]/stream"]
            ConnRoutes["Connection Routes<br/>/connections · /connections/search<br/>/connections/requests"]
            UserRoutes["User Routes<br/>/users"]
        end

        subgraph Lib["Library Layer — lib/"]
            Auth["auth.ts<br/>JWT sign/verify<br/>cookie helpers"]
            ChatClient["chatClient.ts<br/>sessions · messages<br/>user-state"]
            ConnClient["connectionClient.ts<br/>requests · status"]
            RateLimit["rateLimit.ts<br/>in-memory throttle"]
            Types["types.ts<br/>User shape"]
        end

        BlobClient["blobClient.ts<br/>readJSON · writeJSON · deleteJSON"]
    end

    subgraph Storage["Storage Backend"]
        VercelBlob["Vercel Blob<br/>(@vercel/blob)"]
    end

    Pages --> Components
    Components --> Hooks
    Components -- "fetch / axios" --> APIRoutes
    SSEClient -- "EventSource" --> ChatRoutes
    Hooks -- "fetch / axios" --> APIRoutes

    AuthRoutes --> Auth
    AuthRoutes --> RateLimit
    ChatRoutes --> Auth
    ChatRoutes --> ChatClient
    ConnRoutes --> Auth
    ConnRoutes --> ConnClient
    UserRoutes --> Auth

    ChatClient --> BlobClient
    ConnClient --> BlobClient
    Auth --> BlobClient

    BlobClient --> VercelBlob
```

## Four-Layer Mental Model

When reasoning about or changing this app, think of it as four layered systems. Most changes should preserve this layering.

```mermaid
graph LR
    subgraph L1["1 · Identity"]
        direction TB
        A1["Users authenticate into a<br/>local JWT session, whether<br/>via password or Google OAuth"]
    end

    subgraph L2["2 · Social Graph"]
        direction TB
        A2["Connection requests determine<br/>who a user is allowed to<br/>start new chats with"]
    end

    subgraph L3["3 · Chat Persistence"]
        direction TB
        A3["Sessions and messages are<br/>JSON documents updated<br/>through chatClient"]
    end

    subgraph L4["4 · Client Experience"]
        direction TB
        A4["ChatApp stitches sessions,<br/>connections, messages, and<br/>SSE into a single workspace"]
    end

    L1 --> L2 --> L3 --> L4
```

- **Identity**: Google OAuth does not create a parallel session system — it maps Google identity into the existing local user/session model. All auth paths issue the same JWT cookie.
- **Social Graph**: Connection requests are the gatekeeper for new chats. Accepting a connection does *not* automatically create a chat session; the user must explicitly start one.
- **Chat Persistence**: Sessions and messages are separate JSON documents. Each participant also has a `user-state` index for fast session listing.
- **Client Experience**: `ChatApp.tsx` is the main surface and manages auth checks, session lists, connection states, search, and message display using primarily component-local React state.

## Core Ideas

| Concern | Implementation | Key File(s) |
|---|---|---|
| Framework | Next.js 15 App Router + TypeScript (`strict: true`) | `next.config.mjs`, `tsconfig.json` |
| Storage abstraction | `readJSON` / `writeJSON` / `deleteJSON` backed by `@vercel/blob` | `lib/blobClient.ts` |
| Business logic | Chat sessions, messages, and connection requests | `lib/chatClient.ts`, `lib/connectionClient.ts` |
| Auth | JWT signing/verification, cookie helpers, Google OAuth | `lib/auth.ts` |
| Realtime | Server-Sent Events (SSE) — **polling-based** (server re-reads messages every 1 second, not push-based) | `app/api/chats/[sessionId]/stream/route.ts` |
| Client state | Primarily component-local React state in `ChatApp.tsx`. Zustand stores exist in `hooks/` but are currently scaffolding, not the primary state model | `components/ChatApp.tsx`, `hooks/` |
| Rate limiting | In-memory per-process throttling for auth endpoints | `lib/rateLimit.ts` |

## Module Dependency Graph

```mermaid
graph TD
    APIAuth["API: auth/*"] --> auth["lib/auth.ts"]
    APIAuth --> rateLimit["lib/rateLimit.ts"]
    APIAuth --> blobClient["lib/blobClient.ts"]

    APIChats["API: chats/*"] --> auth
    APIChats --> chatClient["lib/chatClient.ts"]

    APIConn["API: connections/*"] --> auth
    APIConn --> connClient["lib/connectionClient.ts"]

    APIUsers["API: users"] --> auth
    APIUsers --> blobClient
    APIUsers --> connClient

    chatClient --> blobClient
    connClient --> blobClient
    auth --> blobClient

    blobClient --> vercelBlob["@vercel/blob"]

    ChatApp["components/ChatApp.tsx"] --> useMessages["hooks/useMessages.ts"]
    ChatApp --> useChatStore["hooks/useChatStore.ts"]
    ChatApp --> useUserStore["hooks/useUserStore.ts"]
```

## Primary Runtime Flow

```mermaid
sequenceDiagram
    participant Browser
    participant API as Next.js API Routes
    participant Lib as lib/ helpers
    participant Blob as Vercel Blob

    Browser->>API: POST /api/auth/signup or /login
    API->>Lib: auth.ts — hash/verify password
    Lib->>Blob: readJSON / writeJSON (users)
    API-->>Browser: Set-Cookie: token=<JWT>

    Browser->>API: GET /api/chats (with cookie)
    API->>Lib: auth.ts — getUserIdFromRequest
    Lib->>Blob: readJSON (user-state)
    API-->>Browser: { sessions: [...] }

    Browser->>API: POST /api/chats/:id/messages
    API->>Lib: chatClient.postMessage
    Lib->>Blob: readJSON + writeJSON (messages, session, user-state)
    API-->>Browser: { message }

    Browser->>API: GET /api/chats/:id/stream (SSE)
    loop Every 1 second
        API->>Lib: chatClient.getMessages
        Lib->>Blob: readJSON (messages)
        API-->>Browser: event: message (new messages only)
    end
```

## Where to Look First

| Area | Path | Description |
|---|---|---|
| Auth endpoints | `app/api/auth/` | Login, signup, logout, me, Google OAuth handlers |
| Chat endpoints | `app/api/chats/` | Session listing, creation, messages, SSE stream |
| Chat logic | `lib/chatClient.ts` | Session & message helpers and type definitions |
| Connection logic | `lib/connectionClient.ts` | Connection request lifecycle and status |
| Storage | `lib/blobClient.ts` | JSON persistence abstraction |
| UI + client logic | `components/` + `hooks/` | React components and client-side hooks |
| Seed data | `data/` | Checked-in JSON reference data |
| Types | `lib/types.ts` | `User` shape; chat/message types in `chatClient.ts` |

## Notes About Extensibility

- **Storage swap**: Replace `lib/blobClient.ts` with a DB-backed implementation (Prisma / Postgres / SQLite) and keep the `lib/*Client` helpers unchanged. The `readJSON`/`writeJSON` interface is the natural seam.
- **Realtime upgrade**: The current SSE implementation polls every second per connected client. Swap for WebSockets, Redis pub/sub, or a hosted realtime service (Pusher, Ably) for lower latency and reduced server load.
- **State management**: The Zustand stores (`useChatStore`, `useUserStore`) are ready scaffolding if you want to centralize client state away from `ChatApp.tsx` component-local state.
