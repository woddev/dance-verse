import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user is admin using anon client
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

    // Use service role to bypass RLS
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify admin/super_admin/finance_admin role
    const { data: roleRows } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["admin", "super_admin", "finance_admin"]);

    const userRoles = (roleRows ?? []).map((r: any) => r.role as string);
    if (userRoles.length === 0) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isAdmin = userRoles.includes("admin") || userRoles.includes("super_admin");
    const isSuperAdmin = userRoles.includes("super_admin");
    const isFinanceOnly = !isAdmin && userRoles.includes("finance_admin");

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    let result: any = null;

    switch (action) {
      case "dashboard-stats": {
        const [tracks, campaigns, submissions, payouts, dancers] = await Promise.all([
          adminClient.from("tracks").select("id", { count: "exact", head: true }),
          adminClient.from("campaigns").select("id, status", { count: "exact" }),
          adminClient.from("submissions").select("id, review_status", { count: "exact" }),
          adminClient.from("payouts").select("id, amount_cents, status", { count: "exact" }),
          adminClient.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "dancer"),
        ]);

        const campaignData = campaigns.data ?? [];
        const submissionData = submissions.data ?? [];
        const payoutData = payouts.data ?? [];

        result = {
          totalTracks: tracks.count ?? 0,
          totalCampaigns: campaignData.length,
          activeCampaigns: campaignData.filter((c: any) => c.status === "active").length,
          totalSubmissions: submissionData.length,
          pendingSubmissions: submissionData.filter((s: any) => s.review_status === "pending").length,
          approvedSubmissions: submissionData.filter((s: any) => s.review_status === "approved").length,
          totalPayouts: payoutData.length,
          totalPayoutAmount: payoutData.reduce((sum: number, p: any) => sum + (p.amount_cents ?? 0), 0),
          pendingPayouts: payoutData.filter((p: any) => p.status === "pending").length,
          totalDancers: dancers.count ?? 0,
        };
        break;
      }

      case "tracks": {
        const { data } = await adminClient
          .from("tracks")
          .select("*")
          .order("created_at", { ascending: false });
        result = data ?? [];
        break;
      }

      case "create-track": {
        const body = await req.json();
        const { data, error } = await adminClient.from("tracks").insert({
          title: body.title,
          artist_name: body.artist_name,
          cover_image_url: body.cover_image_url ?? null,
          audio_url: body.audio_url ?? null,
          tiktok_sound_url: body.tiktok_sound_url ?? null,
          instagram_sound_url: body.instagram_sound_url ?? null,
          spotify_url: body.spotify_url ?? null,
          usage_rules: body.usage_rules ?? null,
          mood: body.mood ?? null,
          genre: body.genre ?? null,
          bpm: body.bpm ?? null,
          duration_seconds: body.duration_seconds ?? null,
        }).select().single();
        if (error) throw error;
        result = data;
        break;
      }

      case "update-track": {
        const body2 = await req.json();
        if (!body2.track_id) throw new Error("Missing track_id");
        const trackUpdates: Record<string, any> = {};
        const allowedTrackFields = [
          "title", "artist_name", "cover_image_url", "audio_url",
          "tiktok_sound_url", "instagram_sound_url", "spotify_url",
          "usage_rules", "mood", "genre", "bpm", "duration_seconds", "status",
        ];
        for (const f of allowedTrackFields) {
          if (f in body2) trackUpdates[f] = body2[f];
        }
        const { data: updatedTrack, error: utErr } = await adminClient
          .from("tracks")
          .update(trackUpdates)
          .eq("id", body2.track_id)
          .select()
          .single();
        if (utErr) throw utErr;
        result = updatedTrack;
        break;
      }

      case "delete-track": {
        const trackId = url.searchParams.get("id");
        if (!trackId) throw new Error("Missing track id");
        const { error } = await adminClient.from("tracks").delete().eq("id", trackId);
        if (error) throw error;
        result = { success: true };
        break;
      }

      case "create-campaign": {
        const body = await req.json();
        const slug = body.title
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "");
        const uniqueSlug = `${slug}-${crypto.randomUUID().slice(0, 8)}`;
        const { data, error } = await adminClient.from("campaigns").insert({
          title: body.title,
          slug: uniqueSlug,
          artist_name: body.artist_name,
          description: body.description ?? null,
          track_id: body.track_id ?? null,
          required_hashtags: body.required_hashtags ?? [],
          required_mentions: body.required_mentions ?? [],
          required_platforms: body.required_platforms ?? ["tiktok", "instagram"],
          pay_scale: body.pay_scale ?? [],
          max_creators: body.max_creators ?? 50,
          due_days_after_accept: body.due_days_after_accept ?? 7,
          start_date: body.start_date ?? null,
          end_date: body.end_date ?? null,
          cover_image_url: body.cover_image_url ?? null,
          tiktok_sound_url: body.tiktok_sound_url ?? null,
          instagram_sound_url: body.instagram_sound_url ?? null,
          song_url: body.song_url ?? null,
          status: "draft",
        }).select("*, tracks(title, artist_name)").single();
        if (error) throw error;
        result = data;
        break;
      }

      case "update-campaign": {
        const body = await req.json();
        if (!body.campaign_id) throw new Error("Missing campaign_id");
        const updates: Record<string, any> = {};
        const allowedFields = [
          "title", "artist_name", "description", "track_id",
          "required_hashtags", "required_mentions", "required_platforms",
          "pay_scale", "max_creators", "due_days_after_accept",
          "start_date", "end_date", "cover_image_url",
          "tiktok_sound_url", "instagram_sound_url", "song_url", "status",
          "report_links",
        ];
        for (const field of allowedFields) {
          if (field in body) updates[field] = body[field];
        }
        // Regenerate slug if title changed
        if (updates.title) {
          const slug = updates.title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "");
          updates.slug = `${slug}-${crypto.randomUUID().slice(0, 8)}`;
        }
        const { data, error } = await adminClient
          .from("campaigns")
          .update(updates)
          .eq("id", body.campaign_id)
          .select("*, tracks(title, artist_name)")
          .single();
        if (error) throw error;
        result = data;
        break;
      }

      case "update-campaign-status": {
        const body = await req.json();
        const { error } = await adminClient
          .from("campaigns")
          .update({ status: body.status })
          .eq("id", body.campaign_id);
        if (error) throw error;
        result = { success: true };
        break;
      }

      case "campaigns": {
        const { data } = await adminClient
          .from("campaigns")
          .select("*, tracks(title, artist_name), report_links")
          .order("created_at", { ascending: false });
        result = data ?? [];
        break;
      }

      case "submissions": {
        // Fetch submissions with campaign data
        const { data: subsData, error: subError } = await adminClient
          .from("submissions")
          .select("*, campaigns(title, artist_name, pay_scale, required_hashtags, required_mentions, required_platforms)")
          .order("submitted_at", { ascending: false });
        if (subError) { console.error("submissions error:", subError.message); }
        
        // Enrich with dancer profiles
        const subs = subsData ?? [];
        const dancerIds = [...new Set(subs.map((s: any) => s.dancer_id))];
        let profileMap: Record<string, any> = {};
        if (dancerIds.length > 0) {
          const { data: profiles } = await adminClient
            .from("profiles")
            .select("id, full_name, instagram_handle, tiktok_handle, stripe_onboarded")
            .in("id", dancerIds);
          for (const p of (profiles ?? [])) {
            profileMap[p.id] = p;
          }
        }
        result = subs.map((s: any) => ({ ...s, profiles: profileMap[s.dancer_id] ?? null }));
        break;
      }

      case "review-submission": {
        const body = await req.json();
        const { error } = await adminClient
          .from("submissions")
          .update({
            review_status: body.status,
            rejection_reason: body.rejection_reason ?? null,
            reviewed_at: new Date().toISOString(),
          })
          .eq("id", body.submission_id);
        if (error) throw error;

        // If approved, update acceptance status
        if (body.status === "approved") {
          const { data: sub } = await adminClient
            .from("submissions")
            .select("acceptance_id")
            .eq("id", body.submission_id)
            .single();
          if (sub) {
            await adminClient
              .from("campaign_acceptances")
              .update({ status: "approved" })
              .eq("id", sub.acceptance_id);
          }
        }
        result = { success: true };
        break;
      }

      case "payouts": {
        const { data: payoutsData } = await adminClient
          .from("payouts")
          .select("*, submissions(video_url, platform, campaigns(title))")
          .order("created_at", { ascending: false });
        const pays = payoutsData ?? [];
        const payDancerIds = [...new Set(pays.map((p: any) => p.dancer_id))];
        let payProfileMap: Record<string, any> = {};
        if (payDancerIds.length > 0) {
          const { data: payProfiles } = await adminClient
            .from("profiles")
            .select("id, full_name")
            .in("id", payDancerIds);
          for (const p of (payProfiles ?? [])) {
            payProfileMap[p.id] = p;
          }
        }
        result = pays.map((p: any) => ({ ...p, profiles: payProfileMap[p.dancer_id] ?? null }));
        break;
      }

      case "dancers": {
        // Return both existing dancer profiles and pending applications
        const { data: dancerRoles } = await adminClient
          .from("user_roles")
          .select("user_id")
          .eq("role", "dancer");
        const dancerIds = (dancerRoles ?? []).map((r: any) => r.user_id);
        
        let approvedDancers: any[] = [];
        if (dancerIds.length > 0) {
          const { data } = await adminClient
            .from("profiles")
            .select("*")
            .in("id", dancerIds)
            .order("created_at", { ascending: false });
          approvedDancers = (data ?? []).map((d: any) => ({ ...d, source: "profile" }));
        }
        
        // Get pending/rejected applications
        const { data: applications } = await adminClient
          .from("applications")
          .select("*")
          .order("created_at", { ascending: false });
        
        const appEntries = (applications ?? []).map((a: any) => ({
          id: a.id,
          full_name: a.full_name,
          email: a.email,
          bio: a.bio,
          instagram_handle: a.instagram_handle,
          tiktok_handle: a.tiktok_handle,
          youtube_handle: a.youtube_handle,
          dance_style: a.dance_style,
          years_experience: a.years_experience,
          location: a.location,
          application_status: a.status,
          application_submitted_at: a.created_at,
          rejection_reason: a.rejection_reason,
          created_at: a.created_at,
          source: "application",
        }));
        
        result = [...appEntries, ...approvedDancers];
        break;
      }

      case "approve-dancer": {
        const body = await req.json();
        if (!body.application_id) throw new Error("Missing application_id");
        
        // Get the application
        const { data: app, error: appErr } = await adminClient
          .from("applications")
          .select("*")
          .eq("id", body.application_id)
          .single();
        if (appErr || !app) throw new Error("Application not found");
        
        // Validate email format before proceeding
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(app.email)) {
          throw new Error(`Invalid email address: "${app.email}". Please ask the applicant to resubmit with a valid email.`);
        }
        
        // Auto-invite the dancer by email FIRST (before updating status)
        const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(app.email, {
          data: {
            full_name: app.full_name || "",
            dance_style: app.dance_style || "",
            bio: app.bio || "",
            instagram_handle: app.instagram_handle || "",
            tiktok_handle: app.tiktok_handle || "",
            youtube_handle: app.youtube_handle || "",
            years_experience: app.years_experience,
            location: app.location || "",
          },
          redirectTo: `${req.headers.get("origin") || Deno.env.get("SUPABASE_URL")}/auth`,
        });
        if (inviteError) throw inviteError;
        
        // Only update application status AFTER successful invite
        const { error: updateErr } = await adminClient
          .from("applications")
          .update({ status: "approved", reviewed_at: new Date().toISOString() })
          .eq("id", body.application_id);
        if (updateErr) throw updateErr;
        
        // Update the newly created profile with application data
        if (inviteData?.user?.id) {
          await adminClient.from("profiles").update({
            full_name: app.full_name,
            bio: app.bio,
            instagram_handle: app.instagram_handle,
            tiktok_handle: app.tiktok_handle,
            youtube_handle: app.youtube_handle,
            dance_style: app.dance_style,
            years_experience: app.years_experience,
            location: app.location,
            application_status: "approved",
            application_submitted_at: app.created_at,
            application_reviewed_at: new Date().toISOString(),
          }).eq("id", inviteData.user.id);

          // Link to partner if referral code was provided
          if (app.referral_code) {
            const { data: partner } = await adminClient
              .from("partners")
              .select("id")
              .eq("referral_code", app.referral_code.toUpperCase())
              .eq("status", "active")
              .maybeSingle();
            if (partner) {
              await adminClient.from("partner_referrals").insert({
                partner_id: partner.id,
                dancer_id: inviteData.user.id,
              }).onConflict("dancer_id").ignore();
            }
          }
        }
        
        result = { success: true };
        break;
      }

      case "reject-dancer": {
        const body = await req.json();
        if (!body.application_id || !body.rejection_reason) throw new Error("Missing application_id or rejection_reason");
        const { error } = await adminClient
          .from("applications")
          .update({
            status: "rejected",
            rejection_reason: body.rejection_reason,
            reviewed_at: new Date().toISOString(),
          })
          .eq("id", body.application_id);
        if (error) throw error;
        result = { success: true };
        break;
      }

      case "invite-dancer": {
        const body = await req.json();
        if (!body.email) throw new Error("Missing email");
        const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(body.email, {
          data: { full_name: body.full_name || "" },
          redirectTo: `${req.headers.get("origin") || Deno.env.get("SUPABASE_URL")}/auth`,
        });
        if (inviteError) throw inviteError;
        result = { success: true, user_id: inviteData?.user?.id };
        break;
      }

      case "report-data": {
        const campaignFilter = url.searchParams.get("campaign_id");
        const statusFilter = url.searchParams.get("status");

        let query = adminClient
          .from("submissions")
          .select("id, video_url, platform, view_count, comment_count, like_count, review_status, submitted_at, dancer_id, campaign_id, campaigns(title, artist_name, pay_scale, start_date, end_date, report_links)")
          .order("submitted_at", { ascending: false });

        if (campaignFilter) query = query.eq("campaign_id", campaignFilter);
        if (statusFilter && statusFilter !== "all") query = query.eq("review_status", statusFilter);

        const { data: reportSubs, error: reportErr } = await query;
        if (reportErr) throw reportErr;

        const subs = reportSubs ?? [];
        const rDancerIds = [...new Set(subs.map((s: any) => s.dancer_id))];
        let rProfileMap: Record<string, any> = {};
        if (rDancerIds.length > 0) {
          const { data: rProfiles } = await adminClient
            .from("profiles")
            .select("id, full_name, instagram_handle, tiktok_handle")
            .in("id", rDancerIds);
          for (const p of (rProfiles ?? [])) rProfileMap[p.id] = p;
        }

        const { data: allCampaigns } = await adminClient
          .from("campaigns")
          .select("id, title")
          .order("title");

        result = {
          submissions: subs.map((s: any) => ({ ...s, profiles: rProfileMap[s.dancer_id] ?? null })),
          campaigns: allCampaigns ?? [],
        };
        break;
      }

      case "scrape-report-links": {
        // Scrape metrics for all report_links on a campaign
        const body = await req.json();
        if (!body.campaign_id) throw new Error("Missing campaign_id");

        // Fetch current links
        const { data: camp, error: campErr } = await adminClient
          .from("campaigns")
          .select("report_links")
          .eq("id", body.campaign_id)
          .single();
        if (campErr) throw campErr;

        const existingLinks: any[] = Array.isArray(camp?.report_links) ? camp.report_links : [];
        if (existingLinks.length === 0) {
          result = { success: true, links: [] };
          break;
        }

        // Helper to parse shorthand numbers
        const parseNum = (str: string): number => {
          const m = str.trim().toLowerCase().replace(/,/g, "").match(/^([\d.]+)\s*([kmb])?$/);
          if (!m) return 0;
          let n = parseFloat(m[1]);
          if (m[2] === "k") n *= 1_000;
          if (m[2] === "m") n *= 1_000_000;
          if (m[2] === "b") n *= 1_000_000_000;
          return Math.round(n);
        };

        const scrapeOne = async (url: string): Promise<{ views: number; likes: number; comments: number; error?: string }> => {
          try {
            const isYouTube = /youtube\.com|youtu\.be/i.test(url);
            const fetchHeaders: Record<string, string> = {
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
              "Accept-Language": "en-US,en;q=0.9",
              "Cookie": "CONSENT=YES+cb; PREF=hl=en",
            };

            if (isYouTube) {
              // YouTube API first
              const ytApiKey = Deno.env.get("YOUTUBE_API_KEY");
              const videoIdMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
              const videoId = videoIdMatch?.[1];

              if (ytApiKey && videoId) {
                try {
                  const apiRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=statistics&key=${ytApiKey}`);
                  if (apiRes.ok) {
                    const apiData = await apiRes.json();
                    const stats = apiData?.items?.[0]?.statistics;
                    if (stats) {
                      return {
                        views: parseInt(stats.viewCount ?? "0", 10),
                        likes: parseInt(stats.likeCount ?? "0", 10),
                        comments: parseInt(stats.commentCount ?? "0", 10),
                      };
                    }
                  }
                } catch { /* fallthrough to scraping */ }
              }

              // Scrape mobile YouTube
              fetchHeaders["User-Agent"] = "Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
              const scrapeUrl = videoId ? `https://m.youtube.com/watch?v=${videoId}` : url;
              const res = await fetch(scrapeUrl, { headers: fetchHeaders, redirect: "follow" });
              if (!res.ok) return { views: 0, likes: 0, comments: 0, error: `HTTP ${res.status}` };
              const html = await res.text();

              let views = 0, likes = 0, comments = 0;

              // Raw JSON patterns most reliable for YouTube
              const rawViewMatch = html.match(/"viewCount"\s*:\s*"(\d+)"/);
              if (rawViewMatch) views = parseInt(rawViewMatch[1], 10);
              const rawLikeMatch = html.match(/"likeCount"\s*:\s*"(\d+)"/);
              if (rawLikeMatch) likes = parseInt(rawLikeMatch[1], 10);
              const rawCommentMatch = html.match(/"commentCount"\s*:\s*"(\d+)"/);
              if (rawCommentMatch) comments = parseInt(rawCommentMatch[1], 10);

              // ytInitialData fallback
              if (views === 0) {
                const ytMatch = html.match(/ytInitialData\s*=\s*(\{.+?\});\s*(?:var |<\/script>|window)/s);
                if (ytMatch) {
                  try {
                    const yt = JSON.parse(ytMatch[1]);
                    const vc = yt?.videoDetails?.viewCount ?? yt?.microformat?.playerMicroformatRenderer?.viewCount;
                    if (vc) views = parseInt(vc, 10);
                  } catch { /* ignore */ }
                }
              }
              // ytInitialPlayerResponse fallback
              if (views === 0) {
                const ytpMatch = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\});\s*(?:<\/script>|var )/s);
                if (ytpMatch) {
                  try {
                    const ytp = JSON.parse(ytpMatch[1]);
                    const vc = ytp?.videoDetails?.viewCount;
                    if (vc) views = parseInt(vc, 10);
                  } catch { /* ignore */ }
                }
              }

              console.log(`scrape-report-links YouTube ${url}: views=${views}, likes=${likes}, comments=${comments}`);
              return { views, likes, comments };
            }

            // Instagram: try Graph API URL lookup (with auto-exchange on expired token), then fallback to HTML scraping
            if (/instagram\.com/i.test(url)) {
              let igToken = Deno.env.get("INSTAGRAM_ACCESS_TOKEN");
              const igAppId = Deno.env.get("INSTAGRAM_APP_ID");
              const igAppSecret = Deno.env.get("INSTAGRAM_APP_SECRET");
              console.log(`Instagram scrape attempt, token present: ${!!igToken}`);

              // Try Graph API URL lookup first
              if (igToken) {
                try {
                  let lookupRes = await fetch(`https://graph.facebook.com/v21.0/?id=${encodeURIComponent(url)}&fields=engagement&access_token=${igToken}`);
                  
                  // If token expired (error 190), try auto-exchange
                  if (!lookupRes.ok && igAppId && igAppSecret) {
                    const errData = await lookupRes.json().catch(() => ({}));
                    if (errData?.error?.code === 190) {
                      console.log("Instagram token expired, attempting auto-exchange...");
                      const exchRes = await fetch(`https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${igAppId}&client_secret=${igAppSecret}&fb_exchange_token=${igToken}`);
                      const exchData = await exchRes.json();
                      if (exchData.access_token) {
                        igToken = exchData.access_token;
                        console.log(`Instagram token exchanged successfully, expires in ${exchData.expires_in}s`);
                        // Retry lookup with new token
                        lookupRes = await fetch(`https://graph.facebook.com/v21.0/?id=${encodeURIComponent(url)}&fields=engagement&access_token=${igToken}`);
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
                const igRes = await fetch(url, {
                  headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.9",
                  },
                  redirect: "follow",
                });
                if (!igRes.ok) {
                  return { views: 0, likes: 0, comments: 0, error: `Instagram HTTP ${igRes.status}` };
                }
                const html = await igRes.text();
                let views = 0, likes = 0, comments = 0;

                // og:description often has "X likes, Y comments - ..."
                const ogMatch = html.match(/<meta\s+(?:property|name)="og:description"\s+content="([^"]*?)"/i)
                  || html.match(/<meta\s+content="([^"]*?)"\s+(?:property|name)="og:description"/i);
                if (ogMatch) {
                  const desc = ogMatch[1].replace(/,/g, "");
                  const lM = desc.match(/([\d.]+[KkMmBb]?)\s*(?:likes?|hearts?)/i);
                  const cM = desc.match(/([\d.]+[KkMmBb]?)\s*(?:comments?)/i);
                  const vM = desc.match(/([\d.]+[KkMmBb]?)\s*(?:views?|plays?)/i);
                  if (lM) likes = parseNum(lM[1]);
                  if (cM) comments = parseNum(cM[1]);
                  if (vM) views = parseNum(vM[1]);
                }

                // JSON-LD interactionStatistic
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

                // Raw text patterns
                if (views === 0 && likes === 0) {
                  const text = html.replace(/<[^>]+>/g, " ");
                  const vM = text.match(/([\d,.]+[KkMmBb]?)\s*(?:views?|plays?)/i);
                  const lM = text.match(/([\d,.]+[KkMmBb]?)\s*(?:likes?)/i);
                  const cM = text.match(/([\d,.]+[KkMmBb]?)\s*comments?/i);
                  if (vM) views = parseNum(vM[1]);
                  if (lM) likes = parseNum(lM[1]);
                  if (cM) comments = parseNum(cM[1]);
                }

                console.log(`Instagram HTML scrape: views=${views}, likes=${likes}, comments=${comments}`);
                return { views, likes, comments };
              } catch (igErr: any) {
                console.log(`Instagram scrape error: ${igErr.message}`);
                return { views: 0, likes: 0, comments: 0, error: igErr.message };
              }
            }

            // TikTok / other platforms
            fetchHeaders["User-Agent"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
            const res = await fetch(url, { headers: fetchHeaders, redirect: "follow" });
            if (!res.ok) return { views: 0, likes: 0, comments: 0, error: `HTTP ${res.status}` };
            const html = await res.text();
            let views = 0, likes = 0, comments = 0;

            // og:description
            const ogDescMatch = html.match(/<meta\s+(?:property|name)="og:description"\s+content="([^"]*?)"/i)
              || html.match(/<meta\s+content="([^"]*?)"\s+(?:property|name)="og:description"/i);
            if (ogDescMatch) {
              const desc = ogDescMatch[1].replace(/,/g, "");
              const likeMatch = desc.match(/([\d.]+[KkMmBb]?)\s*(?:likes?|hearts?)/i);
              const commentMatch = desc.match(/([\d.]+[KkMmBb]?)\s*(?:comments?)/i);
              const viewMatch = desc.match(/([\d.]+[KkMmBb]?)\s*(?:views?|plays?)/i);
              if (likeMatch) likes = parseNum(likeMatch[1]);
              if (commentMatch) comments = parseNum(commentMatch[1]);
              if (viewMatch) views = parseNum(viewMatch[1]);
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

            console.log(`scrape-report-links ${url}: views=${views}, likes=${likes}, comments=${comments}`);
            return { views, likes, comments };
          } catch (err: any) {
            return { views: 0, likes: 0, comments: 0, error: err.message };
          }
        };

        // Scrape all links
        const scrapedLinks = await Promise.all(
          existingLinks.map(async (link) => {
            const metrics = await scrapeOne(link.url);
            return {
              ...link,
              view_count: metrics.views > 0 ? metrics.views : (link.view_count ?? 0),
              like_count: metrics.likes > 0 ? metrics.likes : (link.like_count ?? 0),
              comment_count: metrics.comments > 0 ? metrics.comments : (link.comment_count ?? 0),
              scraped_at: new Date().toISOString(),
              scrape_error: metrics.error ?? null,
            };
          })
        );

        const { error: updateErr } = await adminClient
          .from("campaigns")
          .update({ report_links: scrapedLinks })
          .eq("id", body.campaign_id);
        if (updateErr) throw updateErr;

        result = { success: true, links: scrapedLinks };
        break;
      }

      case "save-report-links": {
        const body = await req.json();
        if (!body.campaign_id || !Array.isArray(body.links)) throw new Error("Missing campaign_id or links");

        const enrichedLinks = body.links
          .filter((l: any) => l.url?.trim())
          .map((link: any) => {
            let platform = "unknown";
            if (/tiktok\.com/i.test(link.url)) platform = "tiktok";
            else if (/instagram\.com/i.test(link.url)) platform = "instagram";
            else if (/youtube\.com|youtu\.be/i.test(link.url)) platform = "youtube";

            return {
              label: link.label || "",
              url: link.url,
              view_count: typeof link.view_count === "number" ? link.view_count : 0,
              comment_count: typeof link.comment_count === "number" ? link.comment_count : 0,
              like_count: typeof link.like_count === "number" ? link.like_count : 0,
              scraped_at: link.scraped_at ?? new Date().toISOString(),
              scrape_error: null,
              platform,
            };
          });

        const { error } = await adminClient
          .from("campaigns")
          .update({ report_links: enrichedLinks })
          .eq("id", body.campaign_id);
        if (error) throw error;

        result = { success: true, links: enrichedLinks };
        break;
      }

      case "inquiries": {
        const { data } = await adminClient
          .from("inquiries")
          .select("*")
          .order("created_at", { ascending: false });
        result = data ?? [];
        break;
      }

      case "update-inquiry": {
        const body = await req.json();
        if (!body.inquiry_id || !body.status) throw new Error("Missing inquiry_id or status");
        const { error } = await adminClient
          .from("inquiries")
          .update({ status: body.status })
          .eq("id", body.inquiry_id);
        if (error) throw error;
        result = { success: true };
        break;
      }

      case "partners": {
        const { data: partnersData } = await adminClient
          .from("partners")
          .select("*")
          .order("created_at", { ascending: false });

        const partners = partnersData ?? [];
        const partnerIds = partners.map((p: any) => p.id);

        // Count total and active dancers per partner
        let referralMap: Record<string, any[]> = {};
        if (partnerIds.length > 0) {
          const { data: refs } = await adminClient
            .from("partner_referrals")
            .select("partner_id, dancer_id")
            .in("partner_id", partnerIds);
          for (const r of (refs ?? [])) {
            if (!referralMap[r.partner_id]) referralMap[r.partner_id] = [];
            referralMap[r.partner_id].push(r.dancer_id);
          }
        }

        // Count active dancers (approved submission in last 30 days) per partner
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        let activeDancersByPartner: Record<string, Set<string>> = {};
        if (partnerIds.length > 0) {
          const allDancerIds = Object.values(referralMap).flat();
          if (allDancerIds.length > 0) {
            const { data: activeSubs } = await adminClient
              .from("submissions")
              .select("dancer_id")
              .in("dancer_id", allDancerIds)
              .eq("review_status", "approved")
              .gte("submitted_at", thirtyDaysAgo);
            const activeDancerSet = new Set((activeSubs ?? []).map((s: any) => s.dancer_id));
            for (const [pid, dancerIds] of Object.entries(referralMap)) {
              activeDancersByPartner[pid] = new Set(dancerIds.filter((id: string) => activeDancerSet.has(id)));
            }
          }
        }

        // Get commission totals per partner
        let commissionMap: Record<string, { pending: number; paid: number }> = {};
        if (partnerIds.length > 0) {
          const { data: commissions } = await adminClient
            .from("partner_commissions")
            .select("partner_id, commission_cents, status")
            .in("partner_id", partnerIds);
          for (const c of (commissions ?? [])) {
            if (!commissionMap[c.partner_id]) commissionMap[c.partner_id] = { pending: 0, paid: 0 };
            if (c.status === "pending") commissionMap[c.partner_id].pending += c.commission_cents;
            else if (c.status === "paid") commissionMap[c.partner_id].paid += c.commission_cents;
          }
        }

        result = partners.map((p: any) => {
          const dancers = referralMap[p.id] ?? [];
          const activeCount = (activeDancersByPartner[p.id] ?? new Set()).size;
          // Use partner's custom tiers to determine current rate
          const tiers: Array<{ min_dancers: number; max_dancers: number | null; rate: number }> = p.commission_tiers ?? [];
          const sorted = [...tiers].sort((a, b) => a.min_dancers - b.min_dancers);
          let rate = 0;
          for (const tier of sorted) {
            if (activeCount >= tier.min_dancers) rate = tier.rate;
          }
          return {
            ...p,
            dancer_count: dancers.length,
            active_dancer_count: activeCount,
            current_rate: rate,
            pending_commission_cents: commissionMap[p.id]?.pending ?? 0,
            paid_commission_cents: commissionMap[p.id]?.paid ?? 0,
          };
        });
        break;
      }

      case "create-partner": {
        const body = await req.json();
        if (!body.name || !body.email) throw new Error("Missing name or email");
        const code = "DANCE-" + Math.random().toString(36).toUpperCase().slice(2, 8);
        const insertPayload: Record<string, any> = { name: body.name, email: body.email, referral_code: code };
        if (Array.isArray(body.commission_tiers) && body.commission_tiers.length > 0) {
          insertPayload.commission_tiers = body.commission_tiers;
        }
        const { data, error } = await adminClient
          .from("partners")
          .insert(insertPayload)
          .select()
          .single();
        if (error) throw error;
        result = data;
        break;
      }

      case "update-partner": {
        const body = await req.json();
        if (!body.partner_id) throw new Error("Missing partner_id");
        const updates: Record<string, any> = {};
        for (const f of ["status", "stripe_account_id", "stripe_onboarded", "earnings_window_months", "name", "email"]) {
          if (f in body) updates[f] = body[f];
        }
        const { data, error } = await adminClient
          .from("partners")
          .update(updates)
          .eq("id", body.partner_id)
          .select()
          .single();
        if (error) throw error;
        result = data;
        break;
      }

      case "commissions": {
        const statusFilter2 = url.searchParams.get("status") ?? "pending";
        const { data: comms } = await adminClient
          .from("partner_commissions")
          .select("*, partners(name, email, stripe_account_id, stripe_onboarded)")
          .eq("status", statusFilter2)
          .order("created_at", { ascending: false });

        const commList = comms ?? [];
        const dancerIds2 = [...new Set(commList.map((c: any) => c.dancer_id))];
        let dancerMap: Record<string, any> = {};
        if (dancerIds2.length > 0) {
          const { data: profiles } = await adminClient
            .from("profiles")
            .select("id, full_name")
            .in("id", dancerIds2);
          for (const p of (profiles ?? [])) dancerMap[p.id] = p;
        }

        result = commList.map((c: any) => ({
          ...c,
          dancer: dancerMap[c.dancer_id] ?? { full_name: "Unknown" },
        }));
        break;
      }

      case "exchange-instagram-token": {
        // Exchange current short-lived Instagram token for a long-lived one (60 days)
        const currentToken = Deno.env.get("INSTAGRAM_ACCESS_TOKEN");
        const appId = Deno.env.get("INSTAGRAM_APP_ID");
        const appSecret = Deno.env.get("INSTAGRAM_APP_SECRET");

        if (!currentToken) throw new Error("INSTAGRAM_ACCESS_TOKEN is not set");
        if (!appId || !appSecret) throw new Error("INSTAGRAM_APP_ID and INSTAGRAM_APP_SECRET are required for token exchange");

        const exchangeUrl = `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${currentToken}`;
        const exchangeRes = await fetch(exchangeUrl);
        const exchangeData = await exchangeRes.json();

        if (exchangeData.error) {
          throw new Error(`Token exchange failed: ${exchangeData.error.message}`);
        }

        const longLivedToken = exchangeData.access_token;
        const expiresIn = exchangeData.expires_in; // seconds (typically ~5184000 = 60 days)
        const expiresDate = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : "unknown";

        console.log(`Instagram token exchanged successfully. Expires: ${expiresDate}`);

        result = {
          success: true,
          long_lived_token: longLivedToken,
          expires_in_seconds: expiresIn,
          expires_at: expiresDate,
          message: "Copy this long-lived token and update your INSTAGRAM_ACCESS_TOKEN secret with it.",
        };
        break;
      }

      // ===== DEAL MANAGEMENT =====

      case "deal-overview": {
        const { data, error } = await adminClient.rpc("admin_deal_overview", { p_user_id: userId });
        if (error) throw error;
        result = data?.[0] ?? {};
        break;
      }

      case "deal-tracks": {
        const statusFilter = url.searchParams.get("status") || null;
        const { data, error } = await adminClient.rpc("admin_deal_tracks", { p_user_id: userId, p_status: statusFilter });
        if (error) throw error;
        result = data ?? [];
        break;
      }

      case "deal-track-detail": {
        const trackId = url.searchParams.get("track_id");
        if (!trackId) throw new Error("Missing track_id");
        const [detailRes, historyRes, offersRes, contractsRes] = await Promise.all([
          adminClient.rpc("admin_deal_track_detail", { p_user_id: userId, p_track_id: trackId }),
          adminClient.rpc("admin_deal_track_history", { p_user_id: userId, p_track_id: trackId }),
          adminClient.rpc("admin_track_offers", { p_user_id: userId, p_track_id: trackId }),
          adminClient.rpc("admin_track_contracts", { p_user_id: userId, p_track_id: trackId }),
        ]);
        if (detailRes.error) throw detailRes.error;
        result = {
          track: detailRes.data?.[0] ?? null,
          history: historyRes.data ?? [],
          offers: offersRes.data ?? [],
          contracts: contractsRes.data ?? [],
        };
        break;
      }

      case "deal-review-track": {
        if (isFinanceOnly) throw new Error("Finance admins cannot modify track states");
        const body = await req.json();
        const { error } = await adminClient.rpc("admin_review_track", { p_user_id: userId, p_track_id: body.track_id });
        if (error) throw error;
        result = { success: true };
        break;
      }

      case "deal-deny-track": {
        if (isFinanceOnly) throw new Error("Finance admins cannot modify track states");
        const body = await req.json();
        const { error } = await adminClient.rpc("admin_deny_track", { p_user_id: userId, p_track_id: body.track_id, p_reason: body.reason });
        if (error) throw error;
        result = { success: true };
        break;
      }

      case "deal-reopen-track": {
        if (!isSuperAdmin) throw new Error("Super admin access required");
        const body = await req.json();
        const { error } = await adminClient.rpc("admin_reopen_track", { p_user_id: userId, p_track_id: body.track_id });
        if (error) throw error;
        result = { success: true };
        break;
      }

      case "deal-create-offer": {
        if (isFinanceOnly) throw new Error("Finance admins cannot create offers");
        const body = await req.json();
        // Validate splits
        if (body.deal_type !== "buyout") {
          const ps = Number(body.producer_split ?? 0);
          const pl = Number(body.platform_split ?? 0);
          if (ps + pl !== 100) throw new Error("Producer split + Platform split must equal 100");
        }
        if (body.buyout_amount != null && Number(body.buyout_amount) < 0) throw new Error("Buyout amount must be positive");
        const { data, error } = await adminClient.rpc("admin_create_offer", {
          p_user_id: userId,
          p_track_id: body.track_id,
          p_deal_type: body.deal_type,
          p_buyout_amount: body.buyout_amount ?? null,
          p_producer_split: body.producer_split ?? null,
          p_platform_split: body.platform_split ?? null,
          p_term_length: body.term_length ?? null,
          p_territory: body.territory ?? null,
          p_exclusivity: body.exclusivity ?? false,
          p_expires_at: body.expires_at,
        });
        if (error) throw error;
        result = { success: true, offer_id: data };
        break;
      }

      case "deal-offers": {
        const { data, error } = await adminClient.rpc("admin_deal_offers", { p_user_id: userId });
        if (error) throw error;
        result = data ?? [];
        break;
      }

      case "deal-offer-history": {
        const offerId = url.searchParams.get("offer_id");
        if (!offerId) throw new Error("Missing offer_id");
        const { data, error } = await adminClient.rpc("admin_offer_history", { p_user_id: userId, p_offer_id: offerId });
        if (error) throw error;
        result = data ?? [];
        break;
      }

      case "deal-accept-counter": {
        if (isFinanceOnly) throw new Error("Finance admins cannot modify offers");
        const body = await req.json();
        const { error } = await adminClient.rpc("admin_accept_counter", { p_user_id: userId, p_offer_id: body.offer_id });
        if (error) throw error;
        result = { success: true };
        break;
      }

      case "deal-revise-offer": {
        if (isFinanceOnly) throw new Error("Finance admins cannot modify offers");
        const body = await req.json();
        if (body.deal_type !== "buyout") {
          const ps = Number(body.producer_split ?? 0);
          const pl = Number(body.platform_split ?? 0);
          if (ps + pl !== 100) throw new Error("Producer split + Platform split must equal 100");
        }
        const { data, error } = await adminClient.rpc("admin_revise_offer", {
          p_user_id: userId,
          p_offer_id: body.offer_id,
          p_buyout_amount: body.buyout_amount ?? null,
          p_producer_split: body.producer_split ?? null,
          p_platform_split: body.platform_split ?? null,
          p_term_length: body.term_length ?? null,
          p_territory: body.territory ?? null,
          p_exclusivity: body.exclusivity ?? false,
          p_expires_at: body.expires_at,
        });
        if (error) throw error;
        result = { success: true, offer_id: data };
        break;
      }

      case "deal-reject-counter": {
        if (isFinanceOnly) throw new Error("Finance admins cannot modify offers");
        const body = await req.json();
        const { error } = await adminClient.rpc("admin_reject_counter", { p_user_id: userId, p_offer_id: body.offer_id });
        if (error) throw error;
        result = { success: true };
        break;
      }

      case "deal-revenue": {
        const campaignId = url.searchParams.get("campaign_id") || null;
        const { data, error } = await adminClient.rpc("admin_revenue_events", { p_user_id: userId, p_campaign_id: campaignId });
        if (error) throw error;
        result = data ?? [];
        break;
      }

      // ===== CONTRACT MANAGEMENT =====

      case "deal-contracts": {
        const { data, error } = await adminClient.rpc("admin_all_contracts", { p_user_id: userId });
        if (error) throw error;
        result = data ?? [];
        break;
      }

      case "deal-contract-detail": {
        const contractId = url.searchParams.get("contract_id");
        if (!contractId) throw new Error("Missing contract_id");
        const [detailRes, historyRes, signaturesRes] = await Promise.all([
          adminClient.rpc("admin_contract_detail", { p_user_id: userId, p_contract_id: contractId }),
          adminClient.rpc("admin_contract_history", { p_user_id: userId, p_contract_id: contractId }),
          adminClient.rpc("admin_contract_signatures", { p_user_id: userId, p_contract_id: contractId }),
        ]);
        if (detailRes.error) throw detailRes.error;
        result = {
          contract: detailRes.data?.[0] ?? null,
          history: historyRes.data ?? [],
          signatures: signaturesRes.data ?? [],
        };
        break;
      }

      case "deal-generate-contract": {
        if (isFinanceOnly) throw new Error("Finance admins cannot generate contracts");
        const body = await req.json();
        if (!body.offer_id) throw new Error("Missing offer_id");
        const { data, error } = await adminClient.rpc("admin_generate_contract", {
          p_user_id: userId,
          p_offer_id: body.offer_id,
        });
        if (error) throw error;
        result = { success: true, contract_id: data };
        break;
      }

      case "deal-send-contract": {
        if (isFinanceOnly) throw new Error("Finance admins cannot send contracts");
        const body = await req.json();
        if (!body.contract_id) throw new Error("Missing contract_id");
        const { error } = await adminClient.rpc("admin_send_contract", {
          p_user_id: userId,
          p_contract_id: body.contract_id,
        });
        if (error) throw error;
        result = { success: true };
        break;
      }

      case "deal-admin-sign-contract": {
        if (isFinanceOnly) throw new Error("Finance admins cannot sign contracts");
        const body = await req.json();
        if (!body.contract_id) throw new Error("Missing contract_id");
        const { error } = await adminClient.rpc("admin_sign_contract", {
          p_user_id: userId,
          p_contract_id: body.contract_id,
          p_ip_address: req.headers.get("x-forwarded-for") ?? req.headers.get("cf-connecting-ip") ?? null,
          p_user_agent: req.headers.get("user-agent") ?? null,
        });
        if (error) throw error;

        // Append admin signature page to PDF and recalculate hash
        try {
          const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
          const appendRes = await fetch(`${supabaseUrl}/functions/v1/contract-engine?action=append-signature`, {
            method: "POST",
            headers: {
              Authorization: req.headers.get("Authorization")!,
              "Content-Type": "application/json",
              apikey: Deno.env.get("SUPABASE_ANON_KEY")!,
            },
            body: JSON.stringify({
              contract_id: body.contract_id,
              signer_role: "admin",
              signer_name: "Platform Administrator",
              signed_at: new Date().toISOString(),
            }),
          });
          if (!appendRes.ok) {
            console.error("Admin signature append failed:", await appendRes.text());
          }
        } catch (e) {
          console.error("Admin signature append error:", e);
        }

        result = { success: true };
        break;
      }

      case "deal-archive-contract": {
        if (isFinanceOnly) throw new Error("Finance admins cannot archive contracts");
        const body = await req.json();
        if (!body.contract_id) throw new Error("Missing contract_id");
        const { error } = await adminClient.rpc("admin_archive_contract", {
          p_user_id: userId,
          p_contract_id: body.contract_id,
        });
        if (error) throw error;
        result = { success: true };
        break;
      }

      case "deal-force-state": {
        if (!isSuperAdmin) throw new Error("Super admin access required");
        const body = await req.json();
        const { error } = await adminClient.rpc("admin_force_state", {
          p_user_id: userId,
          p_entity_type: body.entity_type,
          p_entity_id: body.entity_id,
          p_new_state: body.new_state,
          p_reason: body.reason,
        });
        if (error) throw error;
        result = { success: true };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
