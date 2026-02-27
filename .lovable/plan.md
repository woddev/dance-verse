

# Set Up Resend Email for Producer Process

## Overview
Integrate Resend to send branded transactional emails from `noreply@dance-verse.com` throughout the producer application lifecycle. Currently, approval only triggers a default system invite email, and rejection sends no notification at all.

## What You'll Get
- **Application received** confirmation email when a producer submits their application
- **Approval notification** email with a branded welcome message (in addition to the auth invite)
- **Rejection notification** email explaining the decision with the rejection reason

## Steps

### 1. Add RESEND_API_KEY Secret
Store your Resend API key securely so the backend functions can use it.

### 2. Create a `send-email` Edge Function
A reusable backend function that sends emails via the Resend API from `noreply@dance-verse.com`. It will accept a `to`, `subject`, and `html` body, keeping the email logic centralized.

### 3. Update the Admin Backend Function
Modify the `admin-data` edge function to call the `send-email` function when:
- A producer is **approved**: Send a branded welcome email alongside the existing auth invite
- A producer is **rejected**: Send a notification email that includes the rejection reason

### 4. Add Submission Confirmation Email
Update the producer application page so that after a successful submission, it calls the `send-email` function to send a "We received your application" confirmation to the applicant.

---

## Technical Details

### `send-email` Edge Function (`supabase/functions/send-email/index.ts`)
- Accepts POST with `{ to, subject, html }` 
- Uses `RESEND_API_KEY` from environment
- Sends via Resend API (`https://api.resend.com/emails`) with `from: "DanceVerse <noreply@dance-verse.com>"`
- Protected: validates authorization header or called internally from other edge functions

### `admin-data/index.ts` Changes
- In `approve-producer` case: after successful approval, call Resend to send a branded approval email
- In `reject-producer` case: after updating the DB, call Resend to send rejection notification with the reason
- Email sending is fire-and-forget (non-blocking) -- approval/rejection still succeeds even if email fails

### `producer/Apply.tsx` Changes
- After successful application submission, call the `send-email` function to send a confirmation email to the applicant's email address

### Email Templates (inline HTML)
Three simple branded HTML email templates embedded in the edge function:
1. **Application Received** -- "Thanks for applying, we'll review your submission"
2. **Approved** -- "Welcome to DanceVerse! Check your inbox for an account invite"
3. **Rejected** -- "Unfortunately we can't move forward at this time" + reason

