# GitHub upload and build-materialization runbook

## Phase 1 — create the private frontend repository

1. Create the private repository.
2. Keep GitHub Actions disabled.
3. Extract the root-ready ZIP at repository root.
4. Create the initial branch and commit manually.
5. Configure CODEOWNERS and branch protection.
6. Require independent review for `.github/workflows`, `public/sw.js`,
   `package.json`, `package-lock.json` and `scripts/`.
7. Enable Actions only after the source commit is reviewed.

## Phase 2 — materialize the lockfile

Run only:

```text
Materialize reviewed npm lockfile
```

The workflow:

```text
uses Node 20.20.2
uses npm 10.8.2
uses registry.npmjs.org
creates package-lock.json once
verifies the lockfile
runs npm ci
runs tests
runs Vite build
uploads lockfile and evidence
does not commit
does not push
```

Download the artifact, audit `package-lock.json`, compare dependencies and
integrity URLs, and add the approved lockfile through a human-reviewed commit.

## Phase 3 — normal verification

After the approved lockfile is committed, the normal workflow requires:

```text
package-lock.json
npm ci --ignore-scripts
tests
Vite build
dist verification
build provenance
```

## Deployment boundary

Uploading source to GitHub is not deployment authorization. Device, HTTPS,
Lighthouse, cache-storage and rollback evidence remain required.
