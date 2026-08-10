# Risk assessment

## Green — locally implemented

```text
manifest
Android any/maskable icons
Apple touch icon
iOS standalone metadata
safe-area layout
install guidance
service-worker protected-path exclusions
offline public fallback
update flow
landing / app route split
```

## Yellow — not yet proven in a real browser/device

```text
Chrome Android install prompt
Samsung Internet installation
Safari iPhone Add to Home Screen
Safari iPad Add to Home Screen
standalone launch
real HTTPS service-worker registration
Lighthouse PWA checks
production server MIME and cache headers
```

## Red / blockers

```text
baseline deployed commit unknown
legacy reference commit unknown
npm dependencies not materialized in this environment
production build not executed
device matrix not executed
AO-01 audit for this successor pending
deploy not authorized
```
