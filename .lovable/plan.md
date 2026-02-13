

## Show Submitted Dancers on Campaign Detail Pages

Add a "Dancers" section to the campaign detail page that displays the profiles of dancers who have submitted content for the campaign, giving social proof and building excitement.

### What You'll See

- A new "Creators on this Campaign" section below the Compensation card
- Each dancer shown as an avatar with their name
- If a dancer has social handles (Instagram, TikTok), those are shown as small icons/links
- A count header like "6 Creators" 
- If no submissions yet, show a subtle "Be the first to submit!" message
- Visible on both the public campaign page and the logged-in dancer campaign page

### Technical Details

**New: Database function `get_campaign_dancers`**

Since dancer profiles are protected by RLS (users can only see their own), we need a `SECURITY DEFINER` function that returns limited public info for dancers who have submitted to a specific campaign. It will return: `full_name`, `avatar_url`, `instagram_handle`, `tiktok_handle` for each unique dancer with at least one submission on the campaign.

**Migration SQL:**
```sql
CREATE OR REPLACE FUNCTION public.get_campaign_dancers(p_campaign_id uuid)
RETURNS TABLE (
  dancer_id uuid,
  full_name text,
  avatar_url text,
  instagram_handle text,
  tiktok_handle text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT DISTINCT s.dancer_id, p.full_name, p.avatar_url, p.instagram_handle, p.tiktok_handle
  FROM submissions s
  JOIN profiles p ON p.id = s.dancer_id
  WHERE s.campaign_id = p_campaign_id
$$;
```

**Modified: `src/pages/CampaignDetail.tsx` (public view)**
- Fetch dancers using `supabase.rpc('get_campaign_dancers', { p_campaign_id: campaign.id })`
- Add a "Creators on this Campaign" card after the Compensation section
- Display dancer avatars in a horizontal row using the Avatar component
- Show name below each avatar, with optional social handle links

**Modified: `src/pages/dancer/CampaignDetail.tsx` (dancer view)**
- Same fetch and display logic
- Placed after the Compensation/Status grid

**No new dependencies needed** -- uses existing Avatar, Card, and Badge components.

