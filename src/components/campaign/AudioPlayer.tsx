import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, Volume2, VolumeX, Download } from "lucide-react";

interface AudioPlayerProps {
  src: string;
  title?: string;
  artist?: string;
  coverUrl?: string | null;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function AudioPlayer({ src, title, artist, coverUrl }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime = () => setCurrentTime(audio.currentTime);
    const onMeta = () => setDuration(audio.duration);
    const onEnd = () => setPlaying(false);

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnd);

    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnd);
    };
  }, [src]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play();
    }
    setPlaying(!playing);
  };

  const seek = (value: number[]) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 border border-border">
      <audio ref={audioRef} src={src} muted={muted} preload="metadata" />

      {/* Mini cover */}
      {coverUrl && (
        <img src={coverUrl} alt="" className="h-12 w-12 rounded-lg object-cover flex-shrink-0" />
      )}

      {/* Play button */}
      <Button
        size="icon"
        variant="outline"
        className="h-10 w-10 rounded-full flex-shrink-0"
        onClick={toggle}
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
      </Button>

      {/* Track info + slider */}
      <div className="flex-1 min-w-0 space-y-1">
        {(title || artist) && (
          <div className="flex items-baseline gap-2 text-sm">
            {title && <span className="font-medium truncate">{title}</span>}
            {artist && <span className="text-muted-foreground truncate">{artist}</span>}
          </div>
        )}
        <Slider
          value={[currentTime]}
          max={duration || 100}
          step={0.1}
          onValueChange={seek}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatTime(currentTime)}</span>
          <span>{duration ? formatTime(duration) : "—"}</span>
        </div>
      </div>

      {/* Mute */}
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8 flex-shrink-0"
        onClick={() => setMuted(!muted)}
      >
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </Button>

      {/* Download */}
      <a href={src} download target="_blank" rel="noopener noreferrer">
        <Button size="icon" variant="ghost" className="h-8 w-8 flex-shrink-0">
          <Download className="h-4 w-4" />
        </Button>
      </a>
    </div>
  );
}
