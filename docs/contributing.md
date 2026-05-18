# Contributing

Thanks for contributing! This file contains minimal guidelines to keep contributions focused and reviewable.

Workflow

1. Create a branch with a descriptive name: `feature/add-foo`, `fix/login-bug`, or `docs/improve-api`.
2. Keep changes small and focused. One PR per feature or bugfix.
3. Include tests or a short manual verification checklist for non-trivial changes.
4. Open a PR and include a short description of the problem, your approach, and any migration steps.

Code style

- Keep TypeScript types accurate and prefer small utility functions in `lib/` instead of duplicating logic.
- If adding new endpoints, document them in `docs/api.md`.

Local testing

- Run `yarn build` to surface TypeScript errors and ensure the app compiles.

Communication

- Add a short note in the PR about how the change can be exercised locally (e.g. example curl requests or UI steps).
