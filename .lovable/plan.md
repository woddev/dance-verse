

# Admin Reporting Section

## Overview
Add a new "Reports" section to the admin panel that lets you generate CSV and PDF reports of all dancer submissions, including links, views, comments, budget, and dancer details.

## What You'll Get
- A new "Reports" page accessible from the admin sidebar
- Filters by campaign, date range, and submission status
- A summary header showing total budget, total views, and number of dancers involved
- A data table with all submission details
- "Export CSV" and "Export PDF" buttons to download the report

## Database Changes
The submissions table currently only has a `view_count` column. Two new columns will be added:
- `comment_count` (integer, default 0)
- `like_count` (integer, default 0)

These can be updated manually or via future integrations with social platforms.

## Technical Details

### 1. Database Migration
Add `comment_count` and `like_count` columns to the `submissions` table.

### 2. Update Edge Function (`admin-data/index.ts`)
Add a new `report-data` action that returns enriched submission data grouped by campaign, including:
- Each submission's video URL, platform, view count, comment count, like count
- Dancer name, social handles
- Campaign title, artist, budget (from pay_scale), start/end dates

### 3. New Admin Page (`src/pages/admin/Reports.tsx`)
- Campaign selector dropdown (filter by specific campaign or "All")
- Status filter (All / Pending / Approved / Rejected)
- Summary cards: Total Budget, Total Views, Total Dancers
- Data table: Dancer, Campaign, Platform, Video Link, Views, Comments, Likes, Status, Date
- Export CSV button: generates and downloads a `.csv` file client-side
- Export PDF button: generates a styled PDF client-side using basic browser print/HTML-to-PDF approach (no extra library needed -- uses `window.print()` on a formatted view)

### 4. Route and Navigation
- Add route `/admin/reports` in `App.tsx`
- Add "Reports" link with `FileBarChart` icon to the admin sidebar in `AdminLayout.tsx`

### Files to Create/Edit
- **New**: `src/pages/admin/Reports.tsx`
- **Edit**: `supabase/functions/admin-data/index.ts` (add `report-data` action)
- **Edit**: `src/App.tsx` (add route)
- **Edit**: `src/components/layout/AdminLayout.tsx` (add sidebar link)
- **Migration**: Add `comment_count` and `like_count` columns to submissions

