import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Link2, AlertTriangle, Loader2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Submission = Tables<"submissions">;

interface Props {
  acceptanceId: string;
  campaignId: string;
  dancerId: string;
  requiredPlatforms: string[];
  isOverdue: boolean;
  onAllSubmitted: () => void;
}

export default function PlatformSubmissions({
  acceptanceId,
  campaignId,
  dancerId,
  requiredPlatforms,
  isOverdue,
  onAllSubmitted,
}: Props) {
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [submittingPlatform, setSubmittingPlatform] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const platforms = requiredPlatforms.length > 0 ? requiredPlatforms : ["tiktok", "instagram", "youtube"];

  useEffect(() => {
    fetchSubmissions();
  }, [acceptanceId]);

  async function fetchSubmissions() {
    const { data } = await supabase
      .from("submissions")
      .select("*")
      .eq("acceptance_id", acceptanceId);
    if (data) setSubmissions(data);
    setLoading(false);
  }

  const submittedPlatforms = new Set(submissions.map((s) => s.platform.toLowerCase()));
  const submittedCount = platforms.filter((p) => submittedPlatforms.has(p.toLowerCase())).length;
  const allDone = submittedCount === platforms.length;

  const handleSubmitUrl = async (platform: string) => {
    const url = urls[platform]?.trim();
    if (!url) {
      toast({ title: "Missing URL", description: `Please paste a URL for ${platform}.`, variant: "destructive" });
      return;
    }

    setSubmittingPlatform(platform);

    const { error } = await supabase.from("submissions").insert({
      acceptance_id: acceptanceId,
      campaign_id: campaignId,
      dancer_id: dancerId,
      video_url: url,
      platform: platform.toLowerCase(),
    });

    if (error) {
      toast({ title: "Submission failed", description: error.message, variant: "destructive" });
      setSubmittingPlatform(null);
      return;
    }

    // Check if this was the last platform
    const newCount = submittedCount + 1;
    if (newCount >= platforms.length) {
      const isLate = isOverdue;
      await supabase
        .from("campaign_acceptances")
        .update({ status: isLate ? "rejected" : "submitted" })
        .eq("id", acceptanceId);
      onAllSubmitted();
    }

    toast({ title: `${capitalize(platform)} URL submitted!` });
    setUrls((prev) => ({ ...prev, [platform]: "" }));
    setSubmittingPlatform(null);
    fetchSubmissions();
  };

  if (loading) return null;

  return (
    <Card id="submit-section" className="border border-border">
      <CardHeader>
        <CardTitle className="text-lg">Submit Your Post URLs</CardTitle>
        {isOverdue && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <AlertTriangle className="h-4 w-4" />
            Submissions past the deadline will be flagged as late.
          </p>
        )}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{submittedCount} of {platforms.length} platforms submitted</span>
            {allDone && <Badge className="bg-primary text-primary-foreground">All Done</Badge>}
          </div>
          <Progress value={(submittedCount / platforms.length) * 100} className="h-2" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {platforms.map((platform) => {
          const submitted = submissions.find((s) => s.platform.toLowerCase() === platform.toLowerCase());
          const isSubmitting = submittingPlatform === platform;

          return (
            <div
              key={platform}
              className={`flex items-center gap-3 p-4 rounded-lg border ${
                submitted ? "border-primary/30 bg-primary/5" : "border-border bg-muted/20"
              }`}
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-muted">
                {submitted ? (
                  <CheckCircle className="h-5 w-5 text-primary" />
                ) : (
                  <Link2 className="h-4 w-4 text-muted-foreground" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{capitalize(platform)}</p>
                {submitted ? (
                  <a
                    href={submitted.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline truncate block"
                  >
                    {submitted.video_url}
                  </a>
                ) : (
                  <div className="flex gap-2 mt-1">
                    <Input
                      placeholder={`https://${platform}.com/...`}
                      value={urls[platform] || ""}
                      onChange={(e) => setUrls((prev) => ({ ...prev, [platform]: e.target.value }))}
                      className="h-8 text-sm"
                    />
                    <Button
                      size="sm"
                      className="h-8 px-3"
                      disabled={isSubmitting}
                      onClick={() => handleSubmitUrl(platform)}
                    >
                      {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Submit"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
