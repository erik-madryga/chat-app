# Authentication

Authentication in this project is intentionally small and self-contained to make local development and interviews straightforward.

How it works

- The server issues JSON Web Tokens (JWTs) that contain a `userId` claim. Tokens are signed with the value of `process.env.JWT_SECRET`.
- A signed token is set into an HttpOnly cookie named `token` using `createSessionCookie(...)` from `lib/auth.ts`.
- Incoming API requests call `getUserIdFromRequest(req)` to extract the token from the `cookie` header and validate it with `verifyToken(...)`.

Cookie properties

- `HttpOnly` — not accessible from JavaScript
- `SameSite=Strict` — prevents cross-site request leaks
- `Path=/` — cookie is sent on all requests
- `Max-Age` — set to 7 days by default

Dev vs. Production

- When `NODE_ENV === 'production'`, `lib/auth.ts` throws if `JWT_SECRET` is not set. In development the code falls back to a `dev-secret` default — DO NOT use that in production.

Google OAuth flow

- `GET /api/auth/google` — generates a random state token, stores it in an HttpOnly `oauth_state` cookie, and redirects the browser to Google's OAuth consent page.
- `GET /api/auth/google/callback` — verifies the `state` cookie, exchanges the `code` for an access token, fetches the user's profile, maps or creates a local user, then sets the session cookie and redirects to `/chats`.

Testing locally

- For local testing without OAuth, use `POST /api/auth/signup` and `POST /api/auth/login` to create and sign in users.
- To use Google OAuth locally, configure a Google OAuth client and add `http://localhost:3000/api/auth/google/callback` as an authorized redirect URI.
