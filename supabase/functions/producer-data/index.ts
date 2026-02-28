import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function getAuthenticatedProducer(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized");

  const anonClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: claims, error } = await anonClient.auth.getClaims(token);
  if (error || !claims?.claims) throw new Error("Unauthorized");
  const userId = claims.claims.sub as string;

  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Verify producer role
  const { data: roleData } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "producer")
    .maybeSingle();

  if (!roleData) throw new Error("Forbidden");

  // Get producer record
  const { data: producer } = await adminClient
    .from("producers")
    .select("*")
    .eq("user_id", userId)
    .schema("deals" as any)
    .maybeSingle();

  return { userId, adminClient, producer };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claims, error: claimsErr } = await anonClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub as string;

    const svc = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Handle register-producer BEFORE the role check (new users won't have the role yet)
    if (action === "register-producer") {
      const body = await req.json();

      // Check if already a producer
      const { data: existingRole } = await svc
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "producer")
        .maybeSingle();

      if (existingRole) {
        return new Response(JSON.stringify({ error: "Already registered as a producer" }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Insert producer role
      const { error: roleErr } = await svc
        .from("user_roles")
        .insert({ user_id: userId, role: "producer" });
      if (roleErr) throw roleErr;

      // Create deals.producers record via RPC — legal_name defaults to email if not provided
      const legalName = body.legal_name?.trim() || body.email?.trim() || "Producer";
      const { error: prodErr } = await svc.rpc("create_producer_record_on_approve", {
        p_user_id: userId,
        p_legal_name: legalName,
        p_stage_name: body.stage_name?.trim() || null,
        p_email: body.email?.trim() || null,
      });
      if (prodErr) throw prodErr;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify producer role for all other actions
    const { data: roleData } = await svc
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "producer")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden: producer role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get producer record from deals schema using raw SQL
    const { data: producerRows, error: prodErr } = await svc.rpc("get_producer_by_user", { p_user_id: userId });
    
    // If the function doesn't exist yet, fall back to raw query
    let producer: any = null;
    if (prodErr) {
      const { data: rawProd } = await svc
        .from("producers")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      // This won't work for deals schema via PostgREST, so use SQL
      const { data: sqlResult } = await svc.rpc("exec_sql_readonly", { 
        query: `SELECT * FROM deals.producers WHERE user_id = '${userId}' LIMIT 1` 
      });
      // Fallback: direct schema query
    }

    // Since PostgREST doesn't expose deals schema by default, 
    // we'll use SQL functions for all deals schema access
    let result: any = null;

    switch (action) {
      case "overview": {
        const { data } = await svc.rpc("producer_overview", { p_user_id: userId });
        result = data?.[0] ?? {
          total_tracks: 0,
          tracks_under_review: 0,
          active_deals: 0,
          total_earned: 0,
          pending_earnings: 0,
        };
        break;
      }

      case "tracks": {
        const { data } = await svc.rpc("producer_tracks", { p_user_id: userId });
        result = data ?? [];
        break;
      }

      case "track-detail": {
        const trackId = url.searchParams.get("id");
        if (!trackId) throw new Error("Missing track id");
        const { data } = await svc.rpc("producer_track_detail", { p_user_id: userId, p_track_id: trackId });
        result = data?.[0] ?? null;
        if (!result) throw new Error("Track not found or access denied");
        break;
      }

      case "track-history": {
        const trackId = url.searchParams.get("id");
        if (!trackId) throw new Error("Missing track id");
        const { data } = await svc.rpc("producer_track_history", { p_user_id: userId, p_track_id: trackId });
        result = data ?? [];
        break;
      }

      case "submit-track": {
        const body = await req.json();
        if (!body.title || !body.file_url) throw new Error("Title and file_url are required");
        const { data } = await svc.rpc("producer_submit_track", {
          p_user_id: userId,
          p_title: body.title,
          p_bpm: body.bpm ?? null,
          p_genre: body.genre ?? null,
          p_mood_tags: body.mood_tags ? JSON.stringify(body.mood_tags) : null,
          p_isrc: body.isrc ?? null,
          p_master_pct: body.master_ownership_percent ?? null,
          p_publishing_pct: body.publishing_ownership_percent ?? null,
          p_explicit: body.explicit_flag ?? false,
          p_file_url: body.file_url,
          p_artwork_url: body.artwork_url ?? null,
          p_first_name: body.first_name ?? null,
          p_last_name: body.last_name ?? null,
        });
        result = data;
        break;
      }

      case "offers": {
        const { data } = await svc.rpc("producer_offers", { p_user_id: userId });
        result = data ?? [];
        break;
      }

      case "offer-detail": {
        const offerId = url.searchParams.get("id");
        if (!offerId) throw new Error("Missing offer id");
        const { data } = await svc.rpc("producer_offer_detail", { p_user_id: userId, p_offer_id: offerId });
        result = data?.[0] ?? null;
        if (!result) throw new Error("Offer not found or access denied");
        break;
      }

      case "accept-offer": {
        const body = await req.json();
        if (!body.offer_id) throw new Error("Missing offer_id");
        const { data, error } = await svc.rpc("producer_accept_offer", { p_user_id: userId, p_offer_id: body.offer_id });
        if (error) throw error;
        result = { success: true };
        break;
      }

      case "reject-offer": {
        const body = await req.json();
        if (!body.offer_id) throw new Error("Missing offer_id");
        const { data, error } = await svc.rpc("producer_reject_offer", { p_user_id: userId, p_offer_id: body.offer_id });
        if (error) throw error;
        result = { success: true };
        break;
      }

      case "counter-offer": {
        const body = await req.json();
        if (!body.offer_id) throw new Error("Missing offer_id");
        const { data, error } = await svc.rpc("producer_counter_offer", {
          p_user_id: userId,
          p_offer_id: body.offer_id,
          p_buyout_amount: body.buyout_amount ?? null,
          p_producer_split: body.producer_split_percent ?? null,
          p_platform_split: body.platform_split_percent ?? null,
          p_term_length: body.term_length ?? null,
          p_territory: body.territory ?? null,
        });
        if (error) throw error;
        result = data;
        break;
      }

      case "contracts": {
        const { data } = await svc.rpc("producer_contracts", { p_user_id: userId });
        result = data ?? [];
        break;
      }

      case "contract-detail": {
        const contractId = url.searchParams.get("id");
        if (!contractId) throw new Error("Missing contract id");
        const { data } = await svc.rpc("producer_contract_detail", {
          p_user_id: userId,
          p_contract_id: contractId,
        });
        result = data?.[0] ?? null;
        if (!result) throw new Error("Contract not found or access denied");
        break;
      }

      case "sign-contract": {
        const body = await req.json();
        if (!body.contract_id) throw new Error("Missing contract_id");
        const { error } = await svc.rpc("producer_sign_contract", {
          p_user_id: userId,
          p_contract_id: body.contract_id,
          p_ip_address: req.headers.get("x-forwarded-for") ?? req.headers.get("cf-connecting-ip") ?? null,
          p_user_agent: req.headers.get("user-agent") ?? null,
        });
        if (error) throw error;

        // Append signature page to PDF and recalculate hash
        try {
          const projectId = Deno.env.get("SUPABASE_URL")!;
          const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
          const appendRes = await fetch(`${projectId}/functions/v1/contract-engine?action=append-signature`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${(await svc.auth.getSession()).data.session?.access_token ?? serviceKey}`,
              "Content-Type": "application/json",
              apikey: Deno.env.get("SUPABASE_ANON_KEY")!,
            },
            body: JSON.stringify({
              contract_id: body.contract_id,
              signer_role: "producer",
              signer_name: "Producer",
              signed_at: new Date().toISOString(),
            }),
          });
          if (!appendRes.ok) {
            console.error("Signature append failed:", await appendRes.text());
          }
        } catch (e) {
          console.error("Signature append error:", e);
        }

        result = { success: true };
        break;
      }

      case "earnings": {
        const { data } = await svc.rpc("producer_earnings", { p_user_id: userId });
        result = data ?? [];
        break;
      }

      case "earnings-by-track": {
        const { data } = await svc.rpc("producer_earnings_by_track", { p_user_id: userId });
        result = data ?? [];
        break;
      }

      case "earnings-by-campaign": {
        const { data } = await svc.rpc("producer_earnings_by_campaign", { p_user_id: userId });
        result = data ?? [];
        break;
      }

      case "payouts": {
        const { data } = await svc.rpc("producer_payouts", { p_user_id: userId });
        result = data ?? [];
        break;
      }

      case "stripe-info": {
        const { data } = await svc.rpc("get_producer_stripe_info", { p_user_id: userId });
        result = data?.[0] ?? { stripe_account_id: null, stripe_onboarded: false };
        break;
      }

      case "get-profile": {
        const { data } = await svc.rpc("get_producer_id", { p_user_id: userId });
        if (!data) throw new Error("Producer not found");
        // Query the deals.producers table via a simple SQL function
        const { data: profile, error: profileErr } = await svc
          .schema("deals" as any)
          .from("producers")
          .select("legal_name, stage_name, bio, genre, location, tiktok_url, instagram_url, spotify_url, soundcloud_url, other_social_url")
          .eq("user_id", userId)
          .maybeSingle();
        if (profileErr) throw profileErr;
        result = profile ?? {};
        break;
      }

      case "update-profile": {
        const body = await req.json();
        if (!body.legal_name?.trim()) throw new Error("Legal name is required");
        const { data: prodId } = await svc.rpc("get_producer_id", { p_user_id: userId });
        if (!prodId) throw new Error("Producer not found");
        const { error: upErr } = await svc
          .schema("deals" as any)
          .from("producers")
          .update({
            legal_name: body.legal_name.trim(),
            stage_name: body.stage_name?.trim() || null,
            bio: body.bio?.trim() || null,
            genre: body.genre?.trim() || null,
            location: body.location?.trim() || null,
            tiktok_url: body.tiktok_url?.trim() || null,
            instagram_url: body.instagram_url?.trim() || null,
            spotify_url: body.spotify_url?.trim() || null,
            soundcloud_url: body.soundcloud_url?.trim() || null,
            other_social_url: body.other_social_url?.trim() || null,
          })
          .eq("id", prodId);
        if (upErr) throw upErr;
        result = { success: true };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const status = err.message === "Unauthorized" ? 401 : err.message?.startsWith("Forbidden") ? 403 : 400;
    return new Response(JSON.stringify({ error: err.message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
