import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Music, Loader2, Download, Play, Pause, Sparkles } from "lucide-react";

const PROMPT_SUGGESTIONS = [
  "Upbeat hip-hop beat with heavy bass, crisp snares, and a catchy melody, 90 BPM",
  "Chill lo-fi jazz with vinyl crackle, soft piano, and mellow saxophone",
  "Energetic K-pop dance track with synth drops and driving percussion, 128 BPM",
  "Dark cinematic orchestral piece with tension-building strings and deep drums",
  "Tropical house with steel drums, airy vocals, and a groovy bassline",
];

export default function MusicGenerator() {
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState(30);
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const generate = async () => {
    if (!prompt.trim()) {
      toast({ title: "Describe your music", description: "Enter a prompt to generate music.", variant: "destructive" });
      return;
    }

    setLoading(true);
    setAudioUrl(null);
    setPlaying(false);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-music`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ prompt: prompt.trim(), duration }),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Generation failed" }));
        throw new Error(err.error || "Generation failed");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      toast({ title: "Music generated!", description: "Your track is ready to play." });
    } catch (err: any) {
      console.error(err);
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play();
    }
    setPlaying(!playing);
  };

  const handleEnded = () => setPlaying(false);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 py-16 px-4">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-muted text-sm font-medium text-muted-foreground">
              <Sparkles className="h-4 w-4" />
              Powered by ElevenLabs
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
              Music Generator
            </h1>
            <p className="text-muted-foreground text-lg max-w-md mx-auto">
              Describe the sound you're looking for and we'll create an original track in seconds.
            </p>
          </div>

          {/* Generator Card */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Music className="h-5 w-5" />
                Create Your Track
              </CardTitle>
              <CardDescription>
                Be specific — mention genre, mood, instruments, tempo, and style.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Prompt */}
              <div className="space-y-2">
                <Label htmlFor="prompt">Music Description</Label>
                <Textarea
                  id="prompt"
                  placeholder="e.g. Upbeat hip-hop beat with heavy bass and crisp snares, 90 BPM..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                  className="resize-none"
                  disabled={loading}
                />
              </div>

              {/* Suggestions */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Try a suggestion</Label>
                <div className="flex flex-wrap gap-2">
                  {PROMPT_SUGGESTIONS.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => setPrompt(s)}
                      disabled={loading}
                      className="text-xs px-3 py-1.5 rounded-full border border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
                    >
                      {s.length > 50 ? s.slice(0, 50) + "…" : s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Duration</Label>
                  <span className="text-sm font-medium text-foreground">{duration}s</span>
                </div>
                <Slider
                  value={[duration]}
                  onValueChange={(v) => setDuration(v[0])}
                  min={10}
                  max={120}
                  step={5}
                  disabled={loading}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>10s</span>
                  <span>120s</span>
                </div>
              </div>

              {/* Generate Button */}
              <Button
                onClick={generate}
                disabled={loading || !prompt.trim()}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating… this may take a minute
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Music
                  </>
                )}
              </Button>

              {/* Audio Player */}
              {audioUrl && (
                <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-3">
                  <audio
                    ref={audioRef}
                    src={audioUrl}
                    onEnded={handleEnded}
                    preload="auto"
                  />
                  <div className="flex items-center gap-3">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-10 w-10 rounded-full flex-shrink-0"
                      onClick={togglePlay}
                    >
                      {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                    </Button>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">Generated Track</p>
                      <p className="text-xs text-muted-foreground">{duration}s • MP3</p>
                    </div>
                    <a href={audioUrl} download="danceverse-generated.mp3">
                      <Button size="sm" variant="outline" className="gap-1.5">
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </Button>
                    </a>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
