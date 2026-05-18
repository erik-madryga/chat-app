# Local Development

Quick guide to get the project running locally and minimal notes to help other developers reproduce your environment.

Prerequisites

- Node: this repo includes a `.nvmrc` (Node `22.12.0`). Use `nvm use` or any Node manager to match the runtime.
- Corepack + Yarn (the project uses Yarn 4 / Berry). If you don't have Corepack enabled, run:

```bash
corepack enable
yarn set version berry
```

Install and run

```bash
cd chat-app
yarn install
yarn dev
```

The app listens on `http://localhost:3000` by default.

Build / type-check

```bash
yarn build
```

Environment variables

Create a `.env.local` file inside the `chat-app/` folder with the following minimal variables for local development:

```env
# required for token signing
JWT_SECRET=your_long_random_secret

# optional: Google OAuth (only if you want to test OAuth flows)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# optional: remote blob storage (Vercel Blob). When empty the repo includes local `data/` used as seed files.
BLOB_READ_WRITE_TOKEN=...
```

- `JWT_SECRET` — required to sign session JWTs in development. Do NOT use a short or predictable secret in production.
- `GOOGLE_CLIENT_*` — required only if testing Google OAuth. Add a redirect URI for local testing: `http://localhost:3000/api/auth/google/callback`.
- `BLOB_READ_WRITE_TOKEN` — optional. `lib/blobClient.ts` uses `@vercel/blob` when this is set.

Seed data and accounts

- A small set of seed files exists under `data/` (e.g. `data/users/users.json`, `data/chats/messages/`). Use `POST /api/auth/signup` to create local accounts or modify `data/users/users.json` directly for quick experiments.

Resetting sample data

If you modify files under `data/` and want to restore the original committed state:

```bash
# reset all committed files under the data directory
git checkout -- data/
```

Debugging tips

- If you see authentication failures, make sure your browser is accepting cookies and that `JWT_SECRET` is set.
- If the app fails to read or write JSON via the blob client and you don't intend to use remote blob storage, either set `BLOB_READ_WRITE_TOKEN` or add a small FS fallback in `lib/blobClient.ts` (see `docs/blob-storage.md`).

Next steps for a dev machine

- (Optional) Add a small script to seed admin/test accounts via `curl` against `POST /api/auth/signup` so interviews and demos can sign in quickly.
