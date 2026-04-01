

# Remove Tabs from Admin Deal Management — Single Page View

## Overview
Replace the 5-tab layout (Submissions, Accepted, Denied, Offers, Contracts) with a single scrollable page showing all sections stacked vertically with clear headings.

## Changes

### File: `src/pages/admin/DealDashboard.tsx`
- Remove `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` imports and usage
- Remove tab state management (`tab`, `setTab`, `searchParams`)
- Render all 5 sections as stacked cards/sections with headers:
  1. **Music Submissions** (with count badge) — `DealTracksQueue`
  2. **Accepted Tracks** — `AcceptedTracks`
  3. **Offers** — `DealOffersList`
  4. **Contracts** — `DealContractsList`
  5. **Denied Tracks** — `DeniedTracks` (collapsed or at bottom)
- Each section wrapped in a card with a clear heading and divider
- Sections with no data show a compact empty state (single line) instead of taking up space

### Single File Modified
- `src/pages/admin/DealDashboard.tsx`

