# Local v1 host-web harness

The v1 harness runs the host Next.js checkout against the standalone backend
owned by `jagalchi-infra`. It never enables MSW and does not synthesize backend
success.

Prepare a mode-600 infra environment file containing the locked source paths,
provider matrix, `LOCAL_SEED_EMAIL`, and `LOCAL_SEED_PASSWORD`. The Infra
checkout must expose `deploy/local-doctor.sh`, `deploy/local-up.sh`, and
`deploy/local-seed.sh`. The API checkout must expose `pnpm dev:seed -- --json`.
The seed command's final stdout line must be JSON with `schemaVersion: 1` and
UUID `userId`, `projectRunId`, and `roadmapId` fields. Credentials must never be
printed.

Start the backend, seed it, and launch the host development server:

```sh
./scripts/dev-v1.sh /absolute/path/to/jagalchi-infra /absolute/path/to/local.env
```

Build the production web app and run the dedicated real-backend Playwright
entry chain:

```sh
./scripts/test-v1-local-e2e.sh /absolute/path/to/jagalchi-infra /absolute/path/to/local.env
```

Both commands fail before startup if the locked checkout paths, seed command,
Infra scripts, environment permissions, or seed manifest contract are missing.
The E2E test logs in with the seeded account, reads the seeded Project Run and
Roadmap through the real same-origin proxy, renders the Project Run page, and
asserts that no service worker is registered.
