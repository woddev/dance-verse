
# Reporting: Scrape Views, Likes & Comments per Submission

## What's Already Built

The `scrape-stats` edge function exists and handles TikTok and Instagram. The Reports page has a global "Refresh Stats" button that calls it for all submissions at once.

**Gaps to fix:**
- YouTube is excluded from scraping (hard-filtered out in the query)
- No YouTube-specific parsing logic in the scraper
- No per-campaign or per-submission scrape control — it's all or nothing
- No visual feedback on which submissions have been scraped vs. have no data yet
- No way to re-scrape a single submission row

---

## What Will Change

### 1. `supabase/functions/scrape-stats/index.ts` — Add YouTube + improve parsing

**YouTube parsing strategy** (multiple fallback methods):
- Parse `og:description` for view/like/comment counts from YouTube's meta tags
- Look for `ytInitialData` embedded JSON (YouTube's standard page data blob) and extract `viewCount`, `likeCount` from the `videoDetails` or `engagementPanels`
- JSON-LD `interactionStatistic` fallback (YouTube uses this for structured data)
- Remove the `platform` filter restriction — include `youtube` in the query alongside `tiktok` and `instagram`

### 2. `src/pages/admin/Reports.tsx` — Per-campaign and per-submission scrape controls

**"Scrape Stats" button per campaign group:**
Each campaign card will get its own "Scrape Stats" button (next to "Edit" for report links). Clicking it collects all submission IDs for that campaign and calls `scrape-stats` with `{ submission_ids: [...] }` — the edge function already supports this parameter.

**Per-submission scrape icon:**
Each row in the submission table will get a small refresh icon button at the end. Clicking it calls `scrape-stats` with the single submission's ID. The row shows a spinner while scraping.

**Stat freshness indicator:**
Since `submissions` doesn't have a `scraped_at` column, the indicator will be simple: if `view_count > 0 || like_count > 0 || comment_count > 0`, show the numbers normally. If all are zero, show a faint dash with a "Not scraped" tooltip. No DB migration needed.

**Global "Refresh All" button** (existing) — keep as-is, now also covers YouTube.

---

## Technical Details

### Edge Function Changes

```typescript
// Before (only tiktok + instagram):
.in("platform", ["tiktok", "instagram"])

// After (all three):
.in("platform", ["tiktok", "instagram", "youtube"])
```

YouTube-specific scraping added inside `scrapeUrl()`:

```typescript
// Method: ytInitialData JSON blob
const ytMatch = html.match(/var ytInitialData\s*=\s*({.+?});\s*<\/script>/s)
  || html.match(/window\["ytInitialData"\]\s*=\s*({.+?});\s*<\/script>/s);
if (ytMatch) {
  try {
    const yt = JSON.parse(ytMatch[1]);
    const details = yt?.videoDetails;
    if (details?.viewCount) views = parseInt(details.viewCount) || views;
    // likes from engagementPanels
    const panels = yt?.engagementPanels ?? [];
    // ... extract like count from nested panel data
  } catch { /* ignore */ }
}
```

### UI Changes — `Reports.tsx`

**State additions:**
```typescript
const [scrapingCampaign, setScrapingCampaign] = useState<string | null>(null);
const [scrapingSubmission, setScrapingSubmission] = useState<string | null>(null);
```

**New helper function:**
```typescript
const scrapeSubmissions = async (submissionIds: string[], scopeKey: string, setter: (v: string | null) => void) => {
  setter(scopeKey);
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await supabase.functions.invoke("scrape-stats", {
      body: { submission_ids: submissionIds },
      headers: { Authorization: `Bearer ${session!.access_token}` },
    });
    if (res.error) throw res.error;
    toast({ title: "Stats updated", description: `Scraped ${res.data.processed} submissions.` });
    await fetchData();
  } catch (e: any) {
    toast({ title: "Scrape failed", description: e.message, variant: "destructive" });
  } finally {
    setter(null);
  }
};
```

**Per-campaign button** (added inside each group's Report Links header area):
```tsx
<Button variant="outline" size="sm"
  disabled={scrapingCampaign === group.campaign_id}
  onClick={() => scrapeSubmissions(
    group.submissions.map(s => s.id),
    group.campaign_id,
    setScrapingCampaign
  )}>
  <RefreshCw className={...} /> Scrape Stats
</Button>
```

**Per-submission row button** (last column in the submissions table):
```tsx
<TableCell>
  <Button variant="ghost" size="icon" className="h-7 w-7"
    disabled={scrapingSubmission === s.id}
    onClick={() => scrapeSubmissions([s.id], s.id, setScrapingSubmission)}>
    <RefreshCw className={`h-3.5 w-3.5 ${scrapingSubmission === s.id ? "animate-spin" : ""}`} />
  </Button>
</TableCell>
```

---

## Files to Change

| File | Change |
|------|--------|
| `supabase/functions/scrape-stats/index.ts` | Add YouTube to platform filter + YouTube-specific `ytInitialData` parsing |
| `src/pages/admin/Reports.tsx` | Add per-campaign scrape button + per-row scrape icon + shared helper |

No database migration needed.
