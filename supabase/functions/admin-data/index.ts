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

    // Verify admin role
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
          .select("*, tracks(title, artist_name)")
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

      case "save-report-links": {
        const body = await req.json();
        if (!body.campaign_id || !Array.isArray(body.links)) throw new Error("Missing campaign_id or links");

        const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");

        const enrichedLinks = await Promise.all(
          body.links
            .filter((l: any) => l.url?.trim())
            .map(async (link: any) => {
              const entry: any = { label: link.label || "", url: link.url, scraped_content: null, scraped_at: null, scrape_error: null };

              if (firecrawlKey) {
                try {
                  let formattedUrl = link.url.trim();
                  if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
                    formattedUrl = `https://${formattedUrl}`;
                  }
                  const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
                    method: "POST",
                    headers: {
                      Authorization: `Bearer ${firecrawlKey}`,
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      url: formattedUrl,
                      formats: ["markdown"],
                      onlyMainContent: true,
                      waitFor: 3000,
                    }),
                  });
                  const data = await res.json();
                  if (res.ok && data.success) {
                    const md = data.data?.markdown || data.markdown || "";
                    entry.scraped_content = md.slice(0, 5000);
                    entry.scraped_at = new Date().toISOString();
                  } else {
                    const errMsg = data.error || "Scrape failed";
                    console.error(`Scrape failed for ${link.url}:`, errMsg);
                    entry.scrape_error = typeof errMsg === "string" ? errMsg.slice(0, 200) : "Scrape failed";
                    entry.scraped_at = new Date().toISOString();
                  }
                } catch (err: any) {
                  console.error(`Error scraping report link ${link.url}:`, err.message);
                  entry.scrape_error = err.message.slice(0, 200);
                  entry.scraped_at = new Date().toISOString();
                }
              }

              return entry;
            })
        );

        const { error } = await adminClient
          .from("campaigns")
          .update({ report_links: enrichedLinks })
          .eq("id", body.campaign_id);
        if (error) throw error;

        result = { success: true, links: enrichedLinks };
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
