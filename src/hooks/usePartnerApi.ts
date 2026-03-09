import { supabase } from "@/integrations/supabase/client";

async function callPartner(action: string, params?: Record<string, string>, body?: any) {
  const queryString = new URLSearchParams({ action, ...params }).toString();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const method = body ? "POST" : "GET";
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const url = `https://${projectId}.supabase.co/functions/v1/partner-data?${queryString}`;

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

export function usePartnerApi() {
  return {
    getOverview: () => callPartner("overview"),
    getReferrals: () => callPartner("referrals"),
    getCommissions: (status?: string) => callPartner("commissions", status ? { status } : undefined),
    acceptTerms: () => callPartner("accept-terms", undefined, {}),
    updateStripe: (stripe_account_id: string) => callPartner("update-stripe", undefined, { stripe_account_id }),
  };
}
