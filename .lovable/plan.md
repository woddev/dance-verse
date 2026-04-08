

# Dance-Verse Platform Gap Analysis

## What's Built and Working

### Public Site
- Homepage with hero, campaigns, catalog browsing
- Track detail pages with audio player, dance videos, filtering
- Campaign detail pages with dancer avatars
- AI Music Generator, About, How It Works, Inquire pages
- Promotion marketplace with Stripe Checkout
- Producer landing page
- Site password gate

### Dancer Portal
- Application flow with terms acceptance
- Dashboard with earnings, active campaigns, submissions
- Campaign browsing and video submission (including non-campaign track submissions)
- Leaderboard, payment history, settings with Stripe Connect
- Profile pages (public `/creators/:id`)

### Producer Portal
- Application flow
- Track submission (3/day limit), track management with audio preview
- Deal pipeline: offers, contracts (signature + PDF), earnings
- Settings with Stripe Connect

### Partner Portal
- Signup, terms, dashboard with QR codes
- Referral tracking, commission earnings
- Settings with Stripe Connect

### Admin Panel
- Overview dashboard with stats
- Music library CRUD, campaign management (featured toggle, auto-expire cron)
- Dancer management, producer application review, partner management
- Deal dashboard, finance dashboard, payout management
- User role management, hero/navigation/email/category/package settings
- Submission review, artist (label) submissions, reports

---

## Gaps and Missing Pieces

### Critical (needed to operate day-to-day)

1. **Create Campaign page is empty** — `/admin/campaigns/new` is a stub with just a heading and a `TODO` comment. Admins must create campaigns inline from the campaign list, but there's a dedicated route that does nothing.

2. **No admin review for non-campaign track submissions** — Dancers can submit videos directly to tracks (no campaign), but there's no admin view to see or moderate these. They go live immediately with no oversight.

3. **No notification system** — No in-app notifications for any role. Dancers don't get notified when submissions are reviewed, producers don't get notified of new offers, admins don't get alerted to new applications. Email queue exists but there's no in-app bell/inbox.

4. **No dancer application review page** — Admin has `/admin/dancers` for managing existing dancers, but the flow for reviewing new dancer *applications* (pending approval) may be buried in the same page rather than surfaced prominently.

### Important (operational quality-of-life)

5. **Producer Contracts page exists but isn't in routing** — `src/pages/producer/Contracts.tsx` exists but has no route in `App.tsx`. Producers access contracts via the Deals page only.

6. **No bulk payout processing UI for dancers** — Finance dashboard and payout pages exist, but the dancer payout workflow (select submissions → trigger Stripe transfer) may lack a streamlined batch flow similar to the producer payout edge function.

7. **No campaign analytics/reporting per campaign** — Reports page exists but there's no per-campaign performance view (total submissions, views, engagement breakdown by platform).

8. **No content moderation queue** — Submitted videos aren't checked for content policy violations. No flagging mechanism for inappropriate content.

9. **No email template preview/test** — Email Templates page exists but unclear if admins can preview or send test emails before going live.

10. **No audit log** — No record of admin actions (who approved/rejected submissions, changed roles, processed payouts). Important for accountability with multiple admin roles.

### Nice-to-Have (growth features)

11. **No dancer messaging/communication** — No way for admins to message individual dancers or broadcast announcements.

12. **No campaign duplication** — Admins can't clone an existing campaign as a template for a new one.

13. **No social stats dashboard** — The `scrape-stats` edge function exists but there's no UI showing aggregated social engagement metrics across campaigns.

14. **No mobile admin experience** — Admin sidebar is hidden on mobile (`hidden md:flex`) with no hamburger/drawer alternative.

15. **No producer dashboard stats** — Producer dashboard likely shows basic info but may lack aggregate metrics (total tracks, acceptance rate, lifetime earnings summary).

---

## Recommended Priority Order

| Priority | Item | Effort |
|----------|------|--------|
| 1 | Remove or build out the empty Create Campaign page | Small |
| 2 | Add admin moderation for non-campaign video submissions | Medium |
| 3 | In-app notification system (bell icon + inbox) | Large |
| 4 | Per-campaign analytics view | Medium |
| 5 | Mobile admin sidebar drawer | Small |
| 6 | Audit log for admin actions | Medium |
| 7 | Campaign duplication/cloning | Small |

