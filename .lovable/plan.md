
## Add Instagram Graph API Support for Reliable Metrics

### The Problem
Firecrawl is blocked by Instagram, so scraping returns no data. You now have an Instagram access token from the Instagram Graph API (Business Login), which gives us official, reliable metrics — exactly like the YouTube API key does for YouTube.

### How the Instagram Graph API Works
1. Given a post URL (e.g. `https://www.instagram.com/p/ABC123/`), we first use the **oEmbed endpoint** to resolve it to an official Instagram Media ID.
2. With the Media ID, we call `GET https://graph.instagram.com/{media_id}?fields=like_count,comments_count,media_type,timestamp&access_token=TOKEN` for basic counts.
3. For **video views**, we call the insights endpoint: `GET https://graph.instagram.com/{media_id}/insights?metric=views&access_token=TOKEN`

### What Will Be Changed

**1. Store the secret**
Add `INSTAGRAM_ACCESS_TOKEN` as a secure backend secret (you'll paste your token in the prompt).

**2. Update `supabase/functions/admin-data/index.ts`**
Replace the current broken Firecrawl Instagram block with a proper Graph API call:

```
scrapeInstagramGraphAPI(url, accessToken):
  1. Extract shortcode from URL → /p/{shortcode}/ or /reel/{shortcode}/
  2. Call oEmbed: GET https://graph.instagram.com/v21.0/instagram_oembed?url={url}&access_token={token}
     → returns media_id
  3. Call fields: GET https://graph.instagram.com/{media_id}?fields=like_count,comments_count,media_type&access_token={token}
  4. Call insights for views: GET https://graph.instagram.com/{media_id}/insights?metric=views&period=lifetime&access_token={token}
  5. Return { views, likes: like_count, comments: comments_count }
```

**3. Update `supabase/functions/scrape-stats/index.ts`**
Apply the same Graph API logic in the `scrapeInstagram()` function used for dancer submission metrics.

**4. Fallback handling**
If the Graph API call fails (e.g. expired token, private post), it falls back gracefully and returns the error — same pattern as YouTube.

### Files to Edit
- `supabase/functions/admin-data/index.ts` — replace Instagram Firecrawl block with Graph API
- `supabase/functions/scrape-stats/index.ts` — replace Instagram Firecrawl block with Graph API

### Important Notes
- Instagram access tokens **expire** (short-lived = 1 hour, long-lived = 60 days). You'll need to store a **long-lived token** and refresh it periodically. The implementation will log a clear error if the token is expired so you know to refresh it.
- The oEmbed endpoint requires your token to have `instagram_basic` permission.
- The insights endpoint requires `instagram_manage_insights` permission.
