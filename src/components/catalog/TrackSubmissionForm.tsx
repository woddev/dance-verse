import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Send } from "lucide-react";

interface TrackSubmissionFormProps {
  trackId: string;
  userId: string;
  onSubmitted: () => void;
}

export default function TrackSubmissionForm({ trackId, userId, onSubmitted }: TrackSubmissionFormProps) {
  const [videoUrl, setVideoUrl] = useState("");
  const [platform, setPlatform] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrl.trim() || !platform) {
      toast.error("Please enter a video URL and select a platform");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("track_submissions" as any).insert({
      track_id: trackId,
      dancer_id: userId,
      video_url: videoUrl.trim(),
      platform,
    } as any);

    if (error) {
      toast.error("Failed to submit video");
      console.error(error);
    } else {
      toast.success("Video submitted!");
      setVideoUrl("");
      setPlatform("");
      onSubmitted();
    }
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 p-4 rounded-xl border border-border bg-card">
      <div className="flex-1 min-w-0">
        <label className="text-xs text-muted-foreground mb-1 block">Video URL</label>
        <Input
          placeholder="https://www.tiktok.com/@you/video/..."
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          type="url"
          required
        />
      </div>
      <div className="w-full sm:w-40">
        <label className="text-xs text-muted-foreground mb-1 block">Platform</label>
        <Select value={platform} onValueChange={setPlatform} required>
          <SelectTrigger>
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tiktok">TikTok</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
            <SelectItem value="youtube">YouTube</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={submitting} className="sm:w-auto">
        <Send className="h-4 w-4 mr-1.5" />
        {submitting ? "Submitting…" : "Submit"}
      </Button>
    </form>
  );
}
