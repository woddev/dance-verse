

## Dancer Experience Audit — Gaps Found

After reviewing all dancer-facing pages, routes, sidebar links, and database schema, here's what's missing or incomplete:

### 1. Payments Page is Empty (Critical)
`src/pages/dancer/Payments.tsx` is a stub with just a heading and a `TODO` comment. Dancers have no way to view their payout history, amounts, or statuses. The `payouts` table already stores `amount_cents`, `status`, `stripe_transfer_id`, and `completed_at` — this just needs a UI.

**Build:** A table/list showing each payout with amount, status badge (pending/completed/failed), submission reference, and date.

### 2. My Submissions Page is Empty (Critical)
`src/pages/dancer/MySubmissions.tsx` is also a stub. The Dashboard shows the last 10 submissions, but the dedicated page has no content. Dancers can't see a full history of all their submissions and review statuses.

**Build:** A filterable list of all submissions with campaign name, platform, video link, review status badge (pending/approved/rejected), rejection reason if applicable, and submission date.

### 3. No Notifications or Alerts for New Campaigns
There's no notification system. When a new campaign goes live, dancers have no way to know unless they manually check the dashboard. No email alerts, no in-app notification bell, no banner for "new since last visit."

**Build (recommended approach):** 
- Add a `last_seen_campaigns_at` timestamp to the `profiles` table
- Show a "New" badge on campaigns published after that timestamp
- Optionally send an email via the existing `send-email` edge function when a campaign is created

### 4. No Mobile Navigation for Dashboard Sidebar
The sidebar is `hidden md:flex` — on mobile, there's no way to navigate between dashboard sections (Campaigns, Submissions, Payments, Settings, etc.). The dancer is stuck on whatever page they landed on.

**Build:** A mobile bottom nav bar or a hamburger-triggered slide-out menu for the `DashboardLayout`.

### 5. No Password Reset / Forgot Password Flow
The Auth page and Apply page have no "Forgot password" link. Dancers who forget their password have no self-service recovery path.

**Build:** Add a forgot-password link on the Auth page that triggers `supabase.auth.resetPasswordForEmail()`, plus a password update page.

### 6. No Stripe Setup Prompt Before First Payout
Dancers can submit videos and get approved without ever setting up Stripe. There's no warning on the dashboard or campaign detail page that they need to connect Stripe to get paid. The Stripe setup only appears in Settings.

**Build:** A dismissible banner on the Dashboard when `stripe_onboarded` is false: "Set up your payment account to receive earnings."

### Summary of Recommended Priority

| Priority | Gap | Effort |
|----------|-----|--------|
| High | Payments page (full payout history) | Medium |
| High | My Submissions page (full list) | Medium |
| High | Mobile dashboard navigation | Small |
| Medium | Stripe setup prompt on dashboard | Small |
| Medium | New campaign alerts (badges + optional email) | Medium |
| Lower | Forgot password flow | Small |

Would you like me to implement all of these, or focus on specific ones first?

