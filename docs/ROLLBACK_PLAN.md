# Rollback plan

1. Disable or remove the service-worker registration in `src/main.tsx`.
2. Restore the exact baseline artifact:
   `ORKIO_FRONTEND_V2_PREMIUM_ROOT_READY.zip`.
3. Restore baseline `index.html`, `server.mjs`, `src/App.tsx`,
   `src/main.tsx` and `src/styles.css`.
4. Remove `public/`, PWA components, hooks and routes added by Alpha 2.
5. Publish the rollback under a new service-worker version.
6. Validate that installed clients receive the rollback and old caches are
   removed.
7. Preserve the failed artifact and browser evidence for AO-01.

No database or backend rollback is required by this frontend-only proposal.
