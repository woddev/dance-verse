
# Convert Producer Flow: Open Signup + Profile

## Overview
Replace the current "apply and wait for admin approval" flow with an open signup model. Producers will create an account (email/password), fill out their profile, and immediately start submitting tracks. Admin review shifts from the application level to the track level (which already exists).

## What Changes

### New Producer Signup Flow
1. Producer visits `/producers` landing page
2. Clicks "Sign Up" -> goes to `/producer/apply` (now a signup + profile form)
3. Creates account with email + password, fills in profile info (name, bio, genre, socials)
4. Gets automatically assigned the `producer` role and a `deals.producers` record
5. Redirected to `/producer/dashboard` -- can immediately submit tracks
6. Admin reviews tracks (existing functionality), not applications

### What Gets Removed
- The `producer_applications` table is no longer used for new signups
- Admin "Producer Applications" page becomes legacy (can view old applications but no new ones come in)
- The invite-by-email approval flow for producers is removed

## Steps

### 1. Update `/producer/apply` page
Replace the application form with a **signup + profile** form:
- Email + password fields (account creation via `supabase.auth.signUp`)
- Profile fields: legal name, stage name, bio, genre, location, social links
- On submit: create account, then call a new backend endpoint to set up the producer role and record
- Remove demo track upload (tracks are submitted separately after signup)
- Remove artwork upload from signup (moves to individual track submissions)
- Show success + redirect to dashboard

### 2. Create `register-producer` action in producer-data edge function
Add a new action that:
- Takes the authenticated user ID (from the just-created session)
- Inserts `producer` role into `user_roles`
- Creates the `deals.producers` record with legal name, stage name, email
- Returns success
- This uses the service role client to bypass RLS

### 3. Update producer-data edge function auth check
Currently the edge function requires the `producer` role to exist before any action. Add an exception for the `register-producer` action so a newly signed-up user (who doesn't have the role yet) can call it.

### 4. Update Auth page redirect
The Auth page already redirects producers to `/producer/dashboard`. No changes needed, but the new signup flow on `/producer/apply` will handle its own redirect after registration.

### 5. Update ProducerLanding page
Change the CTA from "APPLY AS A PRODUCER" to "SIGN UP AS A PRODUCER" and update copy accordingly.

### 6. Send welcome email
After successful registration, fire-and-forget a welcome email via the existing `send-email` edge function (reuse the branded template style).

### 7. Update Email Templates admin page
Replace the "Application Received" template with a "Welcome / Account Created" template. Remove the approval/rejection templates since they no longer apply to producers.

---

## Technical Details

### Producer Apply page (`src/pages/producer/Apply.tsx`)
- Replace form with: email, password, confirm password, legal name, stage name, bio, genre, location, social links
- On submit:
  1. `supabase.auth.signUp({ email, password })` 
  2. If successful, call `producer-data?action=register-producer` with profile data
  3. Send welcome email via `send-email` function
  4. Navigate to `/producer/dashboard`

### Producer-data edge function (`supabase/functions/producer-data/index.ts`)
- Add `register-producer` action before the role check
- This action:
  - Verifies the user is authenticated (has valid JWT)
  - Checks they don't already have producer role (prevents duplicates)
  - Inserts into `user_roles` with `producer` role
  - Calls `create_producer_record_on_approve` RPC
  - Returns success

### ProducerLanding page (`src/pages/ProducerLanding.tsx`)
- Update button text and description copy

### Email Templates page (`src/pages/admin/EmailTemplates.tsx`)
- Replace application-related templates with a "Welcome" template for new producer signups
