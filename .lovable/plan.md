

# Music Catalog Page

## Overview
Create a new public-facing `/catalog` page that displays tracks from the existing `tracks` table in a responsive grid with search and genre filtering.

## Data Source
The `tracks` table already has all needed fields: `title`, `artist_name`, `genre`, `duration_seconds`, `cover_image_url`, `status`. The existing RLS policy allows authenticated users to view active tracks, but for a **public** page we need an additional RLS policy allowing anonymous/public SELECT on active tracks.

## Plan

### 1. Database Migration
Add a new RLS policy on `tracks` to allow public (anon) SELECT for active tracks:
```sql
CREATE POLICY "Anyone can view active tracks"
ON public.tracks FOR SELECT TO anon
USING (status = 'active');
```

### 2. Create `/src/pages/Catalog.tsx`
- Follow the same pattern as `Campaigns.tsx` (Navbar, Footer, search bar, filters, grid)
- **Search bar** at top filtering by title or artist name (client-side)
- **Genre filter buttons** as a horizontal row of toggle-style buttons (All, Electronic, Hip-Hop, Latin, Pop, R&B, Afrobeats, etc.) — reusing the same genre list from Campaigns
- **Track cards** in a responsive grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
  - Square album art thumbnail (using `cover_image_url`, fallback to Music icon)
  - Track title, artist name
  - Genre badge
  - Duration formatted as `m:ss`
- Loading skeletons while fetching
- Empty state when no results match

### 3. Add Route in `App.tsx`
Add `<Route path="/catalog" element={<Catalog />} />` in the public routes section.

### Technical Details
- Fetch tracks from Supabase: `supabase.from('tracks').select('*').eq('status', 'active')`
- Client-side filtering for search and genre (same pattern as Campaigns page)
- Duration formatting helper: `Math.floor(s/60) + ':' + String(s%60).padStart(2,'0')`
- Uses existing UI components: Card, Badge, Input, Skeleton, Navbar, Footer

