

# Track Detail Page (`/catalog/:id`)

## Overview
Create a dedicated public page for each track in the catalog, showing rich details, an audio player, and videos submitted by dancers for campaigns using that track.

## Available Data from `tracks` Table
- **Core**: title, artist_name, genre, mood, energy_level, bpm, duration_seconds, cover_image_url
- **Dance fit**: dance_style_fit (JSON array), choreography_friendly, battle_friendly, freestyle_friendly
- **Audio**: preview_url, audio_url, spotify_url, tiktok_sound_url, instagram_sound_url
- **Tags**: mood_tags (JSON array), vocal_type, counts
- **Popularity**: usage_count

## Page Sections

### 1. Hero / Header
Large album art on the left, track title + artist name on the right, genre badge, popularity fire badge, and BPM/duration/energy metadata chips.

### 2. Audio Player
Full-width waveform-style player (reuse existing 30s preview logic from catalog). Larger, more prominent than the list version.

### 3. Track Details Grid
Two-column info grid showing:
- Genre, Mood, Energy Level, BPM, Vocal Type
- Dance Style Fit tags (from JSON array)
- Flags: Choreography Friendly, Battle Friendly, Freestyle Friendly (as checkmark badges)

### 4. Platform Links
Buttons/icons linking to Spotify, TikTok Sound, Instagram Sound when URLs exist.

### 5. Dance Videos Section
Query `submissions` joined through `campaigns` (via `campaigns.track_id = tracks.id`) to find approved video submissions for this track. Display as an embedded video grid showing:
- Platform icon (TikTok/Instagram/YouTube)
- Dancer name (from profiles)
- View/like/comment counts
- Link to the original post

If no videos exist yet, show an empty state: "No dance videos yet — be the first!"

### 6. Related Campaigns
Show any active campaigns using this track, with a CTA for dancers to join.

## Technical Details

### New file: `src/pages/TrackDetail.tsx`
- Fetch track by ID: `supabase.from('tracks').select('*').eq('id', id).single()`
- Fetch submissions: `supabase.from('submissions').select('*, campaigns!inner(track_id, title), profiles_safe!inner(full_name, avatar_url)').eq('campaigns.track_id', id).eq('review_status', 'approved')`
- Fetch related campaigns: `supabase.from('campaigns').select('*').eq('track_id', id).eq('status', 'active')`

### Route addition in `App.tsx`
`<Route path="/catalog/:id" element={<TrackDetail />} />`

### Catalog page update
Make each track row clickable, linking to `/catalog/{track.id}`.

### RLS
- Tracks: already allows anon SELECT for active tracks
- Submissions: only visible to admins and the owning dancer — we'll need a new RLS policy to allow public SELECT on approved submissions, OR use an edge function to serve this data
- Profiles_safe: currently has no public access — same consideration

### RLS Changes Needed
1. Add policy on `submissions`: allow public SELECT where `review_status = 'approved'` (only exposes video URLs and engagement counts, no sensitive data)
2. Add policy on `profiles_safe` view: allow public SELECT (it's already stripped of sensitive fields by design)

