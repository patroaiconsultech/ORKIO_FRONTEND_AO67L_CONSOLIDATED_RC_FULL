# Controlled smoke plan

Blocked until AO-01 approval and a materialized dependency environment.

```text
1. npm ci
2. npm test
3. npm run build
4. serve dist through server.mjs
5. verify /manifest.webmanifest MIME
6. verify /sw.js no-store + Service-Worker-Allowed
7. run Lighthouse on /
8. run Lighthouse on /app
9. Chrome Android install
10. Android standalone launch
11. Android offline public fallback
12. iPhone Safari Add to Home Screen
13. iPhone standalone launch and safe areas
14. iPad portrait, landscape and split view
15. verify /api and Authorization responses absent from Cache Storage
16. verify update banner and controlled activation
17. verify rollback
```
