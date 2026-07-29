# Contributing to PayVaylt

Thanks for contributing to PayVaylt.

## Pull request expectations

1. Keep each pull request focused on one user-facing or platform-facing change.
2. Explain why the change matters, not only what changed.
3. Update docs and environment examples when setup or runtime behavior changes.
4. Make sure the GitHub Actions checks pass before requesting review.

## Project areas

- `app/` holds the Expo Router mobile experience.
- `backend/` holds the Express API, migrations, and provider integrations.
- `docs/` holds deployment and rollout notes.

## Before you open a pull request

- run `npm install` if dependencies changed
- run `npm run lint`
- run `npm run backend:db:migrate`
- confirm the backend health endpoint responds locally when backend code changes
- double-check that secrets and local-only files are not part of the diff
