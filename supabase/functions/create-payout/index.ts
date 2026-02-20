import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getCommissionRate(activeDancerCount: number): number {
  if (activeDancerCount >= 150) return 0.10;
  if (activeDancerCount >= 75) return 0.07;
  if (activeDancerCount >= 25) return 0.05;
  if (activeDancerCount >= 1) return 0.03;
  return 0;
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

    // --- Auto-calculate partner commission ---
    try {
      const { data: referral } = await adminClient
        .from("partner_referrals")
        .select("partner_id")
        .eq("dancer_id", submission.dancer_id)
        .maybeSingle();

      if (referral?.partner_id) {
        // Count how many of this partner's dancers are active in last 30 days
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

        const { data: allReferrals } = await adminClient
          .from("partner_referrals")
          .select("dancer_id")
          .eq("partner_id", referral.partner_id);

        const partnerDancerIds = (allReferrals ?? []).map((r: any) => r.dancer_id);

        let activeDancerCount = 0;
        if (partnerDancerIds.length > 0) {
          const { data: activeSubs } = await adminClient
            .from("submissions")
            .select("dancer_id")
            .in("dancer_id", partnerDancerIds)
            .eq("review_status", "approved")
            .gte("submitted_at", thirtyDaysAgo);

          const activeDancerSet = new Set((activeSubs ?? []).map((s: any) => s.dancer_id));
          // Include the current dancer as active (they just got approved)
          activeDancerSet.add(submission.dancer_id);
          activeDancerCount = activeDancerSet.size;
        }

        const commissionRate = getCommissionRate(activeDancerCount);

        if (commissionRate > 0) {
          const commissionCents = Math.floor(amount_cents * commissionRate);
          await adminClient.from("partner_commissions").insert({
            partner_id: referral.partner_id,
            payout_id: payout.id,
            dancer_id: submission.dancer_id,
            dancer_payout_cents: amount_cents,
            commission_rate: commissionRate,
            commission_cents: commissionCents,
            status: "pending",
          });
        }
      }
    } catch (commissionErr: any) {
      // Log but don't fail the payout if commission calculation fails
      console.error("Commission calculation error:", commissionErr.message);
    }

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
