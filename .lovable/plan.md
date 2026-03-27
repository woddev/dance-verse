

# Visual Producer Experience + Admin Deal Dashboard Redesign

## Overview
Two major changes: (1) Transform the producer journey into a visual, step-by-step experience with celebration moments and clear contract flow, and (2) simplify the admin Deal Management by removing tabs and reorganizing submissions.

---

## Part 1: Producer Experience Redesign

### A. Producer Dashboard — Visual Status Journey
**File: `src/pages/producer/Dashboard.tsx`** (rewrite)

Replace the current stats-card grid with a visual pipeline showing the producer's journey:
- **Step indicators** showing: Submit Track → Under Review → Offer → Contract → Earning
- Each track displayed as a visual card with artwork, status badge, and progress indicator
- **"You Got an Offer!"** celebration banner (confetti-style with animated gradient border) when `pending_offers > 0`, linking directly to the offer
- **"Deal Signed!"** success banner with download button when `fully_executed > 0`
- If a track was denied: show a styled card with denial reason + prominent "Submit Another Track" button
- Keep activity feed at bottom

### B. Offer Detail — Full Contract Preview
**File: `src/pages/producer/OfferDetail.tsx`** (enhance)

- Add a large celebration header: "You Got an Offer!" with the track artwork
- Show deal terms in a clean, visual card layout (not a data grid)
- Make Accept/Reject/Counter buttons larger and more prominent
- On accept, show an animated success state before redirecting to contracts

### C. Contract Page — Clear Signed State
**File: `src/pages/producer/Contracts.tsx`** (enhance)

- After signing: show a large green confirmation card with checkmark animation
- "Your contract has been signed" with prominent PDF download button
- Show signature details (name, date) in a styled confirmation block
- Make the download button very visible (not just a ghost icon)

### D. Submission Limit — 3 Per Day
**File: `supabase/functions/producer-data/index.ts`** — `submit-track` action

- Before inserting, query `deals.deal_tracks` for count of tracks submitted by this producer today (`created_at >= today midnight`)
- If count >= 3, return error: "You've reached the daily submission limit (3 tracks per day). Please try again tomorrow."

**Files: `src/pages/Submit.tsx` and `src/pages/producer/SubmitTrack.tsx`**
- Display the error message from the API when limit is hit
- Optionally show remaining submissions count

### E. Denied Track — Resubmit Flow
**File: `src/pages/producer/TrackDetail.tsx`** (enhance)

- When track status is `denied`, show denial reason prominently
- Add a "Submit Another Track" button that navigates to the submission form

---

## Part 2: Admin Deal Dashboard Redesign

### A. Simplify Tabs
**File: `src/pages/admin/DealDashboard.tsx`** (rewrite tabs)

Remove these tabs: **Overview**, **Producer Pipeline**, **Revenue**

New tab structure:
1. **Music Submissions** (default) — only new/pending submissions (`submitted`, `under_review`)
2. **Accepted** — tracks that have been accepted (`offer_pending`, `offer_sent`, `deal_signed`, `active`) with their associated offers and contracts inline
3. **Denied** — denied tracks with denial reasons
4. **Offers** — keep existing (associated with accepted tracks)
5. **Contracts** — keep existing (associated with accepted tracks)

### B. Music Submissions Tab
**File: `src/components/deals/admin/DealTracksQueue.tsx`** (modify)

- Remove the status filter dropdown (since each status group now has its own tab)
- Rename header context to "Music Submissions"
- Only display tracks with status `submitted` or `under_review`

### C. New Accepted Tracks Component
**File: `src/components/deals/admin/AcceptedTracks.tsx`** (new)

- Show tracks that have progressed past review (offer_pending, offer_sent, etc.)
- Each row shows the track + its current offer status + contract status inline
- Click to open the existing TrackReviewPanel

### D. New Denied Tracks Component  
**File: `src/components/deals/admin/DeniedTracks.tsx`** (new)

- Simple table of denied tracks with denial reason, producer name, date
- Option to reopen (super admin only)

### E. Data Fetching Update
**File: `src/pages/admin/DealDashboard.tsx`**

- Remove `deal-overview` and `deal-revenue` API calls
- Split tracks fetch into separate calls or filter client-side:
  - New submissions: status in (`submitted`, `under_review`)
  - Accepted: status in (`offer_pending`, `offer_sent`, `counter_received`, `deal_signed`, `active`)
  - Denied: status = `denied`

---

## Technical Details

### Files Modified
1. `src/pages/producer/Dashboard.tsx` — visual pipeline redesign
2. `src/pages/producer/OfferDetail.tsx` — celebration UX
3. `src/pages/producer/Contracts.tsx` — clear signed state + download
4. `src/pages/producer/TrackDetail.tsx` — denied resubmit flow
5. `src/pages/Submit.tsx` — daily limit error handling
6. `src/pages/producer/SubmitTrack.tsx` — daily limit error handling
7. `supabase/functions/producer-data/index.ts` — 3/day submission limit
8. `src/pages/admin/DealDashboard.tsx` — simplified tabs
9. `src/components/deals/admin/DealTracksQueue.tsx` — music submissions only

### Files Created
10. `src/components/deals/admin/AcceptedTracks.tsx` — accepted tracks view
11. `src/components/deals/admin/DeniedTracks.tsx` — denied tracks view

### No Database Changes Required
The 3/day limit is enforced in the edge function by querying existing timestamp data.

