

## Plan: Inline Submission on Public Campaign Page

**Problem**: When a dancer clicks "View & Submit" on the public campaign page (`/campaigns/:slug`), they navigate to `/dancer/campaigns/:id` which is essentially the same page wrapped in a dashboard layout. This is redundant and disorienting.

**Solution**: Embed the `PlatformSubmissions` component directly on the public campaign detail page (`/campaigns/:slug`) when the dancer is logged in and has accepted the campaign. Remove the separate navigation.

### Changes

**1. Update `src/pages/CampaignDetail.tsx` (public campaign page)**

- Fetch the full acceptance record (not just status) so we have `acceptance.id` and `acceptance.deadline`
- Import `PlatformSubmissions` component
- When `acceptanceStatus` exists and is not `"submitted"`, show the `PlatformSubmissions` inline instead of the "View & Submit" link
- When already submitted, show a "Submitted" confirmation badge instead of the link
- Add deadline info and "Your Status" card similar to the dancer version
- Replace the "View & Submit" button with a "Submit Video" button that scrolls to the inline submission section

**2. Keep `src/pages/dancer/CampaignDetail.tsx` as-is**

The dancer-specific route still works for dancers navigating from their dashboard, but the primary flow will now be the public page.

### What the dancer will see on the public campaign page:

- **Not logged in**: "Apply to Join" button (unchanged)
- **Logged in, not accepted**: "Accept Campaign" button (unchanged)
- **Logged in, accepted, not submitted**: "Submit Video" button that scrolls down to an inline `PlatformSubmissions` section at the bottom of the page, plus a deadline badge in the hero
- **Logged in, accepted, already submitted**: A green "Submitted" badge/confirmation instead of a link

