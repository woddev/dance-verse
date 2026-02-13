

## Admin Music Library (Tracks) Page

Currently, tracks (music) are only accessible as a dropdown when creating campaigns. This plan adds a dedicated **Music** tab in the admin sidebar with a full-featured track management page including filtering, search, and CRUD operations.

### What You'll Get

- A new "Music" link in the admin sidebar (between Overview and Campaigns)
- A dedicated page at `/admin/music` showing all tracks in a table
- **Search** by title or artist name
- **Filters** for genre, mood, and status (active/inactive)
- Ability to **add**, **edit**, and **delete** tracks from this page
- Track details shown: title, artist, genre, mood, BPM, duration, status, and creation date

### Technical Details

**New file: `src/pages/admin/ManageMusic.tsx`**
- Fetches tracks via the existing `admin-data` edge function (`action=tracks`)
- Table view with columns: Cover, Title, Artist, Genre, Mood, BPM, Duration, Status, Created
- Search input filtering by title/artist (client-side)
- Dropdown filters for genre, mood, and status
- Add Track dialog with all track fields (title, artist, cover image URL, audio URL, TikTok/Instagram/Spotify URLs, genre, mood, BPM, duration, usage rules)
- Edit Track dialog (reuses same form)
- Delete Track with confirmation
- Uses existing `create-track` and `delete-track` actions in the edge function
- Adds a new `update-track` action to the edge function for editing

**Modified: `supabase/functions/admin-data/index.ts`**
- Add `update-track` action that updates a track by ID with allowed fields

**Modified: `src/components/layout/AdminLayout.tsx`**
- Add a "Music" sidebar link with the Music icon, pointing to `/admin/music`

**Modified: `src/App.tsx`**
- Add route `/admin/music` pointing to the new `ManageMusic` page, wrapped in `ProtectedRoute`

