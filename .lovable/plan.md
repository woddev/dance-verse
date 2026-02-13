

# Fix Stripe Connect "Connected" Status

## Problem
You completed Stripe onboarding successfully, but the app still shows "Continue Stripe Setup" because the database flag `stripe_onboarded` remains `false`. The webhook meant to update this flag after Stripe confirms the account isn't working.

## Solution
Rather than relying solely on the webhook (which requires extra Stripe Dashboard configuration), we'll make the system smarter by checking the Stripe account status directly when the dancer visits their Settings page.

## Steps

### 1. Fix your current data
Run a database update to set your account as onboarded since Stripe already confirmed it.

### 2. Create a new backend function: `check-stripe-status`
A new backend function that:
- Takes the authenticated dancer's Stripe account ID from the database
- Calls the Stripe API to check if `charges_enabled` and `payouts_enabled` are both true
- If yes, automatically updates `stripe_onboarded = true` in the database
- Returns the current onboarded status

### 3. Update the Settings page
When the Settings page loads, call the `check-stripe-status` function to sync the latest Stripe account state before displaying the UI. This way, if a dancer completes onboarding and returns to the app, their status will automatically update to "Connected" without depending on webhooks.

## Technical Details

- **New edge function**: `supabase/functions/check-stripe-status/index.ts` -- authenticates the user, looks up their `stripe_account_id`, calls `stripe.accounts.retrieve()`, and updates the profile if fully onboarded.
- **Updated file**: `src/pages/dancer/Settings.tsx` -- after fetching the profile, call the new function to sync status before rendering.
- **Config update**: Add `[functions.check-stripe-status]` with `verify_jwt = false` to `supabase/config.toml`.
- **Database fix**: Update the existing record for `mcginn77@gmail.com` to `stripe_onboarded = true`.

