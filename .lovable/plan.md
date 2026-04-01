

# Relabel "Artist Subs" → "Label Subs" in Admin Sidebar

## What changes
One line in `src/components/layout/AdminLayout.tsx` — rename the sidebar label from `"Artist Subs"` to `"Label Subs"`.

## How submissions are created
These come from the public **Promote** page (`/promote`). Anyone (no account needed) can:
1. Pick a promotion package
2. Fill in artist name, song title, social links, upload audio + cover image
3. Pay via Stripe Checkout (or skip payment for custom/bespoke packages)
4. The submission lands in the `artist_submissions` table for admin review

## Technical detail
- **File**: `src/components/layout/AdminLayout.tsx`
- Change line: `{ to: "/admin/artist-submissions", label: "Artist Subs", ...}` → `label: "Label Subs"`

