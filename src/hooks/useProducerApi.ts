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
    getTracks: () => callProducer("tracks"),
    getTrackDetail: (id: string) => callProducer("track-detail", { id }),
    getTrackHistory: (id: string) => callProducer("track-history", { id }),
    submitTrack: (body: any) => callProducer("submit-track", undefined, body),
    getOffers: () => callProducer("offers"),
    getOfferDetail: (id: string) => callProducer("offer-detail", { id }),
    acceptOffer: (offer_id: string) => callProducer("accept-offer", undefined, { offer_id }),
    rejectOffer: (offer_id: string) => callProducer("reject-offer", undefined, { offer_id }),
    counterOffer: (body: any) => callProducer("counter-offer", undefined, body),
    getContracts: () => callProducer("contracts"),
    getContractDetail: (id: string) => callProducer("contract-detail", { id }),
    signContract: (contract_id: string) => callProducer("sign-contract", undefined, { contract_id }),
    getEarnings: () => callProducer("earnings"),
    getEarningsByTrack: () => callProducer("earnings-by-track"),
    getEarningsByCampaign: () => callProducer("earnings-by-campaign"),
    getPayouts: () => callProducer("payouts"),
    getStripeInfo: () => callProducer("stripe-info"),
    getProfile: () => callProducer("get-profile"),
    updateProfile: (body: any) => callProducer("update-profile", undefined, body),
  };
}
