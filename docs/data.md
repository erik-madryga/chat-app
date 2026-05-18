# Data Layout

This project uses small JSON artifacts for persistence in development. The `data/` folder in the repository contains the initial seed data.

Top-level layout (important files and directories):

- `data/users/users.json` — array of user objects. See `lib/types.ts` for the `User` interface.
- `data/chats/sessions/*.json` — chat session metadata (id, participantIds, createdAt, updatedAt, lastMessagePreview, messageCount).
- `data/chats/messages/<sessionId>.json` — array of messages for each session. Each message has `{ id, sessionId, senderId, content, timestamp }`.
- `data/chats/user-state/<userId>.json` — per-user index of sessions for quick listing.
- `data/connections/requests.json` — connection/request objects used by `lib/connectionClient.ts`.

Where these shapes come from

- The `chatClient.ts` file defines the shape of sessions and messages and is the authoritative place to see the exact properties and read/write behavior.

Working with the data files

- For quick experiments, edit the JSON files directly. After editing, the app will pick up changes when requests call the storage helpers.
- To create users via the API, call `POST /api/auth/signup`.
- To list or reset data back to the committed seed state:

```bash
# restore only committed files under data/
git checkout -- data/
```

Important: persistent edits

- If you run the app in a deployment that uses the remote blob store (`BLOB_READ_WRITE_TOKEN`), changes made to the local `data/` directory are not automatically synchronized to the remote blob store. The repo is intentionally small to keep local demonstration simple.
