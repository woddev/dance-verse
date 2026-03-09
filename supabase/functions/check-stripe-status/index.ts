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

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check partners table first
    const { data: partner } = await adminClient
      .from("partners")
      .select("stripe_account_id, stripe_onboarded")
      .eq("user_id", userId)
      .maybeSingle();

    // Check profiles table
    const { data: profile } = await adminClient
      .from("profiles")
      .select("stripe_account_id, stripe_onboarded")
      .eq("id", userId)
      .single();

    // Determine which record to use
    const record = partner?.stripe_account_id ? partner : profile;

    if (!record?.stripe_account_id) {
      return new Response(JSON.stringify({ onboarded: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (record.stripe_onboarded) {
      return new Response(JSON.stringify({ onboarded: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2023-10-16",
    });

    const account = await stripe.accounts.retrieve(record.stripe_account_id);

    const onboarded = account.charges_enabled && account.payouts_enabled;

    if (onboarded) {
      if (partner?.stripe_account_id) {
        await adminClient
          .from("partners")
          .update({ stripe_onboarded: true })
          .eq("user_id", userId);
      } else {
        await adminClient
          .from("profiles")
          .update({ stripe_onboarded: true })
          .eq("id", userId);
      }
    }

    return new Response(JSON.stringify({ onboarded }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("check-stripe-status error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
