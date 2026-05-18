# Chat App

[![Visit App](https://img.shields.io/badge/Visit%20App-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://chat-app-umber-rho-14.vercel.app/)

A minimal, opinionated chat prototype built with Next.js (App Router) and TypeScript. This repository demonstrates a small-but-complete full‑stack flow: typed API routes, authentication, client & server state, simple persistence for local development, and an extensible file storage integration.

Key highlights

- **Framework:** Next.js 15 + TypeScript (App Router)
- **Styling:** Tailwind CSS
- **State:** Zustand for lightweight client state
- **Auth:** JWT cookie-based auth with optional Google OAuth
- **Storage:** Filesystem-backed `data/` for local development (optional Vercel Blob integration for production)
- **APIs:** Built-in API routes under `app/api/` (chats, users, auth, connections)

Why this repo is useful

- Small, focused codebase that still exercises real-world concerns: auth, persistence, file uploads, and rate-limiting.
- Clear separation between client UI and server API logic, with typed contracts in `lib/types.ts`.
- Designed to be easy to run locally for interviews or demos — minimal external setup required.

Getting started (local development)

Prerequisites

- Node.js 18+ (tested on 18/20)
- Corepack for Yarn compatibility

Install and run

```bash
# enable corepack (if not already enabled)
corepack enable
# pin Yarn to workspace version (this repo uses Yarn 4.x)
yarn set version berry

cd chat-app
yarn install
yarn dev
```

The app will start on `http://localhost:3000` by default.

Available scripts

- `yarn dev` — Start Next.js dev server
- `yarn build` — Build for production
- `yarn start` — Run built app

Environment variables

Create a `.env.local` in the `chat-app/` folder to provide the following variables for local development:

```env
# Required for authentication
JWT_SECRET=your_long_random_secret

# Optional: enable Google OAuth sign-in (create credentials in Google Cloud)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Optional: enable blob/file storage (e.g., Vercel Blob). Leave empty to keep filesystem-backed storage.
BLOB_READ_WRITE_TOKEN=...
```

- `JWT_SECRET`: used to sign JWT cookies. Generate a long random string for local/dev use.
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: required only if you want to test OAuth sign-in locally. Add a redirect URI for local testing: `http://localhost:3000/api/auth/google/callback`.
- `BLOB_READ_WRITE_TOKEN`: optional token to enable remote blob storage; the app falls back to the `data/` folder when this is not set.

Data & seeding

The repo includes a small filesystem-backed data directory (`data/`) with example users and messages so you can run and explore without a database. Inspect or reset test data in the `data/` folder.

Project structure (high level)

- `app/` — Next.js App Router pages and API routes. Look under `app/api/` for server endpoints (`auth`, `chats`, `connections`, `users`).
- `components/` — Reusable UI components (`ChatApp.tsx`, `AuthForm.tsx`, `SiteHeader.tsx`).
- `hooks/` — Custom React hooks (`useChatStore.ts`, `useMessages.ts`, `useUserStore.ts`).
- `lib/` — Server and client helpers (`auth.ts`, `chatClient.ts`, `connectionClient.ts`, `blobClient.ts`, `rateLimit.ts`, `types.ts`).
- `data/` — Local JSON files used for development (users, chats, messages).

Where to look first (recommended walkthrough)

1. `app/api/auth/` — authentication endpoints: sign-up, login, logout, and OAuth handlers.
2. `lib/auth.ts` — JWT creation/validation and helper auth functions.
3. `app/chats/` + `components/ChatApp.tsx` — the main chat UI and client integration.
4. `lib/blobClient.ts` — optional file storage integration (enabled when `BLOB_READ_WRITE_TOKEN` is present).

Design notes

- The server API routes are thin and intentionally synchronous with the filesystem to keep the learning surface small.
- Types are centralized in `lib/types.ts` so API request/response shapes are easy to understand and evolve.
- Zustand keeps client state minimal and predictable; hooks provide focused responsibilities for messages, users, and connections.

Testing & verification

- Quick sanity check: Type-check and build locally with `yarn build`. This will surface TypeScript errors and ensure the app compiles.

Extending this project

- Swap the filesystem `data/` layer for a real database (Postgres, SQLite, Prisma). Replace read/write helpers in `lib/`.
- Enable remote blob/file storage by providing a `BLOB_READ_WRITE_TOKEN` and configuring the blob client.
- Add automated tests (Jest / Playwright) and CI checks for linting and type-safety.

Contributing

Contributions are welcome. Open a PR or issue with a short description of the change. Keep changes focused and add tests where appropriate.

License

See the project `LICENSE` file for licensing details.
