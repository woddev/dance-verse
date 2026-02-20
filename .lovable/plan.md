
# Partner Program

## What You're Building

A management-royalty style partner program where partners earn a percentage of their referred dancers' payouts. Commission is tiered by how many of their dancers are actively completing campaigns — rewarding retention over recruitment.

## How It Works (User Flow)

```text
Partner signs up via unique link  →  Dancers apply using partner's referral code
         ↓                                        ↓
Partner dashboard shows active              Dancer is linked to partner
dancer count + commission tier              in the database
         ↓
Admin pays dancer  →  System auto-calculates partner commission  →  Admin can pay partner
```

## Performance Tiers

| Active Dancers (last 30 days) | Commission Rate |
|-------------------------------|-----------------|
| 1–24                          | 3%              |
| 25–74                         | 5%              |
| 75–149                        | 7%              |
| 150+                          | 10%             |

Active dancer = completed at least 1 approved campaign submission in the last 30 days.

---

## Technical Details

### 1. Database Schema (Migration)

**New table: `partners`**
- `id` (uuid, PK)
- `user_id` (uuid) — linked to auth user
- `name` (text)
- `email` (text)
- `referral_code` (text, unique) — auto-generated slug, e.g. `DANCE-ABC123`
- `status` (text: `active`, `suspended`) — default `active`
- `earnings_window_months` (int) — default `12`
- `created_at`

**New table: `partner_referrals`**
- `id` (uuid, PK)
- `partner_id` (uuid → partners.id)
- `dancer_id` (uuid → profiles.id)
- `linked_at` (timestamp)

**New table: `partner_commissions`**
- `id` (uuid, PK)
- `partner_id` (uuid → partners.id)
- `payout_id` (uuid → payouts.id) — one commission per dancer payout
- `dancer_id` (uuid)
- `dancer_payout_cents` (int)
- `commission_rate` (numeric) — e.g. `0.05` for 5%
- `commission_cents` (int) — calculated amount
- `status` (text: `pending`, `paid`) — default `pending`
- `stripe_transfer_id` (text, nullable)
- `paid_at` (timestamp, nullable)
- `created_at`

**RLS Policies:**
- Partners can read their own `partners`, `partner_referrals`, and `partner_commissions` rows
- Only admins can write to all three tables
- Public can read nothing

### 2. Referral Link Flow

Partners receive a unique referral code. Dancers can include this code on the Apply page (`/dancer/apply`). The code is stored in the apply form, and when a dancer is approved and their profile is created, the backend links them to the partner in `partner_referrals`.

Changes to `src/pages/dancer/Apply.tsx`: Add an optional "Partner Referral Code" field to the application form. The code is saved in the `applications` table (new `referral_code` column).

Changes to `supabase/functions/admin-data/index.ts` (`approve-dancer` action): After creating the user profile, look up the referral code from the application and insert a row into `partner_referrals` if a valid partner is found.

### 3. Commission Calculation (on Dancer Payout)

When admin triggers a dancer payout via `create-payout`, the edge function will:
1. Look up whether the dancer has a partner in `partner_referrals`
2. Count the partner's currently active dancers (approved submissions in last 30 days)
3. Determine the commission rate from the tier table
4. Insert a `partner_commissions` row with status `pending`
5. No Stripe transfer yet — commissions are held for admin review

### 4. Admin: Manage Partners Page (`/admin/partners`)

New admin page added to the sidebar, with two tabs:

**Partners Tab:**
- Table of all partners: name, referral code, status, dancer count, active dancer count, current tier, total pending commission, total paid commission
- Button: "Add Partner" (modal with name, email → auto-generates referral code)
- Button: "Suspend" / "Reinstate"

**Commissions Tab:**
- Table of pending commissions: partner name, dancer name, original payout amount, commission %, commission amount, date earned
- "Pay Commission" button → triggers Stripe transfer to partner's Stripe account + marks commission `paid`
- History sub-tab for paid commissions

### 5. Partner Stripe Payout

Partners also connect a Stripe account. The admin partner management page will show whether a partner has connected Stripe. The "Pay Commission" button calls a new edge function `pay-partner-commission` that mirrors `create-payout` logic but for partner commissions.

For MVP simplicity, partner Stripe onboarding can be done by the admin manually entering a partner's Stripe Connect account ID (or extending the existing Stripe flow). This can be a separate enhancement.

### 6. Partner Dashboard (Optional - Phase 2)

For now, partners are managed entirely by admins. A partner-facing dashboard at `/partner/dashboard` can be a follow-up, showing their referred dancers and commission history.

### Files to Create / Modify

| File | Change |
|------|--------|
| `supabase/migrations/[timestamp].sql` | Create `partners`, `partner_referrals`, `partner_commissions` tables + RLS + add `referral_code` to `applications` |
| `supabase/functions/admin-data/index.ts` | Add `partners`, `create-partner`, `commissions` actions; update `approve-dancer` to link referral |
| `supabase/functions/create-payout/index.ts` | After creating dancer payout, auto-create pending commission if dancer has a partner |
| `supabase/functions/pay-partner-commission/index.ts` | New edge function: admin-only, pays a pending commission via Stripe and marks it paid |
| `src/pages/admin/ManagePartners.tsx` | New admin page with Partners + Commissions tabs |
| `src/components/layout/AdminLayout.tsx` | Add "Partners" link to the admin sidebar |
| `src/App.tsx` | Add `/admin/partners` route |
| `src/pages/dancer/Apply.tsx` | Add optional referral code field |

### Commission Tier Logic (Reusable)

```text
Count partner's dancers who have ≥1 approved submission in last 30 days

active_count → rate
1-24         → 3%
25-74        → 5%
75-149       → 7%
150+         → 10%
```

This logic lives in the `create-payout` edge function when auto-creating commissions, and is also computed in the admin-data function for display.
