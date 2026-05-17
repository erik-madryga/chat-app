Chat App — minimal Next.js + TypeScript scaffold

Quick start

1. Enable Corepack (if needed) and set Yarn to Berry:

```bash
corepack enable
yarn set version berry
```

2. Install dependencies:

```bash
cd chat-app
yarn install
```

3. Run dev server:

```bash
yarn dev
```

Notes
- Auth uses a simple JWT cookie for the MVP and a filesystem-backed data directory at `data/`.
- Later steps will replace the filesystem with Vercel Blob.

Production environment variables

Set these in Vercel before enabling real sign-in:

```bash
JWT_SECRET=generate-a-long-random-secret
BLOB_READ_WRITE_TOKEN=your-vercel-blob-token
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
```

Google OAuth setup

1. Create a Google OAuth web client in Google Cloud.
2. Add this authorized redirect URI:

```text
https://your-vercel-domain.vercel.app/api/auth/google/callback
```

3. Add a local redirect URI if you test locally:

```text
http://localhost:3000/api/auth/google/callback
```
