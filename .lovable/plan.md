

## Show "Completed" Status and Countdown Timer on Campaigns

### What Changes

1. **Campaigns Browse Page (`src/pages/Campaigns.tsx`)**
   - Also fetch campaigns with `status = 'completed'` (currently only `active` ones are shown)
   - Show a "COMPLETED" badge overlay on completed campaign cards (replacing the "SPOTS LEFT" badge)
   - For active campaigns with an `end_date`, show a live countdown timer (e.g., "3d 12h left") instead of or alongside the spots-left badge
   - Completed campaigns appear after active ones in the grid

2. **Campaign Detail Page (`src/pages/CampaignDetail.tsx`)**
   - If the campaign status is `completed`, show a prominent "COMPLETED" banner/badge near the title
   - Hide or disable the "Accept Campaign" / "Apply to Join" buttons for completed campaigns
   - For active campaigns with an `end_date`, display a countdown timer in the campaign info section

3. **Countdown Component (`src/components/campaign/CountdownTimer.tsx`)**
   - New reusable component that takes an `end_date` and displays a live countdown (days, hours, minutes, seconds)
   - Updates every second using `setInterval`
   - Shows "Ended" when the countdown reaches zero

### Technical Details

**Database**: No schema changes needed -- `end_date` and `status` fields already exist on the `campaigns` table.

**Campaigns.tsx changes:**
- Update query: `.in("status", ["active", "completed"])` instead of `.eq("status", "active")`
- Sort active campaigns first, completed last
- Conditionally render a "COMPLETED" overlay badge (gray/dark styling) on completed cards, replacing the green "SPOTS LEFT" badge
- For active campaigns with `end_date`, render `<CountdownTimer endDate={campaign.end_date} />` as a badge

**CampaignDetail.tsx changes:**
- Add a "Campaign Completed" banner when `campaign.status === "completed"`
- Disable/hide accept and apply CTAs for completed campaigns
- Show countdown timer in the campaign meta info for active campaigns with an `end_date`

**CountdownTimer.tsx:**
- Accepts `endDate: string` prop
- Uses `useEffect` + `setInterval` (1s) to compute remaining time via `date-fns`
- Renders compact format: "2d 5h 30m" or "5h 12m 45s" when under a day
- Returns "Ended" text when past the end date

