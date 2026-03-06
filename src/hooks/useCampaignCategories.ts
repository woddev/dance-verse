import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CampaignCategory {
  id: string;
  slug: string;
  label: string;
  description: string;
  color: string;
  position: number;
}

export function useCampaignCategories() {
  return useQuery({
    queryKey: ["campaign-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_categories")
        .select("*")
        .order("position", { ascending: true });
      if (error) throw error;
      return data as CampaignCategory[];
    },
    staleTime: 5 * 60 * 1000,
  });
}
