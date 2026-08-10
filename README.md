# ORKIO v2 Premium Frontend — Functional Pre-OIDC Candidate

This repository contains the complete frontend source for the Plataforma Efatà
777 functional vertical slice.

Implemented:

- thread creation, listing and selection;
- message history;
- POST-based SSE client with `status`, `chunk`, `error` and terminal `done`;
- attachment upload through `FormData`;
- invitation creation and `/invite/:token`;
- controlled PWA update and protected cache boundaries;
- Authorization Code + PKCE client;
- `/auth/callback`, session expiry, logout and 401 cleanup;
- fail-closed UI while OIDC or API configuration is absent.

The SPA never contains a client secret. OIDC provider values are supplied only
through `VITE_OIDC_*` variables at build time.

Current gate:

```text
SOURCE_TESTS=80_PASS
LOCKFILE_VERIFY=PASS
TYPESCRIPT_SYNTAX=PASS
NPM_CI=NOT_EXECUTED_LOCAL_REGISTRY_BLOCKER
VITE_BUILD=NOT_EXECUTED_LOCAL_REGISTRY_BLOCKER
OIDC_PROVIDER=NOT_CONFIGURED
DEPLOY_EXECUTED=false
```

Use Git or GitHub Desktop. Do not upload this repository by dragging files into
the GitHub web interface because dotfiles such as `.npmrc` and `.github/` may be
omitted.
