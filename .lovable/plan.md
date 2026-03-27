

# Simplify Producer Navigation: Track-Focused Tracks + Combined Deals Tab

## Changes

### 1. Simplify "My Tracks" page (`src/pages/producer/Tracks.tsx`)
Remove deal/contract columns. Keep it purely about the music:
- Play button, Title, Submitted date, Status (review status only — submitted, under_review, accepted, denied)
- Remove "Deal Type" and "Earnings" columns
- Keep the "Submit Track" button

### 2. Combine Offers + Contracts into one "Deals" page (`src/pages/producer/Deals.tsx`)
Create a new page with two sections or a simple tab toggle:
- **Offers** section — pending/active offers with accept/reject actions
- **Contracts** section — unsigned contracts needing signature + signed contracts with download
- Reuse all existing logic from `Offers.tsx` and `Contracts.tsx`

### 3. Update sidebar navigation (`src/components/layout/ProducerLayout.tsx`)
- Remove separate "Offers" and "Contracts" links
- Add single "Deals" link (icon: `Handshake` or `FileText`) with combined badge count (`pending_offers + contracts_to_sign`)
- Subtitle: "Offers & contracts"

### 4. Update routing (`src/App.tsx`)
- Add route `/producer/deals` pointing to new `Deals.tsx`
- Keep `/producer/offers` and `/producer/contracts` as redirects (or remove)
- Keep `/producer/offers/:id` for offer detail page

### Files
- **Modified**: `src/pages/producer/Tracks.tsx` — remove Deal Type + Earnings columns
- **Created**: `src/pages/producer/Deals.tsx` — merged offers + contracts
- **Modified**: `src/components/layout/ProducerLayout.tsx` — update nav links
- **Modified**: `src/App.tsx` — update routes

