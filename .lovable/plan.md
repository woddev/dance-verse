

# Redesign Deal Management — Visual Pipeline Layout

## Problem
Currently 5 stacked cards with dense tables create a wall of sameness. The deal lifecycle is a process (Submit → Review → Offer → Sign → Done) but the UI doesn't communicate that flow.

## Design Approach: Pipeline Board + Summary Stats

Replace the stacked cards with a visual pipeline that mirrors the deal lifecycle.

### Layout

```text
┌─────────────────────────────────────────────────────┐
│  Deal Management                                    │
├──────────┬──────────┬──────────┬──────────┬─────────┤
│ ● 3      │ ● 2      │ ● 1      │ ● 1      │ ● 5    │
│ Submitted│ In Review│ Offer    │ Signing  │ Signed  │
│ (count)  │ (count)  │ (count)  │ (count)  │ (count) │
└──────────┴──────────┴──────────┴──────────┴─────────┘

┌─────────────────────────────────────────────────────┐
│  Track cards below, filtered by selected stage      │
│  or showing all grouped by stage                    │
│                                                     │
│  Each card: Title · Producer · Genre · Status Badge │
│  Click → opens /admin/deals/track/:id               │
└─────────────────────────────────────────────────────┘

┌─ Signed Contracts (collapsed) ──────────────────────┐
│  Download links for fully executed contracts         │
└─────────────────────────────────────────────────────┘
```

### Sections

1. **Pipeline summary bar** — a row of 5 clickable stage cards at the top showing counts. Clicking one filters the view below. Stages:
   - **New** (submitted, under_review)
   - **Offer Sent** (offer_pending, offer_sent)
   - **Negotiating** (counter_received)
   - **Signing** (deal_signed)
   - **Active** (active + fully_executed contracts)

2. **Track cards grid** — replace the dense tables with compact cards (2-3 per row). Each card shows:
   - Track title, producer name, genre badge
   - Pipeline stage badge (color-coded)
   - Date submitted
   - Click navigates to the review page
   - Offer/contract status shown as a small sub-badge when relevant

3. **Active stage filter** — clicking a pipeline stage filters cards. "All" shows grouped sections with stage headings.

4. **Signed Contracts** — small collapsible section at bottom, just download links (already done).

5. **Denied Tracks** — stays as a collapsed section at the bottom.

### Technical Details

- **Remove**: `DealTracksQueue`, `AcceptedTracks`, `DealOffersList` from the dashboard (keep components for potential reuse)
- **New component**: `DealPipelineBar` — the clickable stage summary row
- **New component**: `DealTrackCard` — compact card for each track with offer/contract info merged
- **Modified**: `DealDashboard.tsx` — complete rewrite of the layout to use pipeline bar + card grid
- **Keep**: `DealContractsList` for the signed contracts download section
- **Keep**: `DeniedTracks` collapsible at bottom

### Files
- **Created**: `src/components/deals/admin/DealPipelineBar.tsx`
- **Created**: `src/components/deals/admin/DealTrackCard.tsx`
- **Modified**: `src/pages/admin/DealDashboard.tsx` — new pipeline layout

