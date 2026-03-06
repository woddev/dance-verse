

## Plan: Campaign Categories & Music Genre Filters

### Problem
Campaigns have no category (e.g. "Shorts", "Dance Challenge", "Freestyle") or music genre metadata, so users can't filter or visually distinguish campaign types on the browse page.

### Database Changes

Add two new columns to the `campaigns` table via migration:

```sql
ALTER TABLE public.campaigns
  ADD COLUMN category text NOT NULL DEFAULT 'shorts',
  ADD COLUMN genre text NULL;
```

Predefined category values (enforced in UI, not as enum for flexibility): `shorts`, `dance_challenge`, `freestyle`, `transition`, `duet`

Genre values (also UI-enforced): `hip_hop`, `pop`, `r_and_b`, `afrobeats`, `latin`, `electronic`, `k_pop`, `country`, `other`

### UI Changes

**1. Campaigns browse page (`src/pages/Campaigns.tsx` and `src/pages/dancer/CampaignBrowse.tsx`)**

- Add a **filter bar** below search with two rows of pill/toggle buttons:
  - **Category row**: "All", "Shorts", "Dance Challenge", "Freestyle", "Transition", "Duet" — styled as horizontally scrollable toggle pills
  - **Genre row**: "All", "Hip Hop", "Pop", "R&B", "Afrobeats", "Latin", "Electronic", "K-Pop", "Country" — same pill style
- Active filter pills get the brand green background; inactive are outline/muted
- Client-side filtering on `category` and `genre` fields, combined with existing search

**2. Campaign cards — visual category indicator**

- Add a small **category badge** in the top-left corner of the cover image (e.g. "SHORTS" in a semi-transparent pill) so users can see the type at a glance
- Different subtle accent colors per category (all muted, not overwhelming)

**3. Admin campaign management (`src/pages/admin/ManageCampaigns.tsx`)**

- Add **Category** and **Genre** select dropdowns to the campaign create/edit form so admins can set these when creating campaigns

### Files Modified

| File | Change |
|---|---|
| `supabase/migrations/...` | Add `category` and `genre` columns |
| `src/pages/Campaigns.tsx` | Add filter bar, category badge on cards |
| `src/pages/dancer/CampaignBrowse.tsx` | Same filter bar and badge |
| `src/pages/admin/ManageCampaigns.tsx` | Add category/genre fields to create/edit form |

