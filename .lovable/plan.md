

## Problem

The campaign edit form is missing input fields for **TikTok Sound URL** and **Instagram Sound URL**. Currently, when you save a campaign, these values are silently copied from the linked track record (which has placeholder "#" values), so your actual URLs never get saved.

The public campaign page (`/campaigns/no-one-morns-the-wicked-56731308`) correctly checks for these fields and renders buttons when they have values -- but since they're `null` in the database, no buttons appear.

## Solution

Add two new text input fields to the campaign edit form (and create form) so you can directly enter TikTok and Instagram sound URLs per campaign.

## Changes

### 1. Update the form state to include the new fields

Add `tiktok_sound_url` and `instagram_sound_url` to the `emptyForm` object and populate them when opening the edit dialog.

### 2. Add input fields to both Create and Edit dialogs

Add two labeled text inputs for:
- **TikTok Sound URL** (placeholder: `https://www.tiktok.com/...`)
- **Instagram Sound URL** (placeholder: `https://www.instagram.com/...`)

### 3. Update the save handlers

Change `handleCreate` and `handleEdit` to use the form values directly instead of pulling from the track:

```text
Before:  tiktok_sound_url: selectedTrack?.tiktok_sound_url ?? null
After:   tiktok_sound_url: form.tiktok_sound_url || null
```

### 4. Pre-populate from track on create

When creating a new campaign, auto-fill the URL fields from the selected track (if available) so admins have a starting point, but can override them.

---

### Technical Details

**File modified:** `src/pages/admin/ManageCampaigns.tsx`

- `emptyForm` (line 60): Add `tiktok_sound_url: ""` and `instagram_sound_url: ""`
- `openEdit` (line 150): Populate new fields from campaign data
- `handleCreate` (line 125): Use `form.tiktok_sound_url` instead of `selectedTrack?.tiktok_sound_url`
- `handleEdit` (line 177): Use `form.tiktok_sound_url` instead of `selectedTrack?.tiktok_sound_url`
- Create dialog (around line 300): Add two `<Input>` fields
- Edit dialog (around line 430): Add two `<Input>` fields

No database or backend changes needed -- the columns already exist on the `campaigns` table.

