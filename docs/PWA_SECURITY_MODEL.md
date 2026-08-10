# PWA security model

The service worker may cache only:

```text
public offline page
manifest
public icons
same-origin versioned static assets
SPA HTML shell without private payloads
```

It must never cache or intercept:

```text
/api/*
/auth*
/oidc*
/realtime*
/stream*
/events*
/sockjs*
/admin*
/env.js
requests carrying Authorization
non-GET requests
cross-origin requests
```

Private user, tenant, thread and message data remains network-only.

The offline page explicitly states that authentication, private messages and
operations require a secure connection.
