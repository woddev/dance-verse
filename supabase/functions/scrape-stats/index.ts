import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Parse shorthand numbers like "1.2K", "500", "3.4M"
function parseNum(str: string): number {
  const m = str.trim().toLowerCase().replace(/,/g, "").match(/^([\d.]+)\s*([kmb])?$/);
  if (!m) return 0;
  let n = parseFloat(m[1]);
  if (m[2] === "k") n *= 1_000;
  if (m[2] === "m") n *= 1_000_000;
  if (m[2] === "b") n *= 1_000_000_000;
  return Math.round(n);
}

// Extract YouTube video ID from various URL formats
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

// Try YouTube oEmbed for basic info (no auth needed, but no view/like counts)
// Use YouTube Data API v3 if key available, otherwise fallback to scraping
async function scrapeYouTube(url: string): Promise<{ views: number; likes: number; comments: number; error?: string }> {
  const videoId = extractYouTubeId(url);
  console.log(`YouTube: extracted videoId=${videoId} from url=${url}`);

  if (!videoId) {
    return { views: 0, likes: 0, comments: 0, error: "Could not extract YouTube video ID" };
  }

  // Try YouTube Data API v3 first if key is available
  const ytApiKey = Deno.env.get("YOUTUBE_API_KEY");
  if (ytApiKey) {
    try {
      const apiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=statistics&key=${ytApiKey}`;
      const apiRes = await fetch(apiUrl);
      if (apiRes.ok) {
        const apiData = await apiRes.json();
        const stats = apiData?.items?.[0]?.statistics;
        if (stats) {
          const views = parseInt(stats.viewCount ?? "0", 10);
          const likes = parseInt(stats.likeCount ?? "0", 10);
          const comments = parseInt(stats.commentCount ?? "0", 10);
          console.log(`YouTube API: views=${views}, likes=${likes}, comments=${comments}`);
          return { views, likes, comments };
        }
      }
    } catch (e: any) {
      console.log(`YouTube API failed: ${e.message}`);
    }
  }

  // Fallback: scrape the page with YouTube-specific headers
  // Use the mobile endpoint which is less likely to show consent walls
  const attemptUrls = [
    `https://m.youtube.com/watch?v=${videoId}`,
    `https://www.youtube.com/watch?v=${videoId}`,
    url, // original (may be /shorts/)
  ];

  const headers = {
    "User-Agent": "Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate",
    "Cookie": "CONSENT=YES+cb; PREF=hl=en",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
  };

  for (const attemptUrl of attemptUrls) {
    try {
      console.log(`YouTube scrape attempt: ${attemptUrl}`);
      const res = await fetch(attemptUrl, { headers, redirect: "follow" });
      if (!res.ok) {
        console.log(`YouTube HTTP ${res.status} for ${attemptUrl}`);
        continue;
      }

      const html = await res.text();
      console.log(`YouTube HTML length: ${html.length} for ${attemptUrl}`);

      // Check if we got a consent/login page
      if (html.includes("consent.youtube.com") || html.includes("signin-form") || html.length < 10000) {
        console.log(`YouTube: got consent/login page for ${attemptUrl}`);
        continue;
      }

      let views = 0, likes = 0, comments = 0;

      // Method 1: ytInitialData JSON blob
      const ytMatches = [
        html.match(/var ytInitialData\s*=\s*(\{.+?\});\s*(?:var |<\/script>)/s),
        html.match(/ytInitialData\s*=\s*(\{.+?\});\s*(?:var |<\/script>|window)/s),
      ];

      for (const ytMatch of ytMatches) {
        if (!ytMatch) continue;
        try {
          const yt = JSON.parse(ytMatch[1]);

          // viewCount from videoDetails
          const details = yt?.videoDetails;
          if (details?.viewCount) {
            views = parseInt(details.viewCount) || views;
            console.log(`YouTube ytInitialData viewCount: ${views}`);
          }

          // viewCount from microformat
          const microformat = yt?.microformat?.playerMicroformatRenderer;
          if (microformat?.viewCount) {
            views = parseInt(microformat.viewCount) || views;
            console.log(`YouTube microformat viewCount: ${views}`);
          }

          // Look for view count in videoPrimaryInfoRenderer
          const primaryInfo = yt?.contents?.twoColumnWatchNextResults?.results?.results?.contents
            ?.find((c: any) => c?.videoPrimaryInfoRenderer)?.videoPrimaryInfoRenderer;
          if (primaryInfo) {
            const vcText = primaryInfo?.viewCount?.videoViewCountRenderer?.viewCount?.simpleText ?? "";
            if (vcText) views = parseNum(vcText.replace(/[^0-9KkMmBb.]/g, "")) || views;
          }

          // likes from engagementPanels
          const panels: any[] = yt?.engagementPanels ?? [];
          for (const panel of panels) {
            const panelId = panel?.engagementPanelSectionListRenderer?.panelIdentifier ?? "";
            if (panelId.includes("like")) {
              const countStr = panel?.engagementPanelSectionListRenderer?.header
                ?.engagementPanelTitleHeaderRenderer?.contextualInfo?.runs?.[0]?.text ?? "";
              if (countStr) {
                likes = parseNum(countStr) || likes;
                console.log(`YouTube likes from panel: ${likes}`);
              }
            }
          }

          // Try topLevelButtons for likes
          const buttons = primaryInfo?.videoActions?.menuRenderer?.topLevelButtons ?? [];
          for (const btn of buttons) {
            const likeBtnRenderer = btn?.segmentedLikeDislikeButtonRenderer?.likeButton?.toggleButtonRenderer
              ?? btn?.toggleButtonRenderer;
            if (likeBtnRenderer) {
              const countText = likeBtnRenderer?.defaultText?.accessibility?.accessibilityData?.label ?? "";
              const likeMatch = countText.match(/([\d,.]+[KkMmBb]?)\s*likes?/i);
              if (likeMatch) {
                likes = parseNum(likeMatch[1]) || likes;
                console.log(`YouTube likes from buttons: ${likes}`);
              }
            }
          }

          if (views > 0 || likes > 0) break;
        } catch (e: any) {
          console.log(`YouTube ytInitialData parse failed: ${e.message}`);
        }
      }

      // Method 2: ytInitialPlayerResponse
      const ytPlayerMatch = html.match(/var ytInitialPlayerResponse\s*=\s*(\{.+?\});\s*(?:<\/script>|var )/s);
      if (ytPlayerMatch) {
        try {
          const ytp = JSON.parse(ytPlayerMatch[1]);
          const vc = ytp?.videoDetails?.viewCount;
          if (vc) {
            views = parseInt(vc) || views;
            console.log(`YouTube ytInitialPlayerResponse viewCount: ${views}`);
          }
        } catch { /* ignore */ }
      }

      // Method 3: og:description meta tag
      const ogDescMatch = html.match(/<meta\s+(?:property|name)="og:description"\s+content="([^"]*?)"/i)
        || html.match(/<meta\s+content="([^"]*?)"\s+(?:property|name)="og:description"/i);
      if (ogDescMatch) {
        const desc = ogDescMatch[1].replace(/,/g, "");
        const viewMatch = desc.match(/([\d.]+[KkMmBb]?)\s*(?:views?|plays?)/i);
        const likeMatch = desc.match(/([\d.]+[KkMmBb]?)\s*(?:likes?)/i);
        if (viewMatch) views = parseNum(viewMatch[1]) || views;
        if (likeMatch) likes = parseNum(likeMatch[1]) || likes;
        console.log(`YouTube og:description: views=${views}, likes=${likes}`);
      }

      // Method 4: JSON-LD interactionStatistic
      const jsonLdMatches = [...html.matchAll(/<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
      for (const m of jsonLdMatches) {
        try {
          const ld = JSON.parse(m[1]);
          const stats = ld.interactionStatistic ?? ld?.mainEntity?.interactionStatistic;
          if (Array.isArray(stats)) {
            for (const stat of stats) {
              const type = (stat.interactionType?.["@type"] ?? stat.interactionType ?? "").toLowerCase();
              const count = parseInt(stat.userInteractionCount ?? "0", 10);
              if (type.includes("watch") || type.includes("view")) views = count || views;
              if (type.includes("like")) likes = count || likes;
              if (type.includes("comment")) comments = count || comments;
            }
            console.log(`YouTube JSON-LD: views=${views}, likes=${likes}, comments=${comments}`);
          }
        } catch { /* ignore */ }
      }

      // Method 5: Raw text patterns for view count (last resort)
      if (views === 0) {
        const rawViewMatch = html.match(/"viewCount"\s*:\s*"(\d+)"/);
        if (rawViewMatch) {
          views = parseInt(rawViewMatch[1], 10);
          console.log(`YouTube raw viewCount: ${views}`);
        }
      }
      if (likes === 0) {
        const rawLikeMatch = html.match(/"likeCount"\s*:\s*"(\d+)"/);
        if (rawLikeMatch) {
          likes = parseInt(rawLikeMatch[1], 10);
          console.log(`YouTube raw likeCount: ${likes}`);
        }
      }

      console.log(`YouTube final: views=${views}, likes=${likes}, comments=${comments}`);
      return { views, likes, comments };
    } catch (e: any) {
      console.log(`YouTube scrape error for ${attemptUrl}: ${e.message}`);
      continue;
    }
  }

  return { views: 0, likes: 0, comments: 0, error: "YouTube scraping failed - may need YouTube API key" };
}

// Scrape Instagram using the official Graph API
async function scrapeInstagram(url: string): Promise<{ views: number; likes: number; comments: number; error?: string }> {
  let accessToken = Deno.env.get("INSTAGRAM_ACCESS_TOKEN");
  const igAppId = Deno.env.get("INSTAGRAM_APP_ID");
  const igAppSecret = Deno.env.get("INSTAGRAM_APP_SECRET");
  console.log(`Instagram scrape: ${url}, token present: ${!!accessToken}`);

  // Try Graph API URL lookup first (with auto-exchange on expired token)
  if (accessToken) {
    try {
      let lookupRes = await fetch(`https://graph.facebook.com/v21.0/?id=${encodeURIComponent(url)}&fields=engagement&access_token=${accessToken}`);
      
      // If token expired (error 190), try auto-exchange
      if (!lookupRes.ok && igAppId && igAppSecret) {
        const errData = await lookupRes.json().catch(() => ({}));
        if (errData?.error?.code === 190) {
          console.log("Instagram token expired, attempting auto-exchange...");
          const exchRes = await fetch(`https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${igAppId}&client_secret=${igAppSecret}&fb_exchange_token=${accessToken}`);
          const exchData = await exchRes.json();
          if (exchData.access_token) {
            accessToken = exchData.access_token;
            console.log(`Instagram token exchanged successfully, expires in ${exchData.expires_in}s`);
            // Retry lookup with new token
            lookupRes = await fetch(`https://graph.facebook.com/v21.0/?id=${encodeURIComponent(url)}&fields=engagement&access_token=${accessToken}`);
          } else {
            console.log(`Instagram token exchange failed: ${JSON.stringify(exchData.error ?? exchData)}`);
          }
        } else {
          console.log(`Instagram lookup HTTP ${lookupRes.status}: ${JSON.stringify(errData)}`);
        }
      }

      if (lookupRes.ok) {
        const data = await lookupRes.json();
        console.log(`Instagram lookup response:`, JSON.stringify(data));
        const engagement = data?.engagement ?? {};
        if (engagement.reaction_count || engagement.comment_count) {
          return { views: 0, likes: engagement.reaction_count ?? 0, comments: engagement.comment_count ?? 0 };
        }
      }
    } catch (e: any) {
      console.log(`Instagram lookup error: ${e.message}`);
    }
  }

  // Fallback: scrape Instagram page HTML
  try {
    console.log(`Instagram HTML scrape fallback: ${url}`);
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });
    if (!res.ok) {
      return { views: 0, likes: 0, comments: 0, error: `Instagram HTTP ${res.status}` };
    }
    const html = await res.text();
    let views = 0, likes = 0, comments = 0;

    // Parse shorthand numbers
    const parseN = (str: string): number => {
      const m = str.trim().toLowerCase().replace(/,/g, "").match(/^([\d.]+)\s*([kmb])?$/);
      if (!m) return 0;
      let n = parseFloat(m[1]);
      if (m[2] === "k") n *= 1_000;
      if (m[2] === "m") n *= 1_000_000;
      if (m[2] === "b") n *= 1_000_000_000;
      return Math.round(n);
    };

    // og:description
    const ogMatch = html.match(/<meta\s+(?:property|name)="og:description"\s+content="([^"]*?)"/i)
      || html.match(/<meta\s+content="([^"]*?)"\s+(?:property|name)="og:description"/i);
    if (ogMatch) {
      const desc = ogMatch[1].replace(/,/g, "");
      const lM = desc.match(/([\d.]+[KkMmBb]?)\s*(?:likes?|hearts?)/i);
      const cM = desc.match(/([\d.]+[KkMmBb]?)\s*(?:comments?)/i);
      const vM = desc.match(/([\d.]+[KkMmBb]?)\s*(?:views?|plays?)/i);
      if (lM) likes = parseN(lM[1]);
      if (cM) comments = parseN(cM[1]);
      if (vM) views = parseN(vM[1]);
    }

    // JSON-LD
    for (const m of html.matchAll(/<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
      try {
        const ld = JSON.parse(m[1]);
        const stats = ld.interactionStatistic ?? ld?.mainEntity?.interactionStatistic;
        if (Array.isArray(stats)) {
          for (const stat of stats) {
            const type = (stat.interactionType?.["@type"] ?? stat.interactionType ?? "").toLowerCase();
            const count = parseInt(stat.userInteractionCount ?? "0", 10);
            if (type.includes("watch") || type.includes("view")) views = count || views;
            if (type.includes("like")) likes = count || likes;
            if (type.includes("comment")) comments = count || comments;
          }
        }
      } catch { /* ignore */ }
    }

    // Raw text fallback
    if (views === 0 && likes === 0) {
      const text = html.replace(/<[^>]+>/g, " ");
      const vM = text.match(/([\d,.]+[KkMmBb]?)\s*(?:views?|plays?)/i);
      const lM = text.match(/([\d,.]+[KkMmBb]?)\s*(?:likes?)/i);
      const cM = text.match(/([\d,.]+[KkMmBb]?)\s*comments?/i);
      if (vM) views = parseN(vM[1]);
      if (lM) likes = parseN(lM[1]);
      if (cM) comments = parseN(cM[1]);
    }

    console.log(`Instagram HTML scrape final: views=${views}, likes=${likes}, comments=${comments}`);
    return { views, likes, comments };
  } catch (e: any) {
    console.log(`Instagram scrape error: ${e.message}`);
    return { views: 0, likes: 0, comments: 0, error: e.message };
  }
}

// Fetch page HTML directly and extract metrics from meta tags and embedded JSON
async function scrapeUrl(url: string): Promise<{ views: number; likes: number; comments: number; error?: string }> {
  // Route to dedicated handlers
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    return scrapeYouTube(url);
  }
  if (url.includes("instagram.com")) {
    return scrapeInstagram(url);
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });

    if (!res.ok) {
      return { views: 0, likes: 0, comments: 0, error: `HTTP ${res.status}` };
    }

    const html = await res.text();
    let views = 0, likes = 0, comments = 0;

    // --- Method 1: Parse og:description meta tag ---
    const ogDescMatch = html.match(/<meta\s+(?:property|name)="og:description"\s+content="([^"]*?)"/i)
      || html.match(/<meta\s+content="([^"]*?)"\s+(?:property|name)="og:description"/i);

    if (ogDescMatch) {
      const desc = ogDescMatch[1].replace(/,/g, "");
      const likeMatch = desc.match(/([\d.]+[KkMmBb]?)\s*(?:likes?|hearts?)/i);
      const commentMatch = desc.match(/([\d.]+[KkMmBb]?)\s*(?:comments?)/i);
      const viewMatch = desc.match(/([\d.]+[KkMmBb]?)\s*(?:views?|plays?|video views?)/i);

      if (likeMatch) likes = parseNum(likeMatch[1]);
      if (commentMatch) comments = parseNum(commentMatch[1]);
      if (viewMatch) views = parseNum(viewMatch[1]);
    }

    // --- Method 2: Parse embedded JSON (window._sharedData or similar) ---
    const sharedDataMatch = html.match(/window\._sharedData\s*=\s*({.+?});<\/script>/s);
    if (sharedDataMatch) {
      try {
        const data = JSON.parse(sharedDataMatch[1]);
        const media = data?.entry_data?.PostPage?.[0]?.graphql?.shortcode_media
          ?? data?.entry_data?.PostPage?.[0]?.media;
        if (media) {
          views = media.video_view_count ?? media.video_views ?? views;
          likes = media.edge_media_preview_like?.count ?? media.likes?.count ?? likes;
          comments = media.edge_media_preview_comment?.count ?? media.comments?.count ?? comments;
        }
      } catch { /* ignore parse errors */ }
    }

    // --- Method 3: Look for JSON-LD interactionStatistic ---
    const jsonLdMatches = html.matchAll(/<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
    for (const m of jsonLdMatches) {
      try {
        const ld = JSON.parse(m[1]);
        const stats = ld.interactionStatistic ?? ld?.mainEntity?.interactionStatistic;
        if (Array.isArray(stats)) {
          for (const stat of stats) {
            const type = (stat.interactionType?.["@type"] ?? stat.interactionType ?? "").toLowerCase();
            const count = parseInt(stat.userInteractionCount ?? "0", 10);
            if (type.includes("watch") || type.includes("view")) views = count || views;
            if (type.includes("like")) likes = count || likes;
            if (type.includes("comment")) comments = count || comments;
          }
        }
      } catch { /* ignore */ }
    }

    // --- Method 4: Generic number patterns in the full HTML text ---
    if (views === 0 && likes === 0 && comments === 0) {
      const textContent = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
      const vM = textContent.match(/([\d,.]+[KkMmBb]?)\s*(?:views?|plays?)/i);
      const lM = textContent.match(/([\d,.]+[KkMmBb]?)\s*(?:likes?)/i);
      const cM = textContent.match(/([\d,.]+[KkMmBb]?)\s*comments?/i);
      if (vM) views = parseNum(vM[1]);
      if (lM) likes = parseNum(lM[1]);
      if (cM) comments = parseNum(cM[1]);
    }

    return { views, likes, comments };
  } catch (err: any) {
    return { views: 0, likes: 0, comments: 0, error: err.message };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await anonClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claims.claims.sub as string;

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const submissionIds: string[] | undefined = body.submission_ids;

    let query = adminClient
      .from("submissions")
      .select("id, video_url, platform")
      .in("platform", ["tiktok", "instagram", "youtube"]);

    if (submissionIds && submissionIds.length > 0) {
      query = query.in("id", submissionIds);
    }

    const { data: subs, error: subErr } = await query;
    if (subErr) throw subErr;

    console.log(`Processing ${subs?.length ?? 0} submissions`);

    const results: { id: string; views: number; likes: number; comments: number; error?: string }[] = [];

    // Process in batches of 3 to be gentle on rate limits
    const batchSize = 3;
    for (let i = 0; i < (subs ?? []).length; i += batchSize) {
      const batch = (subs ?? []).slice(i, i + batchSize);

      const batchResults = await Promise.allSettled(
        batch.map(async (sub) => {
          console.log(`Scraping: ${sub.platform} - ${sub.video_url}`);
          const metrics = await scrapeUrl(sub.video_url);
          console.log(`Result for ${sub.id}: views=${metrics.views}, likes=${metrics.likes}, comments=${metrics.comments}, error=${metrics.error}`);

          // Always update the DB (even with zeros) so we track that we tried
          await adminClient
            .from("submissions")
            .update({
              view_count: metrics.views,
              like_count: metrics.likes,
              comment_count: metrics.comments,
            })
            .eq("id", sub.id);

          return { id: sub.id, ...metrics };
        })
      );

      for (const r of batchResults) {
        if (r.status === "fulfilled") results.push(r.value);
        else results.push({ id: "unknown", views: 0, likes: 0, comments: 0, error: r.reason?.message });
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("scrape-stats error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
