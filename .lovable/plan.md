

# Public Dancer Profile Page

## Overview
Create a public-facing profile page at `/creators/:id` that showcases a dancer's profile image, social media links, location with a country flag, and their latest campaign video submissions.

## What You'll Get
- A clean, public profile page accessible without login
- Large profile image with fallback initials
- Social media links (Instagram, TikTok, YouTube) as clickable icons
- Location displayed with a country flag emoji
- A "Latest Posts" section showing recent video submissions with campaign info

## Technical Details

### 1. Database: Public Profile Function
Create a `SECURITY DEFINER` database function `get_public_profile` that safely exposes only non-sensitive profile fields (name, bio, avatar, social handles, location, dance style) -- excluding Stripe info, application status, etc. This avoids needing to change RLS policies on the profiles table.

Also create a `get_dancer_submissions` function that returns a dancer's submissions joined with campaign title/artist, limited to approved submissions only, ordered by most recent.

### 2. New Page: `src/pages/DancerProfile.tsx`
- Fetches profile data via `get_public_profile(p_dancer_id)`
- Fetches submissions via `get_dancer_submissions(p_dancer_id)`
- Layout sections:
  - **Header**: Large avatar (centered), full name, bio, dance style
  - **Location**: Parse country from location string and show a flag emoji alongside the location text
  - **Social Links**: Icon buttons linking to Instagram, TikTok, and YouTube profiles
  - **Latest Posts**: Grid of submission cards showing platform icon, video link, campaign name/artist, and submission date

### 3. Route Registration
Add public route `/creators/:id` in `App.tsx`.

### 4. Profile Links from Existing Components
Update the `CampaignDancers` component so each dancer's name/avatar links to their public profile (`/creators/:dancer_id`).

### Files to Create/Modify
- **Create** `src/pages/DancerProfile.tsx` -- the public profile page
- **Modify** `src/App.tsx` -- add the `/creators/:id` route
- **Modify** `src/components/campaign/CampaignDancers.tsx` -- link dancers to their profile
- **Database migration** -- add `get_public_profile` and `get_dancer_submissions` functions

