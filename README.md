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
