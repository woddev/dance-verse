

# Batch Music Import with Extended Track Schema

## Overview
Expand the `tracks` table with music-industry metadata fields, then add a batch CSV import feature to the admin Music Library page with validation, preview, error reporting, and partial import support.

## Part 1 — Database Migration (new columns on `tracks`)

Add these columns to the existing `tracks` table:

| Column | Type | Notes |
|---|---|---|
| internal_catalog_id | text | nullable |
| isrc | text | nullable |
| version_name | text | nullable |
| master_owner | text | nullable |
| publishing_owner | text | nullable |
| master_split_percent | numeric | nullable |
| publishing_split_percent | numeric | nullable |
| pro_affiliation | text | nullable |
| content_id_status | text | nullable |
| sync_clearance | text | nullable |
| sample_clearance | text | nullable |
| energy_level | text | nullable |
| vocal_type | text | nullable |
| dance_style_fit | jsonb | default '[]' |
| mood_tags | jsonb | default '[]' |
| battle_friendly | boolean | default false |
| choreography_friendly | boolean | default false |
| freestyle_friendly | boolean | default false |
| drop_time_seconds | integer | nullable |
| counts | text | nullable |
| available_versions | jsonb | default '[]' |
| preview_url | text | nullable |
| download_url | text | nullable |
| usage_count | integer | default 0 |
| revenue_generated | numeric | default 0 |

Also create a `track_uploads` table to log upload history (uploader user_id, filename, row_count, success_count, error_count, created_at).

## Part 2 — Edge Function Updates

**`admin-data/index.ts`**:
- Add `batch-create-tracks` action: accepts `{ tracks: Array<TrackFields> }`, bulk-inserts via `.insert(tracks)`, returns inserted rows
- Update `create-track` and `update-track` allowed fields to include all new columns
- Add `tracks` action to return all new columns in the SELECT query

## Part 3 — UI: Batch Import Dialog in `ManageMusic.tsx`

Add a "Batch Import" button next to "Add Track". Opens a multi-step dialog:

1. **Upload step**: CSV file drop zone + downloadable CSV template link (generated client-side with all column headers)
2. **Header mapping step**: If CSV headers don't exactly match, show a simple mapping UI (dropdown per column) — auto-match close names
3. **Preview step**: Table showing parsed rows with:
   - Invalid rows highlighted red (missing required `title` or `artist_name`)
   - Inline error messages per cell
   - Duplicate detection warnings (matching `title + artist_name` or `isrc` against existing tracks)
   - Row removal via X button
4. **Confirm step**: Summary (X valid, Y invalid, Z duplicates). Options: "Import All Valid Rows" or "Cancel"
5. **Result step**: Success count + option to download error report CSV (invalid/skipped rows with reasons)

After import, log to `track_uploads` table.

## Part 4 — Update Single-Track Add/Edit Dialog

Extend the existing add/edit form in `ManageMusic.tsx` with the new fields organized in collapsible sections:
- **Rights & Ownership**: master_owner, publishing_owner, splits, pro_affiliation, content_id_status, sync/sample clearance
- **Music Metadata**: energy_level, vocal_type, drop_time_seconds, counts
- **Dance Fit**: dance_style_fit, mood_tags, battle/choreography/freestyle friendly toggles
- **Versions & Links**: available_versions, preview_url, download_url, isrc, internal_catalog_id, version_name

## Dependencies
- Add `papaparse` + `@types/papaparse` for CSV parsing

## Technical Details
- CSV parsing is client-side via PapaParse
- Array/JSON fields in CSV parsed from comma-separated strings (e.g. `"hip-hop,latin"` → `["hip-hop","latin"]`)
- Boolean fields accept `true/false/yes/no/1/0`
- Numeric fields validated as numbers; invalid → null
- Duplicate detection queries existing tracks before import via `callAdmin("tracks")`
- Upload history recorded via a new `log-track-upload` admin action

