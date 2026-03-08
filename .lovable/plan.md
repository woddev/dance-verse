

# Site Gate: Cookie-Based Persistence

Currently the password gate uses `sessionStorage`, which resets when the browser tab closes. We'll switch to a cookie so returning visitors stay unlocked.

## Changes

**`src/components/layout/SiteGate.tsx`**
- Replace `sessionStorage.getItem` / `sessionStorage.setItem` with cookie read/write utilities
- Set a cookie named `site_unlocked` with a 30-day expiry and `path=/`
- On load, check for the cookie to determine unlock state
- No new dependencies needed — just `document.cookie`

This is a small, self-contained edit to one file.

