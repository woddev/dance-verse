import { createClient } from "npm:@supabase/supabase-js@2.95.3";
import Stripe from "npm:stripe@14.21.0";

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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    const userEmail = user.email!;

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2023-10-16",
    });

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Parse the return URL from the request body
    const body = await req.json().catch(() => ({}));
    const entityType = body.entity_type || "dancer"; // "dancer", "producer", or "partner"
    const returnUrl = body.return_url || "https://danceverse.lovable.app/dancer/settings";

    let accountId: string | null = null;

    if (entityType === "partner") {
      // Partner flow - uses partners table
      const { data: partner } = await adminClient
        .from("partners")
        .select("stripe_account_id, stripe_onboarded")
        .eq("user_id", userId)
        .maybeSingle();

      if (!partner) {
        return new Response(JSON.stringify({ error: "Partner record not found" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      accountId = partner.stripe_account_id ?? null;

      if (!accountId) {
        const account = await stripe.accounts.create({
          type: "express",
          email: userEmail,
          capabilities: { transfers: { requested: true } },
          metadata: { entity_type: "partner", user_id: userId },
        });
        accountId = account.id;

        await adminClient
          .from("partners")
          .update({ stripe_account_id: accountId })
          .eq("user_id", userId);
      }
    } else if (entityType === "producer") {
      // Check deals.producers for existing Stripe account
      const { data: producerData } = await adminClient.rpc("get_producer_id", { p_user_id: userId });
      const producerId = producerData;

      if (!producerId) {
        return new Response(JSON.stringify({ error: "Producer record not found" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: prodInfo } = await adminClient
        .from("user_roles")
        .select("user_id")
        .eq("user_id", userId)
        .eq("role", "producer")
        .maybeSingle();

      if (!prodInfo) {
        return new Response(JSON.stringify({ error: "Producer role not found" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: stripeInfo } = await adminClient.rpc("get_producer_stripe_info", { p_user_id: userId }).catch(() => ({ data: null }));

      accountId = stripeInfo?.stripe_account_id ?? null;

      if (!accountId) {
        const account = await stripe.accounts.create({
          type: "express",
          email: userEmail,
          capabilities: { transfers: { requested: true } },
          metadata: { entity_type: "producer", user_id: userId },
        });
        accountId = account.id;

        await adminClient.rpc("update_producer_stripe", {
          p_user_id: userId,
          p_stripe_account_id: accountId,
        }).catch(async () => {
          console.log(`Created Stripe account ${accountId} for producer ${userId}`);
        });
      }
    } else {
      // Dancer flow (existing)
      const { data: profile } = await adminClient
        .from("profiles")
        .select("stripe_account_id, stripe_onboarded")
        .eq("id", userId)
        .single();

      accountId = profile?.stripe_account_id ?? null;

      if (!accountId) {
        const account = await stripe.accounts.create({
          type: "express",
          email: userEmail,
          capabilities: { transfers: { requested: true } },
          metadata: { entity_type: "dancer", user_id: userId },
        });
        accountId = account.id;

        await adminClient
          .from("profiles")
          .update({ stripe_account_id: accountId })
          .eq("id", userId);
      }
    }

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: returnUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    });

    return new Response(JSON.stringify({ url: accountLink.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
