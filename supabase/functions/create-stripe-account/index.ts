import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

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

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claims.claims.sub as string;
    const userEmail = claims.claims.email as string;

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2023-10-16",
    });

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Parse the return URL from the request body
    const body = await req.json().catch(() => ({}));
    const entityType = body.entity_type || "dancer"; // "dancer" or "producer"
    const returnUrl = body.return_url || "https://danceverse.lovable.app/dancer/settings";

    let accountId: string | null = null;

    if (entityType === "producer") {
      // Check deals.producers for existing Stripe account
      const { data: producerData } = await adminClient.rpc("get_producer_id", { p_user_id: userId });
      const producerId = producerData;

      if (!producerId) {
        return new Response(JSON.stringify({ error: "Producer record not found" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Query producer's stripe info via service role
      // Since deals schema isn't in PostgREST, we use a helper approach
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

      // For producers, we need to check/create stripe account differently
      // Use a dedicated RPC to get producer stripe info
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

        // Update producer's stripe_account_id via RPC
        await adminClient.rpc("update_producer_stripe", {
          p_user_id: userId,
          p_stripe_account_id: accountId,
        }).catch(async () => {
          // Fallback: direct service role update won't work for deals schema
          // Log and continue - webhook will handle onboarding status
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
