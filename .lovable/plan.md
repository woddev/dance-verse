

## Add Social Media Profile Fields to Producer Application

Add social media URL fields (TikTok, Instagram, Spotify, and a general "Other") to the producer application form and admin review page.

### Changes

**1. Database Migration**
Add four new columns to `producer_applications`:
- `tiktok_url` (text, nullable)
- `instagram_url` (text, nullable)
- `spotify_url` (text, nullable)
- `other_social_url` (text, nullable)

**2. Producer Application Form (`src/pages/producer/Apply.tsx`)**
- Add the four new fields to the form state
- Add input fields in a "Social Media Profiles" section (alongside the existing Portfolio Links section)
- Include the new fields in the submission payload

**3. Admin Review Page (`src/pages/admin/ManageProducerApplications.tsx`)**
- Update the `ProducerApp` interface with the new fields
- Display clickable links for each social profile alongside the existing portfolio links

