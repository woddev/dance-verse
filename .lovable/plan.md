
# Producer Onboarding and Public-Facing Flow

## Problem
There is no public-facing entry point for producers. The homepage is entirely dancer-focused, and a new producer has no way to discover the platform, apply, sign up, or understand the submission process. All producer routes are behind `ProtectedRoute` with `requiredRole="producer"`, but there's no mechanism to become a producer.

## Solution Overview
Build a complete producer onboarding funnel mirroring the dancer flow:
1. Public landing page explaining the producer program
2. Producer application form (public, no auth required)
3. Admin ability to review and approve producer applications
4. Auth flow updates so approved producers land on their dashboard
5. Navbar updates to show producer dashboard link

---

## 1. Public Producer Landing Page (`/producers`)

Create `src/pages/ProducerLanding.tsx` -- a marketing page explaining the producer program:
- Hero section: "Submit Your Beats. Get Paid." with CTA to apply
- How it works: 3-step process (Apply, Submit Tracks, Get Deals and Earn)
- Deal types explained briefly (buyout, revenue split, hybrid)
- CTA button linking to `/producer/apply`

Add route in `App.tsx` as a public route.

## 2. Producer Application Form (`/producer/apply`)

Create `src/pages/producer/Apply.tsx` -- mirrors the dancer `Apply.tsx` pattern:
- Fields: email, legal name, stage name, bio, genre specialties, portfolio links (SoundCloud, YouTube, website), location
- Inserts into a new `producer_applications` table (public schema)
- No auth required (like dancer applications)
- Success confirmation screen after submission

### Database Migration
Create `producer_applications` table:
```text
producer_applications
  id              uuid PK default gen_random_uuid()
  email           text NOT NULL
  legal_name      text NOT NULL
  stage_name      text
  bio             text
  genre           text
  portfolio_url   text
  soundcloud_url  text
  website_url     text
  location        text
  status          text NOT NULL default 'pending'  (pending/approved/rejected)
  rejection_reason text
  reviewed_at     timestamptz
  created_at      timestamptz default now()
```

RLS policies:
- Anyone can INSERT (with status = 'pending' check)
- Admins can SELECT and UPDATE
- No DELETE

## 3. Admin Producer Application Review

Add a new section to the admin area -- either a new page `src/pages/admin/ManageProducerApplications.tsx` or a tab within the existing Deal Dashboard.

Functionality:
- List pending producer applications
- Approve: creates auth user (via invite email), inserts `user_roles` (producer), creates `deals.producers` record
- Reject: updates status with reason

Add admin sidebar link and route in `App.tsx`.

The approval flow will use an edge function (`approve-producer`) that:
1. Calls `supabase.auth.admin.inviteUserByEmail()` to send an invite
2. Inserts into `user_roles` with role = 'producer'
3. Creates the `deals.producers` record with legal_name, stage_name, email
4. Updates `producer_applications.status` to 'approved'

## 4. Auth Flow Updates

Update `Auth.tsx` and `useAuth.ts` redirect logic:
- When a producer signs in, redirect to `/producer/dashboard` (currently only checks admin and dancer)
- Update `redirectByRole` to check for producer role

Update `Navbar.tsx`:
- Show "Producer Dashboard" button when user has producer role (similar to dancer's "My Dashboard")

## 5. Navigation Link

Add a "For Producers" link to either:
- The public nav (via `nav_links` table managed by admin), or
- Hardcoded in the Navbar alongside existing links

Recommend adding it via the `nav_links` table so admins control visibility.

---

## Technical Details

### New Files
- `src/pages/ProducerLanding.tsx` -- public marketing page
- `src/pages/producer/Apply.tsx` -- application form
- `src/pages/admin/ManageProducerApplications.tsx` -- admin review page
- `supabase/functions/approve-producer/index.ts` -- edge function for approval workflow

### Modified Files
- `src/App.tsx` -- add 3 new routes (producer landing, producer apply, admin manage producer apps)
- `src/pages/Auth.tsx` -- update `redirectByRole` to handle producer role
- `src/components/layout/Navbar.tsx` -- add producer dashboard link for logged-in producers
- `src/components/layout/AdminLayout.tsx` -- add sidebar link for producer applications

### Database Migration
- Create `producer_applications` table with RLS policies
- No changes to existing `deals.producers` table (records created on approval)

### Edge Function: `approve-producer`
- Receives `application_id` from admin
- Validates admin role via JWT
- Sends invite email via `supabase.auth.admin.inviteUserByEmail()`
- Creates `user_roles` and `deals.producers` records
- Updates application status

This mirrors the existing dancer approval workflow and reuses the same auth invite pattern already established in the platform.
