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

    // Verify partner role
    const { data: roleRows } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "partner");

    if (!roleRows || roleRows.length === 0) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get partner record
    const { data: partnerRows } = await adminClient
      .from("partners")
      .select("*")
      .eq("user_id", userId);

    const partner = partnerRows?.[0];
    if (!partner) {
      return new Response(JSON.stringify({ error: "Partner record not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    let result: any = null;

    switch (action) {
      case "overview": {
        // Get referrals
        const { data: referrals } = await adminClient
          .from("partner_referrals")
          .select("dancer_id")
          .eq("partner_id", partner.id);

        const dancerIds = (referrals ?? []).map((r: any) => r.dancer_id);

        // Active dancers (approved submission in last 30 days)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        let activeDancerCount = 0;
        if (dancerIds.length > 0) {
          const { data: activeSubs } = await adminClient
            .from("submissions")
            .select("dancer_id")
            .in("dancer_id", dancerIds)
            .eq("review_status", "approved")
            .gte("submitted_at", thirtyDaysAgo);
          activeDancerCount = new Set((activeSubs ?? []).map((s: any) => s.dancer_id)).size;
        }

        // Commissions
        const { data: commissions } = await adminClient
          .from("partner_commissions")
          .select("commission_cents, status")
          .eq("partner_id", partner.id);

        let pendingCents = 0, paidCents = 0;
        for (const c of (commissions ?? [])) {
          if (c.status === "pending") pendingCents += c.commission_cents;
          else if (c.status === "paid") paidCents += c.commission_cents;
        }

        // Current tier rate
        const tiers: Array<{ min_dancers: number; max_dancers: number | null; rate: number }> = partner.commission_tiers ?? [];
        const sorted = [...tiers].sort((a, b) => a.min_dancers - b.min_dancers);
        let currentRate = 0;
        for (const tier of sorted) {
          if (activeDancerCount >= tier.min_dancers) currentRate = tier.rate;
        }

        result = {
          partner_name: partner.name,
          referral_code: partner.referral_code,
          status: partner.status,
          terms_accepted_at: partner.terms_accepted_at,
          total_dancers: dancerIds.length,
          active_dancers: activeDancerCount,
          current_rate: currentRate,
          pending_cents: pendingCents,
          paid_cents: paidCents,
          commission_tiers: partner.commission_tiers,
          stripe_onboarded: partner.stripe_onboarded,
          stripe_account_id: partner.stripe_account_id,
        };
        break;
      }

      case "referrals": {
        const { data: referrals } = await adminClient
          .from("partner_referrals")
          .select("dancer_id, linked_at")
          .eq("partner_id", partner.id)
          .order("linked_at", { ascending: false });

        const dancerIds = (referrals ?? []).map((r: any) => r.dancer_id);
        let dancerMap: Record<string, any> = {};
        if (dancerIds.length > 0) {
          const { data: profiles } = await adminClient
            .from("profiles")
            .select("id, full_name, avatar_url, instagram_handle, tiktok_handle")
            .in("id", dancerIds);
          for (const p of (profiles ?? [])) {
            dancerMap[p.id] = p;
          }
        }

        // Get submission counts per dancer
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        let submissionMap: Record<string, { total: number; recent: number }> = {};
        if (dancerIds.length > 0) {
          const { data: allSubs } = await adminClient
            .from("submissions")
            .select("dancer_id, submitted_at, review_status")
            .in("dancer_id", dancerIds)
            .eq("review_status", "approved");
          for (const s of (allSubs ?? [])) {
            if (!submissionMap[s.dancer_id]) submissionMap[s.dancer_id] = { total: 0, recent: 0 };
            submissionMap[s.dancer_id].total++;
            if (s.submitted_at >= thirtyDaysAgo) submissionMap[s.dancer_id].recent++;
          }
        }

        result = (referrals ?? []).map((r: any) => ({
          dancer_id: r.dancer_id,
          linked_at: r.linked_at,
          full_name: dancerMap[r.dancer_id]?.full_name ?? "Unknown",
          avatar_url: dancerMap[r.dancer_id]?.avatar_url,
          instagram_handle: dancerMap[r.dancer_id]?.instagram_handle,
          tiktok_handle: dancerMap[r.dancer_id]?.tiktok_handle,
          total_submissions: submissionMap[r.dancer_id]?.total ?? 0,
          recent_submissions: submissionMap[r.dancer_id]?.recent ?? 0,
          is_active: (submissionMap[r.dancer_id]?.recent ?? 0) > 0,
        }));
        break;
      }

      case "commissions": {
        const status = url.searchParams.get("status") ?? "all";
        let query = adminClient
          .from("partner_commissions")
          .select("*")
          .eq("partner_id", partner.id)
          .order("created_at", { ascending: false });

        if (status !== "all") {
          query = query.eq("status", status);
        }

        const { data } = await query;

        // Get dancer names
        const dancerIds = [...new Set((data ?? []).map((c: any) => c.dancer_id))];
        let dancerMap: Record<string, string> = {};
        if (dancerIds.length > 0) {
          const { data: profiles } = await adminClient
            .from("profiles")
            .select("id, full_name")
            .in("id", dancerIds);
          for (const p of (profiles ?? [])) {
            dancerMap[p.id] = p.full_name ?? "Unknown";
          }
        }

        result = (data ?? []).map((c: any) => ({
          ...c,
          dancer_name: dancerMap[c.dancer_id] ?? "Unknown",
        }));
        break;
      }

      case "accept-terms": {
        const { error } = await adminClient
          .from("partners")
          .update({ terms_accepted_at: new Date().toISOString() })
          .eq("id", partner.id);
        if (error) throw error;
        result = { success: true };
        break;
      }

      case "update-stripe": {
        if (req.method !== "POST") throw new Error("POST required");
        const body = await req.json();
        const { error } = await adminClient
          .from("partners")
          .update({
            stripe_account_id: body.stripe_account_id,
            stripe_onboarded: !!body.stripe_account_id,
          })
          .eq("id", partner.id);
        if (error) throw error;
        result = { success: true };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("partner-data error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
