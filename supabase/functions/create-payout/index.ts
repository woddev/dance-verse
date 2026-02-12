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

    // Verify admin
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

    const body = await req.json();
    const { submission_id, amount_cents } = body;

    if (!submission_id || !amount_cents) {
      return new Response(JSON.stringify({ error: "Missing submission_id or amount_cents" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get submission and dancer info
    const { data: submission, error: subErr } = await adminClient
      .from("submissions")
      .select("id, dancer_id, acceptance_id, campaign_id")
      .eq("id", submission_id)
      .single();

    if (subErr || !submission) {
      return new Response(JSON.stringify({ error: "Submission not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if payout already exists for this submission
    const { data: existingPayout } = await adminClient
      .from("payouts")
      .select("id")
      .eq("submission_id", submission_id)
      .maybeSingle();

    if (existingPayout) {
      return new Response(JSON.stringify({ error: "Payout already exists for this submission" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get dancer's Stripe account
    const { data: profile } = await adminClient
      .from("profiles")
      .select("stripe_account_id, stripe_onboarded")
      .eq("id", submission.dancer_id)
      .single();

    if (!profile?.stripe_account_id || !profile.stripe_onboarded) {
      return new Response(JSON.stringify({ error: "Dancer has not completed Stripe onboarding" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2023-10-16",
    });

    // Create the transfer
    const transfer = await stripe.transfers.create({
      amount: amount_cents,
      currency: "usd",
      destination: profile.stripe_account_id,
      metadata: {
        submission_id,
        dancer_id: submission.dancer_id,
        campaign_id: submission.campaign_id,
      },
    });

    // Insert payout record
    const { data: payout, error: payoutErr } = await adminClient
      .from("payouts")
      .insert({
        submission_id,
        dancer_id: submission.dancer_id,
        amount_cents,
        status: "completed",
        stripe_transfer_id: transfer.id,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (payoutErr) throw payoutErr;

    // Update acceptance status to paid
    await adminClient
      .from("campaign_acceptances")
      .update({ status: "paid" })
      .eq("id", submission.acceptance_id);

    return new Response(JSON.stringify({ success: true, payout }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
