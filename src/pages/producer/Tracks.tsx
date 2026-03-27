import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import ProducerLayout from "@/components/layout/ProducerLayout";
import { useProducerApi } from "@/hooks/useProducerApi";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import StateBadge from "@/components/deals/StateBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Play, Pause, Loader2 } from "lucide-react";
import { format } from "date-fns";

function MiniPlayer({ trackId, api }: { trackId: string; api: ReturnType<typeof import("@/hooks/useProducerApi").useProducerApi> }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [state, setState] = useState<"idle" | "loading" | "playing" | "paused">("idle");
  const [src, setSrc] = useState<string | null>(null);

  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (state === "loading") return;

    if (!src) {
      setState("loading");
      try {
        const detail = await api.getTrackDetail(trackId);
        if (detail?.file_url) {
          setSrc(detail.file_url);
          setState("playing");
        } else {
          setState("idle");
        }
      } catch {
        setState("idle");
      }
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;
    if (state === "playing") {
      audio.pause();
      setState("paused");
    } else {
      audio.play();
      setState("playing");
    }
  };

  useEffect(() => {
    if (src && state === "playing" && audioRef.current) {
      audioRef.current.play().catch(() => setState("paused"));
    }
  }, [src]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnd = () => setState("paused");
    audio.addEventListener("ended", onEnd);
    return () => audio.removeEventListener("ended", onEnd);
  }, [src]);

  return (
    <>
      {src && <audio ref={audioRef} src={src} preload="metadata" />}
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8 rounded-full shrink-0"
        onClick={toggle}
      >
        {state === "loading" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : state === "playing" ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4 ml-0.5" />
        )}
      </Button>
    </>
  );
}

export default function ProducerTracks() {
  const api = useProducerApi();
  const navigate = useNavigate();
  const [tracks, setTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getTracks().then(setTracks).finally(() => setLoading(false));
  }, []);

  return (
    <ProducerLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Tracks</h1>
        <Button onClick={() => navigate("/producer/tracks/new")}>
          <Plus className="h-4 w-4 mr-2" /> Submit Track
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : tracks.length === 0 ? (
        <p className="text-muted-foreground">No tracks submitted yet.</p>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Deal Type</TableHead>
                <TableHead className="text-right">Earnings</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tracks.map((t) => (
                <TableRow key={t.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/producer/tracks/${t.id}`)}>
                  <TableCell>
                    <MiniPlayer trackId={t.id} api={api} />
                  </TableCell>
                  <TableCell className="font-medium">{t.title}</TableCell>
                  <TableCell>{format(new Date(t.created_at), "MMM d, yyyy")}</TableCell>
                  <TableCell><StateBadge state={t.status} type="track" /></TableCell>
                  <TableCell>{t.deal_type ? <span className="capitalize">{t.deal_type.replace(/_/g, " ")}</span> : <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="text-right">${Number(t.earnings).toLocaleString("en-US", { minimumFractionDigits: 2 })}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </ProducerLayout>
  );
}
