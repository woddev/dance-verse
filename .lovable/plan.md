

## Implement Review Submissions and Manage Payouts Admin Pages

### Step 1: Review Submissions Page
**File:** `src/pages/admin/ReviewSubmissions.tsx` -- Full rewrite

- Fetch submissions via `useAdminApi` hook (`callAdmin("submissions")`)
- Display table with: dancer name, campaign, platform, video URL (external link), status badge, submitted date
- Show campaign compliance info (required hashtags, mentions) for verification
- Approve button calls `callAdmin("review-submission", {}, { submission_id, status: "approved" })`
- Reject button opens a dialog for rejection reason, then calls same endpoint with `status: "rejected"`
- Filter tabs: All / Pending / Approved / Rejected

### Step 2: Manage Payouts Page
**File:** `src/pages/admin/ManagePayouts.tsx` -- Full rewrite

- **Tab 1 -- Ready to Pay:**
  - Fetch submissions via `callAdmin("submissions")`, filter to `review_status === "approved"`
  - Fetch existing payouts via `callAdmin("payouts")` to exclude already-paid submissions
  - Show dancer name, campaign title, video link, pay amount from campaign `pay_scale[0].amount_cents`
  - "Pay" button calls `create-payout` edge function via `supabase.functions.invoke("create-payout", { body: { submission_id, amount_cents } })`
  - Indicate if dancer hasn't completed Stripe onboarding

- **Tab 2 -- Payout History:**
  - Fetch via `callAdmin("payouts")`
  - Display dancer name, campaign, amount (formatted as dollars), status badge, completed date, Stripe transfer ID

### Technical Notes
- Both pages use `AdminLayout` wrapper and `useAdminApi` hook (existing patterns)
- Uses `@tanstack/react-query` for data fetching with `useQuery` and `useMutation`
- Uses existing UI components: Table, Badge, Button, Tabs, Dialog, Textarea
- No database or backend changes needed -- all endpoints and edge functions already exist

