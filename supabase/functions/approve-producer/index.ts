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

    // Verify admin role
    const { data: roleRows } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["admin", "super_admin"]);

    if (!roleRows || roleRows.length === 0) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { application_id, rejection_reason } = body;
    if (!application_id) throw new Error("Missing application_id");

    const { data: app, error: appErr } = await adminClient
      .from("producer_applications")
      .select("*")
      .eq("id", application_id)
      .single();
    if (appErr || !app) throw new Error("Application not found");

    // Handle rejection
    if (rejection_reason) {
      await adminClient
        .from("producer_applications")
        .update({ status: "rejected", rejection_reason, reviewed_at: new Date().toISOString() })
        .eq("id", application_id);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Approve flow
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(app.email)) {
      throw new Error(`Invalid email: "${app.email}"`);
    }

    // 1. Invite user
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(app.email, {
      data: { full_name: app.legal_name || "" },
      redirectTo: `${req.headers.get("origin") || Deno.env.get("SUPABASE_URL")}/auth`,
    });
    if (inviteError) throw inviteError;

    const newUserId = inviteData?.user?.id;
    if (!newUserId) throw new Error("Failed to create user");

    // 2. Assign producer role
    await adminClient.from("user_roles").insert({ user_id: newUserId, role: "producer" });

    // 3. Create deals.producers record
    await adminClient.rpc("create_producer_record_on_approve", {
      p_user_id: newUserId,
      p_legal_name: app.legal_name,
      p_stage_name: app.stage_name || null,
      p_email: app.email,
    });

    // 4. Update application status
    await adminClient
      .from("producer_applications")
      .update({ status: "approved", reviewed_at: new Date().toISOString() })
      .eq("id", application_id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
