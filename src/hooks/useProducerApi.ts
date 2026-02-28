import { supabase } from "@/integrations/supabase/client";

async function callProducer(action: string, params?: Record<string, string>, body?: any) {
  const queryString = new URLSearchParams({ action, ...params }).toString();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const method = body ? "POST" : "GET";
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const url = `https://${projectId}.supabase.co/functions/v1/producer-data?${queryString}`;

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

export function useProducerApi() {
  return {
    getOverview: () => callProducer("overview"),
    getActionCounts: () => callProducer("action-counts"),
    getTracks: () => callProducer("tracks"),
    getTrackDetail: (id: string) => callProducer("track-detail", { id }),
    getTrackHistory: (id: string) => callProducer("track-history", { id }),
    submitTrack: (body: any) => callProducer("submit-track", undefined, body),
    getOffers: () => callProducer("offers"),
    getOfferDetail: (id: string) => callProducer("offer-detail", { id }),
    acceptOffer: async (offer_id: string) => {
      // Step 1: Accept the offer
      await callProducer("accept-offer", undefined, { offer_id });
      // Step 2: Auto-generate contract + PDF
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.supabase.co/functions/v1/contract-engine?action=generate`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ offer_id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Contract generation failed" }));
        console.error("Auto-contract generation failed:", err.error);
        // Don't throw - offer was already accepted, contract can be generated later
      }
      return res.ok ? await res.json().catch(() => ({})) : {};
    },
    rejectOffer: (offer_id: string) => callProducer("reject-offer", undefined, { offer_id }),
    counterOffer: (body: any) => callProducer("counter-offer", undefined, body),
    getContracts: () => callProducer("contracts"),
    getContractDetail: (id: string) => callProducer("contract-detail", { id }),
    signContract: (contract_id: string, signer_name?: string) => callProducer("sign-contract", undefined, { contract_id, signer_name }),
    getEarnings: () => callProducer("earnings"),
    getEarningsByTrack: () => callProducer("earnings-by-track"),
    getEarningsByCampaign: () => callProducer("earnings-by-campaign"),
    getPayouts: () => callProducer("payouts"),
    getStripeInfo: () => callProducer("stripe-info"),
    getProfile: () => callProducer("get-profile"),
    updateProfile: (body: any) => callProducer("update-profile", undefined, body),
  };
}
