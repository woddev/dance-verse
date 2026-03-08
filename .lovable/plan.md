

## Plan: Enable Stripe Payment for Promotion Packages

### Step 1 — Enable Stripe Integration
Use the Stripe enablement tool to securely collect your Stripe secret key. This unlocks Stripe-specific tools and patterns for building the checkout flow.

### Step 2 — Create Database Tables
- **`promotion_packages`** — admin-managed pricing tiers (name, price_cents, features, max_creators, platforms, position, active)
- **`artist_submissions`** — artist campaign requests with selected package, contact info, song details, audio/image uploads, payment status, and review status

### Step 3 — Build Stripe Checkout Edge Function
- New `create-promotion-checkout` edge function
- Creates a Stripe Checkout Session for the selected package
- On success, records the payment reference in `artist_submissions`
- Redirects artist back to a confirmation page

### Step 4 — Handle Payment Confirmation
- Add webhook handling in `stripe-webhook` for `checkout.session.completed`
- Updates `artist_submissions.payment_status` to `paid`

### Step 5 — Public "Promote Your Music" Page (`/promote`)
- Hero section + pricing grid from `promotion_packages`
- Submission form: artist name, song title, email, audio upload, cover image, social links, hashtags
- On submit: creates `artist_submissions` row, then redirects to Stripe Checkout

### Step 6 — Admin Management
- **`/admin/packages`** — CRUD for promotion packages
- **`/admin/artist-submissions`** — review queue for paid submissions; approve → pre-fill campaign creation
- Add both to AdminLayout sidebar

### Step 7 — Email Notifications
- Confirmation email on successful payment
- Notification emails on admin approval/rejection

### Key Technical Detail
The artist does NOT need an account. The flow is: select package → fill form → pay via Stripe Checkout → submission lands in admin queue.

