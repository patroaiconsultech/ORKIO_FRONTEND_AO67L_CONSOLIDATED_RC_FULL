# PWA acceptance matrix

## Android

```text
[ ] HTTPS
[ ] manifest loads with correct MIME type
[ ] 192x192 any icon
[ ] 512x512 any icon
[ ] 192x192 maskable icon
[ ] 512x512 maskable icon
[ ] display=standalone
[ ] beforeinstallprompt captured when available
[ ] browser install menu works
[ ] installed launch opens /app
[ ] offline public fallback works
[ ] protected API responses are not cached
```

## iPhone and iPad

```text
[ ] apple-touch-icon 180x180
[ ] apple-mobile-web-app-capable=yes
[ ] black-translucent status bar
[ ] viewport-fit=cover
[ ] safe-area CSS on header, composer and dialogs
[ ] Share → Add to Home Screen instructions
[ ] installed launch opens standalone web app
[ ] portrait and landscape remain usable
[ ] iPad split view remains usable
[ ] protected API responses are not cached
```

## Cross-platform

```text
[ ] touch targets at least 44px
[ ] reduced-motion preference respected
[ ] keyboard focus visible
[ ] service-worker update is user-controlled
[ ] old ORKIO caches removed by version prefix
[ ] rollback to baseline ZIP documented
```
