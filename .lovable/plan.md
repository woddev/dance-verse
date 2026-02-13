

## Per-Platform URL Submission for Dancers

After a dancer accepts a campaign, they need to submit a social media post URL for each required platform so your team can verify the posting and track views for payment.

### What Changes

**Current behavior:** Dancers submit one URL with one platform selection, then see "Submitted" with no way to add more.

**New behavior:** Dancers see a checklist of all required platforms (e.g., TikTok, Instagram, YouTube) and submit a URL for each one individually. The status section shows which platforms still need a URL, and "submitted" status is only set once all platform URLs are provided.

### What You'll See

- After accepting a campaign, the submission section shows each required platform as a row
- Each platform has a URL input field and a submit button
- Already-submitted platforms show a green checkmark with the submitted URL
- A progress indicator (e.g., "2 of 3 platforms submitted")
- The acceptance status updates to "submitted" only when all required platforms have a URL
- Late submissions are still flagged automatically

### Technical Details

**Modified: `src/pages/dancer/CampaignDetail.tsx`**
- Remove the single-URL / file-upload submission form
- Replace with a per-platform submission UI that:
  - Fetches existing submissions for this acceptance from the `submissions` table
  - Displays each required platform as a card/row with a URL input
  - On submit, inserts a row into `submissions` for that specific platform
  - Shows submitted URLs with checkmarks for completed platforms
  - Only marks acceptance as "submitted" when all required platforms have a submission
- Remove the file upload tab (since URLs are needed for verification, not raw video files)

**No database changes needed** -- the existing `submissions` table already supports multiple rows per acceptance (one per platform), with `video_url` and `platform` columns.

