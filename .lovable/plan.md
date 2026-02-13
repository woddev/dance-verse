

## Dancer Application and Approval System

### Overview
Add a gated onboarding flow where new dancers must submit an application with their profile info and social media links. An admin must approve the application before the dancer gains access to campaigns, submissions, and other dashboard features.

### What We Will Collect

Based on your selections, the application form will collect:
- Full name (already exists)
- Bio (already exists)
- Instagram handle (already exists)
- TikTok handle (already exists)
- YouTube handle (already exists)
- **Dance style / genre** (new field -- e.g. hip-hop, contemporary, freestyle)
- **Years of experience** (new field)
- **Location / city** (new field)

Rejected dancers can re-apply after 30 days.

---

### How It Works

```text
Sign Up --> Email Verified --> Application Form --> Pending Review
                                                        |
                                              Admin Approves/Rejects
                                                        |
                                         Approved: Full dashboard access
                                         Rejected: "Rejected" screen + re-apply after 30 days
```

1. A dancer signs up and verifies their email (unchanged).
2. On first login, they land on an **Application page** where they fill out their profile, social handles, dance style, experience, and location.
3. Their application status starts as `pending`. While pending, they see a "Your application is under review" message instead of the dashboard.
4. An admin reviews the application on the **Manage Dancers** page and approves or rejects it.
5. Once approved, the dancer sees the full dashboard with campaigns.
6. If rejected, they see the rejection reason and can re-apply after 30 days.

---

### Technical Details

#### 1. Database Changes

Add three new columns to the `profiles` table:
- `dance_style` (text, nullable) -- their dance genre/style
- `years_experience` (integer, nullable) -- years of dance experience
- `location` (text, nullable) -- city/region

Add an `application_status` enum and columns to track the approval workflow:
- Create enum: `application_status` with values `none`, `pending`, `approved`, `rejected`
- Add to `profiles`:
  - `application_status` (application_status, default `none`)
  - `application_submitted_at` (timestamptz, nullable)
  - `application_reviewed_at` (timestamptz, nullable)
  - `rejection_reason` (text, nullable)

#### 2. New Page: Application Form (`src/pages/dancer/Apply.tsx`)

A form that collects:
- Full name, bio, Instagram, TikTok, YouTube (pre-filled if already set)
- Dance style, years of experience, location (new fields)

On submit, updates the dancer's profile and sets `application_status` to `pending` and `application_submitted_at` to now.

#### 3. Gating Logic (ProtectedRoute or DashboardLayout)

When a dancer logs in:
- If `application_status = 'none'` --> redirect to `/dancer/apply`
- If `application_status = 'pending'` --> show "Application under review" message
- If `application_status = 'rejected'` --> show rejection reason + re-apply button (enabled only if 30+ days since `application_reviewed_at`)
- If `application_status = 'approved'` --> show normal dashboard

This check will be added to the `DashboardLayout` component so it gates all dancer pages.

#### 4. Admin: Review Applications (update `ManageDancers.tsx`)

Update the Manage Dancers page to:
- Show dancers grouped/filterable by application status (pending first)
- Display all application fields (dance style, experience, location, social links)
- Add Approve and Reject buttons (reject requires a reason)
- Use the `admin-data` edge function with new actions: `approve-dancer` and `reject-dancer`

#### 5. Edge Function Updates (`admin-data/index.ts`)

Add two new actions:
- `approve-dancer`: Sets `application_status = 'approved'` and `application_reviewed_at = now()` on the profile
- `reject-dancer`: Sets `application_status = 'rejected'`, stores `rejection_reason`, and sets `application_reviewed_at = now()`

Update the `dancers` action to include the new profile fields in the response.

#### 6. Files Changed/Created

- **New migration**: Add columns to `profiles` table + create `application_status` enum
- **New file**: `src/pages/dancer/Apply.tsx` -- application form
- **Modified**: `src/components/layout/DashboardLayout.tsx` -- add application status gating
- **Modified**: `src/pages/admin/ManageDancers.tsx` -- add approval/rejection UI
- **Modified**: `supabase/functions/admin-data/index.ts` -- add approve/reject actions
- **Modified**: `src/App.tsx` -- add route for `/dancer/apply`

