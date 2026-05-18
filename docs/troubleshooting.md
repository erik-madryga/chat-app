# Troubleshooting

Short notes for common issues you might encounter while running the project locally.

1) Build or runtime errors related to Node version

- The repository includes a `.nvmrc` which specifies the Node version used during development. Use `nvm use` or select a compatible Node runtime.

2) Yarn / Corepack issues

- If you see errors from Yarn, ensure Corepack is enabled and the project Yarn version is pinned:

```bash
corepack enable
yarn set version berry
```

3) Authentication failures

- Ensure `JWT_SECRET` is set in `.env.local` for non-production testing. If the app falls back to the built-in `dev-secret`, tokens are only suitable for local testing.

4) Blob client / data read-write errors

- If `lib/blobClient.ts` attempts to use a remote blob and you don't have a `BLOB_READ_WRITE_TOKEN`, you'll see errors when `readJSON` or `writeJSON` run. Either set `BLOB_READ_WRITE_TOKEN` or add the simple FS fallback described in `docs/blob-storage.md`.

5) Rate-limit blocks during signup/login tests

- The app applies simple in-memory rate-limiting (per-process) for signup and login endpoints. If you hit `429`, wait a minute or restart the dev server to reset the in-memory buckets.

6) Resetting example data

- Restore the committed seed files under `data/`:

```bash
git checkout -- data/
```

7) Cookies not persisting in the browser

- Make sure your browser is not blocking cookies for `localhost` and that you aren't sending requests from a different port or origin without a proper cookie setup.

If you still have trouble, open an issue or ask for help with the exact error messages and the steps you took.
