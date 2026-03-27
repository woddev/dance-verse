

# Add Terms Agreement to Producer Track Submission

## Problem
Producers can submit tracks without agreeing to any content licensing or rights terms. The platform needs explicit consent before accepting music for campaign use.

## Solution
Add a required terms agreement checkbox to the Submit Track page, reusing the existing `TermsDialog` component pattern but with producer-specific terms language.

## Changes

### 1. Create `src/components/legal/ProducerTermsDialog.tsx`
- New dialog with producer-specific terms covering:
  - License grant for submitted music (sync, distribution, campaign use)
  - Rights representations and warranties (ownership, clearance, no infringement)
  - Revenue share acknowledgment (compensation per separate deal terms)
  - AI/data usage rights
  - Indemnification
- Same UI pattern as the existing `TermsDialog` (scroll area, dialog)

### 2. Update `src/pages/producer/SubmitTrack.tsx`
- Add `termsAccepted` boolean state (default `false`)
- Add a `Checkbox` + `ProducerTermsDialog` link below the form fields: "I agree to the [Track Submission Terms]"
- Disable the Submit button until `termsAccepted` is `true`
- Pass `terms_accepted: true` in the submission payload

### 3. Database (optional enhancement)
- Add `terms_accepted_at` timestamp to the track submission flow in `producer-data` edge function's `submit-track` action, storing when the producer agreed

## No changes needed
- Existing `TermsDialog` for dancers remains untouched
- No new routes required

