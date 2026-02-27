

# Two-Step Producer Signup

## Overview
Simplify the `/producer/apply` page to **Step 1: Create Account** (email, password, legal name, stage name only). Once signed up, the producer lands on their existing dashboard where they can submit tracks, view offers, contracts, and earnings -- all of which already exist.

The profile details (bio, genre, location, socials) move to a **Settings** page the producer can fill out later, keeping the signup friction minimal.

## What Changes

### 1. Slim down `/producer/apply` to account creation only
The signup form will only have:
- Email, Password, Confirm Password
- Legal Name (required), Stage Name (optional)
- "Create Account" button

All other fields (bio, genre, location, social URLs) are removed from the signup form.

After account creation, the producer is redirected to `/producer/dashboard` where they already have access to:
- **Submit Tracks** (`/producer/tracks/new`) -- upload audio + artwork for review
- **View Offers** (`/producer/offers`) -- see and respond to deal offers
- **Contracts** (`/producer/contracts`) -- review and sign contracts
- **Earnings** (`/producer/earnings`) -- track payouts

### 2. Create a Producer Settings page (`/producer/settings`)
A new page where producers can update their profile info at any time:
- Legal Name, Stage Name, Bio, Genre, Location
- Social links (TikTok, Instagram, Spotify, SoundCloud, other)
- Save button that calls the `producer-data` edge function to update the producer record

### 3. Add Settings link to producer sidebar
Add a "Settings" link with a gear icon to the `ProducerLayout` sidebar navigation, linking to `/producer/settings`.

### 4. Add route for producer settings
Register `/producer/settings` in `App.tsx` as a protected producer route.

### 5. Backend: Add `update-profile` action to producer-data edge function
A new action that lets producers update their own profile fields (bio, genre, location, social URLs) on the `deals.producers` table.

### 6. Update landing page copy
Minor copy tweak -- the "How It Works" steps already say "Sign Up" then "Submit Tracks", so they align perfectly. No major changes needed.

---

## Technical Details

### `src/pages/producer/Apply.tsx`
- Remove all fields except: email, password, confirm_password, legal_name, stage_name
- Remove LocationAutocomplete and Textarea imports
- Keep the existing `handleSubmit` logic (signUp + register-producer + welcome email + redirect)

### `src/pages/producer/Settings.tsx` (new file)
- Uses `ProducerLayout` wrapper
- Loads current profile via a new `producer-data?action=get-profile` call
- Form fields: legal_name, stage_name, bio, genre, location, social URLs
- Save calls `producer-data?action=update-profile`

### `src/components/layout/ProducerLayout.tsx`
- Add `{ to: "/producer/settings", label: "Settings", icon: Settings }` to `producerLinks`

### `src/App.tsx`
- Add route: `<Route path="/producer/settings" element={<ProtectedRoute requiredRole="producer"><ProducerSettings /></ProtectedRoute>} />`

### `supabase/functions/producer-data/index.ts`
- Add `update-profile` action that updates bio, genre, location, and social URL columns on the producer's `deals.producers` record
- Add `get-profile` action to fetch the current producer's profile data

