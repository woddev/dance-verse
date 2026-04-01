

# Move Submission Reviews Under Campaigns

## Summary
Instead of a separate "Submissions" page in the admin sidebar, embed submission review directly into each campaign's card on the Campaigns page. This makes submissions contextual — you see and review them where they belong.

## Approach
- Remove the standalone `/admin/submissions` route and sidebar link
- Add an expandable "Submissions" section to each campaign card on the Manage Campaigns page
- Clicking a campaign reveals its pending/approved/rejected submissions inline with approve/reject actions
- Keep the same review functionality (approve, reject with reason dialog)

## Changes

### `src/components/layout/AdminLayout.tsx`
- Remove the `{ to: "/admin/submissions", label: "Submissions", icon: FileCheck }` entry from the sidebar

### `src/pages/admin/ManageCampaigns.tsx`
- Add submission fetching (reuse the `callAdmin("submissions")` endpoint, grouped by `campaign_id`)
- Add a collapsible/expandable section per campaign card showing its submissions count badge and a review table
- Include approve/reject buttons and rejection reason dialog (same logic from ReviewSubmissions)
- Show pending count badge on each campaign card for quick visibility

### `src/App.tsx`
- Remove the `/admin/submissions` route (keep the file for now but it becomes unused)

## Result
Each campaign card gets a "Submissions (3 pending)" indicator. Expanding it shows the submission table with approve/reject actions inline — no more navigating to a separate page.

