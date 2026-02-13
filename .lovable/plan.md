

## Make Campaign Page Smart for Logged-In Dancers

**The Problem:** When you visit a campaign page (like `/campaigns/add-it-up-6c92699b`) while signed in as an approved dancer, it still shows "Sign In to Accept Campaign" instead of letting you accept the campaign directly.

**The Fix:** Update the public campaign detail page to detect if you're logged in and show the right actions:
- **Signed in dancer**: Show an "Accept Campaign" button (or "View & Submit" if already accepted)
- **Not signed in**: Keep showing "Sign In to Accept Campaign" as it does now

### What will change

**File: `src/pages/CampaignDetail.tsx`**

1. Import and use the `useAuth` hook to check login status
2. Fetch the dancer's acceptance status for this campaign (query `campaign_acceptances` table)
3. Replace the static "Sign In to Accept Campaign" button with conditional logic:
   - If **not signed in**: show "Sign In to Accept Campaign" (current behavior)
   - If **signed in but not accepted**: show an "Accept Campaign" button that calls the `create_assignment` RPC
   - If **signed in and already accepted**: show a "View & Submit" button linking to `/dancer/campaigns/{id}`
4. Show loading/disabled states while accepting

No database changes needed -- the `create_assignment` RPC function and `campaign_acceptances` table already exist and handle all validation (capacity, duplicates, active status).

