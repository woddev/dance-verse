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

      case "delete-track": {
        const trackId = url.searchParams.get("id");
        if (!trackId) throw new Error("Missing track id");
        const { error } = await adminClient.from("tracks").delete().eq("id", trackId);
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
        const { data } = await adminClient
          .from("submissions")
          .select("*, campaigns(title, artist_name), profiles:dancer_id(full_name, instagram_handle, tiktok_handle)")
          .order("submitted_at", { ascending: false });
        result = data ?? [];
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
        const { data } = await adminClient
          .from("payouts")
          .select("*, submissions(video_url, platform, campaigns(title)), profiles:dancer_id(full_name)")
          .order("created_at", { ascending: false });
        result = data ?? [];
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
