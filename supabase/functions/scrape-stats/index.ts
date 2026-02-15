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

// Fetch page HTML directly and extract metrics from meta tags and embedded JSON
async function scrapeUrl(url: string): Promise<{ views: number; likes: number; comments: number; error?: string }> {
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
      const text = await res.text();
      return { views: 0, likes: 0, comments: 0, error: `HTTP ${res.status}` };
    }

    const html = await res.text();
    let views = 0, likes = 0, comments = 0;

    // --- Method 1: Parse og:description meta tag ---
    // Instagram: "123 Likes, 45 Comments - Username on Instagram: ..."
    // TikTok: similar patterns in description
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
    // Instagram legacy pattern
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

    // --- Method 3: Parse __additionalData or similar newer Instagram patterns ---
    const additionalMatch = html.match(/window\.__additionalDataLoaded\s*\([^,]+,\s*({.+?})\s*\)\s*;/s);
    if (additionalMatch) {
      try {
        const data = JSON.parse(additionalMatch[1]);
        const media = data?.graphql?.shortcode_media;
        if (media) {
          views = media.video_view_count ?? views;
          likes = media.edge_media_preview_like?.count ?? likes;
          comments = media.edge_media_to_parent_comment?.count ?? comments;
        }
      } catch { /* ignore */ }
    }

    // --- Method 4: Look for JSON-LD interactionStatistic ---
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

    // --- Method 5: Generic number patterns in the full HTML text ---
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
      .in("platform", ["tiktok", "instagram"]);

    if (submissionIds && submissionIds.length > 0) {
      query = query.in("id", submissionIds);
    }

    const { data: subs, error: subErr } = await query;
    if (subErr) throw subErr;

    const results: { id: string; views: number; likes: number; comments: number; error?: string }[] = [];

    // Process in batches of 3 to be gentle on rate limits
    const batchSize = 3;
    for (let i = 0; i < (subs ?? []).length; i += batchSize) {
      const batch = (subs ?? []).slice(i, i + batchSize);

      const batchResults = await Promise.allSettled(
        batch.map(async (sub) => {
          const metrics = await scrapeUrl(sub.video_url);

          if (metrics.views > 0 || metrics.likes > 0 || metrics.comments > 0) {
            await adminClient
              .from("submissions")
              .update({
                view_count: metrics.views,
                like_count: metrics.likes,
                comment_count: metrics.comments,
              })
              .eq("id", sub.id);
          }

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
