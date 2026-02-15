import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function extractMetrics(markdown: string, platform: string) {
  let views = 0;
  let likes = 0;
  let comments = 0;

  // Normalize text
  const text = markdown.replace(/,/g, "").replace(/\s+/g, " ");

  // Parse numbers like "1.2M", "500K", "1234"
  const parseNum = (str: string): number => {
    const cleaned = str.trim().toLowerCase();
    const match = cleaned.match(/^([\d.]+)\s*([kmb])?$/);
    if (!match) return 0;
    let num = parseFloat(match[1]);
    if (match[2] === "k") num *= 1_000;
    if (match[2] === "m") num *= 1_000_000;
    if (match[2] === "b") num *= 1_000_000_000;
    return Math.round(num);
  };

  if (platform === "tiktok") {
    // TikTok patterns
    const viewMatch = text.match(/(\d+[\d.]*[KkMmBb]?)\s*(?:views?|plays?)/i);
    const likeMatch = text.match(/(\d+[\d.]*[KkMmBb]?)\s*(?:likes?|hearts?)/i);
    const commentMatch = text.match(/(\d+[\d.]*[KkMmBb]?)\s*comments?/i);

    if (viewMatch) views = parseNum(viewMatch[1]);
    if (likeMatch) likes = parseNum(likeMatch[1]);
    if (commentMatch) comments = parseNum(commentMatch[1]);
  } else if (platform === "instagram") {
    // Instagram patterns
    const viewMatch = text.match(/(\d+[\d.]*[KkMmBb]?)\s*(?:views?|plays?)/i);
    const likeMatch = text.match(/(\d+[\d.]*[KkMmBb]?)\s*(?:likes?)/i);
    const commentMatch = text.match(/(\d+[\d.]*[KkMmBb]?)\s*comments?/i);

    if (viewMatch) views = parseNum(viewMatch[1]);
    if (likeMatch) likes = parseNum(likeMatch[1]);
    if (commentMatch) comments = parseNum(commentMatch[1]);
  }

  return { views, likes, comments };
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

    // Verify admin
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

    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!firecrawlKey) {
      return new Response(JSON.stringify({ error: "Firecrawl not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get submission IDs from body, or scrape all
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

    // Process in batches of 5 to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < (subs ?? []).length; i += batchSize) {
      const batch = (subs ?? []).slice(i, i + batchSize);

      const batchResults = await Promise.allSettled(
        batch.map(async (sub) => {
          try {
            const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${firecrawlKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                url: sub.video_url,
                formats: ["markdown"],
                onlyMainContent: true,
                waitFor: 3000,
              }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
              console.error(`Scrape failed for ${sub.video_url}:`, data.error);
              return { id: sub.id, views: 0, likes: 0, comments: 0, error: data.error || "Scrape failed" };
            }

            const markdown = data.data?.markdown || data.markdown || "";
            const metrics = extractMetrics(markdown, sub.platform);

            // Only update if we got at least one non-zero metric
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
          } catch (err: any) {
            console.error(`Error scraping ${sub.video_url}:`, err.message);
            return { id: sub.id, views: 0, likes: 0, comments: 0, error: err.message };
          }
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
