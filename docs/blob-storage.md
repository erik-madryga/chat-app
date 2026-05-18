# Blob / Storage

Storage in this project is accessed through the `lib/blobClient.ts` abstraction which exposes `readJSON`, `writeJSON`, and `deleteJSON`. The implementation in this repo uses the `@vercel/blob` client when a `BLOB_READ_WRITE_TOKEN` is available.

Configuration

- `BLOB_READ_WRITE_TOKEN` — when set, `lib/blobClient.ts` calls `get` / `put` / `del` from `@vercel/blob` to persist JSON documents at keys such as `users/users.json` and `chats/messages/<sessionId>.json`.

Local development

- The repository contains a `data/` directory with seed JSON files for quick local demos. If you don't want to use a remote blob storage in local development you can either:

  - Keep using the `data/` files as the canonical seed source and avoid setting `BLOB_READ_WRITE_TOKEN`, or
  - Replace the blob client with a small filesystem fallback that reads/writes to `data/` when `BLOB_READ_WRITE_TOKEN` is not set.

Example: small FS fallback (development-only)

```ts
// in lib/blobClient.ts (development helper)
import fs from 'fs/promises'
import path from 'path'

const dataDir = path.join(process.cwd(), 'data')

export async function readJSON(key: string) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const text = await fs.readFile(path.join(dataDir, key), 'utf8')
      return JSON.parse(text)
    } catch (err: any) {
      if (err.code === 'ENOENT') return null
      throw err
    }
  }
  // otherwise use @vercel/blob (existing logic)
}
```

Notes

- If you enable a remote blob store for production, be aware that running locally and running in production operate on different storage backends. Changes made locally to `data/` will not automatically propagate to a remote blob store.
