

## Deal Progress Alerts and Activity Feed

### Problem
Currently, both admins and producers have no clear indicators of what's new or what step requires attention in the deal flow. Status badges exist but there's no proactive alerting, no "action required" banners, and no activity timeline on dashboards.

### Solution Overview
Add three key features to improve deal visibility:

1. **Action Required Banners** - Contextual alert bars on Producer and Admin dashboards showing pending actions
2. **Activity Feed Component** - A shared timeline component showing recent deal events
3. **Badge Counts on Navigation** - Small notification dots/counts on sidebar links when new items need attention

---

### 1. Producer Dashboard - Action Required Alerts

Add alert banners at the top of the Producer Dashboard (`src/pages/producer/Dashboard.tsx`) that query existing data and surface:

- "You have X new offer(s) waiting for your review" (offers with status `sent`)
- "You have X contract(s) ready for signature" (contracts with status `sent_for_signature`)
- "X contract(s) fully executed" (contracts recently countersigned by admin)

Each alert will link to the relevant page (Offers or Contracts). Uses the `Alert` component from `src/components/ui/alert.tsx`.

### 2. Admin Deal Dashboard - Action Required Alerts

Add alert banners to the Admin Deal Dashboard (`src/pages/admin/DealDashboard.tsx`) showing:

- "X new track submission(s) pending review" (tracks with status `submitted`)
- "X counter-offer(s) received from producers" (offers with status `countered` or `draft` from producers)
- "X contract(s) awaiting admin countersign" (contracts with status `signed_by_producer`)
- "X payout(s) ready to process" (pending payouts above threshold)

### 3. Producer Sidebar Badge Counts

Update `ProducerLayout.tsx` to fetch counts and show small notification badges next to "Offers" and "Contracts" sidebar links when there are actionable items.

### 4. Activity Feed on Producer Dashboard

Create a new `DealActivityFeed` component that shows the producer's recent deal events in a timeline format. This will use existing data from tracks, offers, and contracts to build a chronological feed.

---

### Technical Details

**New database function** (migration):
```sql
CREATE OR REPLACE FUNCTION public.producer_action_counts(p_user_id UUID)
RETURNS TABLE(
  pending_offers BIGINT,
  contracts_to_sign BIGINT,
  fully_executed BIGINT
)
```

This aggregates counts of items needing attention for a producer. Similarly, the admin overview RPC already returns most needed counts; we'll add `counter_offers_received` and `contracts_awaiting_countersign` to the existing `admin_deal_overview` function.

**New component**: `src/components/deals/DealActionAlerts.tsx`
- Accepts a `role` prop ("producer" or "admin") and `counts` data
- Renders `Alert` components with icons, descriptions, and action links
- Uses existing Alert UI component

**Modified files**:
- `src/pages/producer/Dashboard.tsx` - Add action alerts and activity feed
- `src/pages/admin/DealDashboard.tsx` - Add action alerts in overview tab
- `src/components/layout/ProducerLayout.tsx` - Add badge counts on nav items
- `src/hooks/useProducerApi.ts` - Add `getActionCounts()` method
- `src/components/deals/admin/DealOverview.tsx` - Add action alerts section

**Database migration**: One new RPC (`producer_action_counts`) and update `admin_deal_overview` to include additional counts for counter-offers and contracts awaiting countersign.

