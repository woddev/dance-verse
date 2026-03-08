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
    const body = await req.json();
    const {
      package_id,
      artist_name,
      song_title,
      email,
      phone,
      audio_url,
      cover_image_url,
      instagram_url,
      tiktok_url,
      spotify_url,
      youtube_url,
      hashtags,
      notes,
      success_url,
      cancel_url,
    } = body;

    if (!package_id || !artist_name || !song_title || !email) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get the package details
    const { data: pkg, error: pkgError } = await adminClient
      .from("promotion_packages")
      .select("*")
      .eq("id", package_id)
      .eq("active", true)
      .single();

    if (pkgError || !pkg) {
      return new Response(
        JSON.stringify({ error: "Package not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create the artist submission record
    const { data: submission, error: subError } = await adminClient
      .from("artist_submissions")
      .insert({
        package_id,
        artist_name,
        song_title,
        email,
        phone: phone || null,
        audio_url: audio_url || null,
        cover_image_url: cover_image_url || null,
        instagram_url: instagram_url || null,
        tiktok_url: tiktok_url || null,
        spotify_url: spotify_url || null,
        youtube_url: youtube_url || null,
        hashtags: hashtags || [],
        notes: notes || null,
        payment_status: "unpaid",
        review_status: "pending",
      })
      .select("id")
      .single();

    if (subError || !submission) {
      console.error("Failed to create submission:", subError);
      return new Response(
        JSON.stringify({ error: "Failed to create submission" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Stripe Checkout Session
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2023-10-16",
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${pkg.name} — Music Promotion`,
              description: `Promotion package for "${song_title}" by ${artist_name}`,
            },
            unit_amount: pkg.price_cents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        submission_id: submission.id,
        package_id: pkg.id,
        type: "promotion_package",
      },
      success_url: success_url || "https://danceverse.lovable.app/promote/success",
      cancel_url: cancel_url || "https://danceverse.lovable.app/promote",
    });

    // Update submission with stripe session id
    await adminClient
      .from("artist_submissions")
      .update({ stripe_session_id: session.id })
      .eq("id", submission.id);

    return new Response(
      JSON.stringify({ url: session.url, session_id: session.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("create-promotion-checkout error:", err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
