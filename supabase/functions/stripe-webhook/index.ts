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
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2023-10-16",
    });

    const body = await req.text();
    const sig = req.headers.get("stripe-signature");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    let event: Stripe.Event;

    if (webhookSecret && sig) {
      try {
        event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
      } catch (err: any) {
        console.error("Webhook signature verification failed:", err.message);
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      // For development without webhook secret
      event = JSON.parse(body) as Stripe.Event;
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    switch (event.type) {
      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        const chargesEnabled = account.charges_enabled;
        const payoutsEnabled = account.payouts_enabled;

        if (chargesEnabled && payoutsEnabled) {
          // Mark dancer as onboarded
          await adminClient
            .from("profiles")
            .update({ stripe_onboarded: true })
            .eq("stripe_account_id", account.id);

          // Also mark producer as onboarded via RPC
          try {
            await adminClient.rpc("set_producer_stripe_onboarded", {
              p_stripe_account_id: account.id,
            });
          } catch {
            // Producer may not exist for this account, which is fine
          }

          console.log(`Account ${account.id} fully onboarded`);
        }
        break;
      }

      case "transfer.paid": {
        const transfer = event.data.object as Stripe.Transfer;
        const payoutId = transfer.metadata?.payout_id;
        const entityType = transfer.metadata?.entity_type;

        if (payoutId && entityType === "producer") {
          // Update producer payout via RPC
          const { error } = await adminClient.rpc("complete_payout", {
            p_payout_id: payoutId,
            p_stripe_transfer_id: transfer.id,
            p_stripe_event_id: event.id,
          });
          if (error) console.error(`Failed to complete producer payout ${payoutId}:`, error);
          else console.log(`Producer payout ${payoutId} confirmed via webhook`);
        } else if (transfer.metadata?.submission_id) {
          // Dancer payout - existing flow
          const submissionId = transfer.metadata.submission_id;
          await adminClient
            .from("payouts")
            .update({ status: "completed" })
            .eq("submission_id", submissionId);
          console.log(`Dancer payout confirmed for submission ${submissionId}`);
        }
        break;
      }

      case "transfer.failed": {
        const transfer = event.data.object as Stripe.Transfer;
        const payoutId = transfer.metadata?.payout_id;
        const entityType = transfer.metadata?.entity_type;

        if (payoutId && entityType === "producer") {
          const { error } = await adminClient.rpc("fail_payout", {
            p_payout_id: payoutId,
            p_error: `Stripe transfer failed: ${event.id}`,
          });
          if (error) console.error(`Failed to mark producer payout ${payoutId} as failed:`, error);
          else console.log(`Producer payout ${payoutId} marked failed via webhook`);
        } else {
          // Dancer payout failure - existing flow
          const submissionId = transfer.metadata?.submission_id;
          if (submissionId) {
            await adminClient
              .from("payouts")
              .update({ status: "failed" })
              .eq("submission_id", submissionId);
            console.log(`Transfer failed for submission ${submissionId}`);
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Webhook error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
