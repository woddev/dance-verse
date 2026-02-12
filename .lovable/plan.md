

## Dance-Verse Platform: Full Architecture Plan

**Important note:** Lovable runs on React + Vite (not Next.js). The plan below adapts your requirements to the supported stack: **React (Vite) + Supabase + Stripe Connect**.

---

### 1. Folder Structure

```text
src/
  components/
    ui/              (existing shadcn components)
    layout/
      Navbar.tsx
      Footer.tsx
      DashboardLayout.tsx
      AdminLayout.tsx
      ProtectedRoute.tsx
    campaigns/
      CampaignCard.tsx
      CampaignGrid.tsx
      CampaignDetails.tsx
    submissions/
      SubmissionForm.tsx
      SubmissionCard.tsx
      SubmissionStatusBadge.tsx
    payments/
      PaymentHistory.tsx
      StripeOnboarding.tsx
    admin/
      CampaignForm.tsx
      SubmissionReview.tsx
      PayoutActions.tsx
  hooks/
    useAuth.ts
    useCampaigns.ts
    useSubmissions.ts
    usePayments.ts
    useAdmin.ts
  lib/
    utils.ts
    supabase.ts
  pages/
    Index.tsx           (landing - existing)
    HowItWorks.tsx      (existing)
    Auth.tsx             (login / signup)
    dancer/
      Dashboard.tsx
      CampaignBrowse.tsx
      CampaignDetail.tsx
      MySubmissions.tsx
      Payments.tsx
      Settings.tsx
    admin/
      Dashboard.tsx
      ManageCampaigns.tsx
      CreateCampaign.tsx
      ReviewSubmissions.tsx
      ManagePayouts.tsx
      ManageDancers.tsx
supabase/
  config.toml
  functions/
    create-stripe-account/index.ts
    create-payout/index.ts
    stripe-webhook/index.ts
```

---

### 2. Database Schema (Supabase Postgres)

**Tables:**

- **profiles** -- dancer profile data (linked to auth.users)
  - `id` (uuid, FK to auth.users), `full_name`, `avatar_url`, `bio`, `instagram_handle`, `tiktok_handle`, `youtube_handle`, `stripe_account_id`, `stripe_onboarded` (boolean), `created_at`

- **user_roles** -- role management (admin / dancer)
  - `id`, `user_id` (FK auth.users), `role` (app_role enum)

- **campaigns** -- created by admin
  - `id`, `title`, `artist_name`, `description`, `cover_image_url`, `song_url`, `tiktok_sound_url`, `instagram_sound_url`, `required_platforms` (text[]), `required_hashtags` (text[]), `required_mentions` (text[]), `pay_scale` (jsonb -- e.g. `[{views: 1000, amount: 10}, ...]`), `status` (active/paused/completed), `created_at`

- **campaign_acceptances** -- dancer accepts a campaign
  - `id`, `campaign_id` (FK), `dancer_id` (FK auth.users), `accepted_at`, `deadline` (timestamptz -- individual per dancer), `status` (accepted/submitted/approved/rejected/paid)

- **submissions** -- dancer submits video link
  - `id`, `acceptance_id` (FK), `dancer_id` (FK), `campaign_id` (FK), `video_url`, `platform`, `submitted_at`, `review_status` (pending/approved/rejected), `rejection_reason`, `reviewed_at`, `view_count`

- **payouts** -- payment records
  - `id`, `submission_id` (FK), `dancer_id` (FK), `amount_cents`, `stripe_transfer_id`, `status` (pending/processing/completed/failed), `created_at`, `completed_at`

**RLS Policies (key rules):**
- Dancers can only SELECT their own rows in `campaign_acceptances`, `submissions`, `payouts`
- Dancers can INSERT into `campaign_acceptances` and `submissions` (own user_id only)
- Admins (via `has_role()` security definer function) can SELECT/UPDATE all rows
- Campaigns table: anyone authenticated can SELECT active campaigns; only admins can INSERT/UPDATE

**Storage Buckets:**
- `campaign-assets` (public) -- album covers, song files
- `submission-videos` (private) -- dancer video uploads

---

### 3. Authentication and Authorization

- Supabase Auth (email/password, optional social login)
- `ProtectedRoute` component checks auth state and role
- Role checked via `has_role()` database function (never client-side)
- Routes split: `/dancer/*` requires dancer role, `/admin/*` requires admin role

---

### 4. Edge Functions (Supabase)

**`create-stripe-account`**
- Called when dancer onboards to Stripe Connect Express
- Creates Stripe Connect account, returns onboarding link
- Stores `stripe_account_id` in profiles table

**`create-payout`**
- Admin-only (validates JWT + admin role)
- Takes `submission_id`, looks up amount from pay scale + view count
- Creates Stripe Transfer to dancer's Connect account
- Updates `payouts` table

**`stripe-webhook`**
- Public endpoint (verify_jwt = false), validates Stripe webhook signature
- Handles `account.updated` (onboarding complete) and `transfer.paid` events
- Updates relevant database records

---

### 5. Core User Flows

**Dancer Flow:**
1. Sign up / Log in -> land on Dancer Dashboard
2. Browse active campaigns -> view details
3. Accept campaign -> individual deadline set (e.g. +7 days)
4. Download sound / copy links
5. Create and post video
6. Submit video URL via form
7. Track submission status (pending/approved/rejected)
8. View payment history once approved and paid

**Admin Flow:**
1. Log in -> Admin Dashboard (stats overview)
2. Create/edit campaigns (title, artist, song, pay scale, hashtags)
3. Review submissions (approve/reject with reason)
4. Trigger payouts for approved submissions
5. Manage dancers (view profiles, submission history)

---

### 6. Routing Structure

```text
/                    -- Landing page (existing)
/how-it-works        -- Existing
/auth                -- Login / Sign up
/dancer/dashboard    -- Dancer home (active campaigns, submissions)
/dancer/campaigns    -- Browse all campaigns
/dancer/campaigns/:id -- Campaign detail + accept
/dancer/submissions  -- My submissions list
/dancer/payments     -- Payment history
/dancer/settings     -- Profile + Stripe onboarding
/admin/dashboard     -- Admin overview
/admin/campaigns     -- Manage campaigns
/admin/campaigns/new -- Create campaign
/admin/submissions   -- Review submissions
/admin/payouts       -- Manage payouts
/admin/dancers       -- Manage dancer accounts
```

---

### 7. Implementation Sequence

The build will happen in this order:

1. **Supabase setup** -- Enable Supabase, create all tables, RLS policies, `has_role()` function, storage buckets
2. **Auth** -- Sign up/login page, ProtectedRoute, role-based redirects
3. **Shared layout** -- Extract Navbar/Footer into reusable components, create DashboardLayout and AdminLayout
4. **Campaign browsing (dancer)** -- Campaign list, detail page, accept flow
5. **Submission flow (dancer)** -- Submit video form, submission list, status tracking
6. **Admin: campaign management** -- Create/edit campaigns
7. **Admin: submission review** -- Approve/reject submissions
8. **Stripe integration** -- Enable Stripe, dancer onboarding edge function, payout edge function, webhook handler
9. **Payment history** -- Dancer payment view, admin payout management
10. **Polish** -- Dashboard stats, mobile responsiveness, error handling

This is a large build. We can tackle it incrementally, starting with steps 1-3 to establish the foundation, then layering features on top.

