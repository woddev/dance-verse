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

    const svc = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify admin/finance_admin role
    const { data: roleRows } = await svc
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["admin", "super_admin", "finance_admin"]);

    if (!roleRows?.length) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2023-10-16",
    });

    let result: any = null;

    switch (action) {
      case "get-queue": {
        // Get payout queue grouped by producer
        const { data, error } = await svc.rpc("process_payout_queue", {
          p_user_id: userId,
          p_producer_id: body.producer_id ?? null,
        });
        if (error) throw error;
        result = data ?? [];
        break;
      }

      case "process-payout": {
        // Process payout for a single producer
        const { producer_id, distribution_ids, total_amount, stripe_account_id } = body;
        if (!producer_id || !distribution_ids?.length || !total_amount || !stripe_account_id) {
          throw new Error("Missing required fields: producer_id, distribution_ids, total_amount, stripe_account_id");
        }

        // Verify producer has valid Stripe account
        const account = await stripe.accounts.retrieve(stripe_account_id);
        if (!account.charges_enabled || !account.payouts_enabled) {
          throw new Error("Producer Stripe account is not fully verified");
        }

        // Create payout record first
        const amountCents = Math.round(total_amount * 100);
        const { data: payoutRow, error: payoutInsertErr } = await svc
          .from("payouts")
          .insert({
            producer_id,
            amount: total_amount,
            payout_type: "revenue_distribution",
            status: "processing",
          })
          .select()
          .single();

        // Note: deals.payouts may not be accessible via PostgREST, use RPC fallback
        let payoutId: string;
        if (payoutInsertErr) {
          // Direct insert via SQL function
          const { data: sqlResult, error: sqlErr } = await svc.rpc("mark_distributions_processing", {
            p_user_id: userId,
            p_distribution_ids: distribution_ids,
            p_payout_id: null, // Will create inline
          });
          // Fallback: insert via raw approach
          throw new Error(`Failed to create payout record: ${payoutInsertErr.message}`);
        }
        payoutId = payoutRow.id;

        // Mark distributions as processing
        const { error: markErr } = await svc.rpc("mark_distributions_processing", {
          p_user_id: userId,
          p_distribution_ids: distribution_ids,
          p_payout_id: payoutId,
        });
        if (markErr) throw markErr;

        try {
          // Create Stripe transfer
          const transfer = await stripe.transfers.create({
            amount: amountCents,
            currency: "usd",
            destination: stripe_account_id,
            metadata: {
              producer_id,
              payout_id: payoutId,
              distribution_count: distribution_ids.length.toString(),
              entity_type: "producer",
            },
          });

          // Mark as completed
          const { error: completeErr } = await svc.rpc("complete_payout", {
            p_payout_id: payoutId,
            p_stripe_transfer_id: transfer.id,
          });
          if (completeErr) console.error("Complete payout error:", completeErr);

          result = { success: true, payout_id: payoutId, transfer_id: transfer.id };
        } catch (stripeErr: any) {
          // Mark as failed
          const { error: failErr } = await svc.rpc("fail_payout", {
            p_payout_id: payoutId,
            p_error: stripeErr.message,
          });
          if (failErr) console.error("Fail payout error:", failErr);

          result = { success: false, payout_id: payoutId, error: stripeErr.message };
        }
        break;
      }

      case "retry-payout": {
        // Retry a failed payout
        const { payout_id } = body;
        if (!payout_id) throw new Error("Missing payout_id");

        // Get payout details
        const { data: payoutData, error: payoutErr } = await svc.rpc("finance_producer_payouts", {
          p_user_id: userId,
          p_status: "failed",
        });
        if (payoutErr) throw payoutErr;

        const payout = (payoutData ?? []).find((p: any) => p.id === payout_id);
        if (!payout) throw new Error("Failed payout not found");

        // Get producer's Stripe account from deals schema
        const { data: queueData } = await svc.rpc("process_payout_queue", {
          p_user_id: userId,
          p_producer_id: payout.producer_id,
        });

        const producerInfo = (queueData ?? []).find((q: any) => q.producer_id === payout.producer_id);
        if (!producerInfo?.stripe_account_id) {
          throw new Error("Producer does not have a verified Stripe account");
        }

        const amountCents = Math.round(payout.amount * 100);

        try {
          const transfer = await stripe.transfers.create({
            amount: amountCents,
            currency: "usd",
            destination: producerInfo.stripe_account_id,
            metadata: {
              producer_id: payout.producer_id,
              payout_id,
              entity_type: "producer",
              retry: "true",
            },
          });

          const { error: completeErr } = await svc.rpc("complete_payout", {
            p_payout_id: payout_id,
            p_stripe_transfer_id: transfer.id,
          });
          if (completeErr) console.error("Complete retry error:", completeErr);

          result = { success: true, transfer_id: transfer.id };
        } catch (stripeErr: any) {
          const { error: failErr } = await svc.rpc("fail_payout", {
            p_payout_id: payout_id,
            p_error: stripeErr.message,
          });
          if (failErr) console.error("Fail retry error:", failErr);

          result = { success: false, error: stripeErr.message };
        }
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    const status = err.message === "Unauthorized" ? 401 : err.message === "Forbidden" ? 403 : 400;
    return new Response(JSON.stringify({ error: err.message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
