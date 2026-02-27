import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ProducerLayout from "@/components/layout/ProducerLayout";
import { useProducerApi } from "@/hooks/useProducerApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StateBadge from "@/components/deals/StateBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Music } from "lucide-react";
import { format } from "date-fns";

export default function TrackDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const api = useProducerApi();
  const [track, setTrack] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.getTrackDetail(id),
      api.getTrackHistory(id),
    ]).then(([t, h]) => {
      setTrack(t);
      setHistory(h);
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <ProducerLayout>
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-64 w-full" />
      </ProducerLayout>
    );
  }

  if (!track) {
    return (
      <ProducerLayout>
        <p className="text-muted-foreground">Track not found.</p>
      </ProducerLayout>
    );
  }

  return (
    <ProducerLayout>
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate("/producer/tracks")}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Tracks
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center gap-3">
            {track.artwork_url ? (
              <img src={track.artwork_url} alt="" className="h-16 w-16 rounded-md object-cover" />
            ) : (
              <div className="h-16 w-16 rounded-md bg-muted flex items-center justify-center"><Music className="h-6 w-6 text-muted-foreground" /></div>
            )}
            <div>
              <CardTitle className="text-xl">{track.title}</CardTitle>
              <div className="mt-1"><StateBadge state={track.status} type="track" /></div>
            </div>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              {track.genre && <><dt className="text-muted-foreground">Genre</dt><dd>{track.genre}</dd></>}
              {track.bpm && <><dt className="text-muted-foreground">BPM</dt><dd>{track.bpm}</dd></>}
              {track.isrc && <><dt className="text-muted-foreground">ISRC</dt><dd className="font-mono">{track.isrc}</dd></>}
              <dt className="text-muted-foreground">Master Ownership</dt><dd>{track.master_ownership_percent ?? "—"}%</dd>
              <dt className="text-muted-foreground">Publishing Ownership</dt><dd>{track.publishing_ownership_percent ?? "—"}%</dd>
              <dt className="text-muted-foreground">Explicit</dt><dd>{track.explicit_flag ? "Yes" : "No"}</dd>
              <dt className="text-muted-foreground">Submitted</dt><dd>{format(new Date(track.created_at), "MMM d, yyyy")}</dd>
            </dl>
            {track.mood_tags && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground mb-1">Mood Tags</p>
                <div className="flex flex-wrap gap-1">
                  {(Array.isArray(track.mood_tags) ? track.mood_tags : []).map((tag: string) => (
                    <span key={tag} className="px-2 py-0.5 bg-muted rounded text-xs">{tag}</span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* State Timeline */}
        <Card>
          <CardHeader><CardTitle className="text-base">State History</CardTitle></CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">No state changes recorded.</p>
            ) : (
              <div className="space-y-3">
                {history.map((h, i) => (
                  <div key={h.id} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className="h-2.5 w-2.5 rounded-full bg-primary mt-1.5" />
                      {i < history.length - 1 && <div className="w-px h-full bg-border flex-1 min-h-[24px]" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        {h.previous_state && <span className="text-xs text-muted-foreground capitalize">{h.previous_state.replace(/_/g, " ")}</span>}
                        {h.previous_state && <span className="text-xs text-muted-foreground">→</span>}
                        <StateBadge state={h.new_state} type="track" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(h.changed_at), "MMM d, yyyy HH:mm")}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ProducerLayout>
  );
}
