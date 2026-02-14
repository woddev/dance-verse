import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Users, Instagram, ExternalLink } from "lucide-react";

interface VideoLink {
  id: string;
  platform: string;
  video_url: string;
}

interface Dancer {
  dancer_id: string;
  full_name: string | null;
  avatar_url: string | null;
  instagram_handle: string | null;
  tiktok_handle: string | null;
  video_links: VideoLink[];
}

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1 0-5.78c.27 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.3 6.34 6.34 0 0 0 9.49 21.64a6.34 6.34 0 0 0 6.34-6.34V8.72a8.26 8.26 0 0 0 3.76.91V6.69Z" />
  </svg>
);

function platformIcon(platform: string) {
  const p = platform.toLowerCase();
  if (p === "instagram") return <Instagram className="h-3.5 w-3.5" />;
  if (p === "tiktok") return <TikTokIcon />;
  return <ExternalLink className="h-3.5 w-3.5" />;
}

function platformLabel(platform: string) {
  const p = platform.toLowerCase();
  if (p === "instagram") return "IG";
  if (p === "tiktok") return "TT";
  if (p === "youtube") return "YT";
  return platform.slice(0, 2).toUpperCase();
}

const PASTEL_COLORS = [
  "bg-pink-200 text-pink-800",
  "bg-purple-200 text-purple-800",
  "bg-blue-200 text-blue-800",
  "bg-cyan-200 text-cyan-800",
  "bg-teal-200 text-teal-800",
  "bg-green-200 text-green-800",
  "bg-yellow-200 text-yellow-800",
  "bg-orange-200 text-orange-800",
  "bg-rose-200 text-rose-800",
  "bg-indigo-200 text-indigo-800",
];

function getPastelColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return PASTEL_COLORS[Math.abs(hash) % PASTEL_COLORS.length];
}

export default function CampaignDancers({ campaignId }: { campaignId: string }) {
  const [dancers, setDancers] = useState<Dancer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .rpc("get_campaign_dancers", { p_campaign_id: campaignId })
      .then(({ data }) => {
        if (data) setDancers(data as unknown as Dancer[]);
        setLoading(false);
      });
  }, [campaignId]);

  if (loading) return null;

  return (
    <Card>
      <CardContent className="p-8">
        <div className="flex items-center gap-2 mb-1">
          <Users className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Creators on this Campaign</h2>
        </div>
        <p className="text-muted-foreground mb-6">
          {dancers.length > 0
            ? `${dancers.length} Creator${dancers.length > 1 ? "s" : ""}`
            : "Be the first to submit!"}
        </p>

        {dancers.length > 0 && (
          <div className="flex flex-wrap gap-6">
            {dancers.map((d) => {
              const initials = (d.full_name || "?")
                .split(" ")
                .map((w) => w[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();

              return (
                <div key={d.dancer_id} className="flex flex-col items-center gap-2 w-24">
                  <Avatar className="h-14 w-14">
                    {d.avatar_url && <AvatarImage src={d.avatar_url} alt={d.full_name || ""} />}
                    <AvatarFallback className={`text-sm font-semibold ${getPastelColor(d.dancer_id)}`}>{initials}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-center font-medium leading-tight truncate w-full">
                    {d.full_name || "Dancer"}
                  </span>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {d.video_links.length > 0
                      ? d.video_links.map((link) => (
                          <a
                            key={link.id}
                            href={link.video_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`${link.platform} video`}
                            className="flex items-center gap-0.5 text-muted-foreground hover:text-foreground transition-colors text-[10px] font-medium"
                          >
                            {platformIcon(link.platform)}
                            <span>{platformLabel(link.platform)}</span>
                          </a>
                        ))
                      : (
                        <>
                          {d.instagram_handle && (
                            <a
                              href={`https://instagram.com/${d.instagram_handle.replace("@", "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <Instagram className="h-3.5 w-3.5" />
                            </a>
                          )}
                          {d.tiktok_handle && (
                            <a
                              href={`https://tiktok.com/@${d.tiktok_handle.replace("@", "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <TikTokIcon />
                            </a>
                          )}
                        </>
                      )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
