import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, Music, Zap, TrendingUp, Star, ArrowRight, Loader2 } from "lucide-react";

interface PromotionPackage {
  id: string;
  name: string;
  description: string;
  price_cents: number;
  features: string[];
  max_creators: number;
  platforms: string[];
  position: number;
}

const CUSTOM_PACKAGE_ID = "custom";

export default function Promote() {
  const [packages, setPackages] = useState<PromotionPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    artist_name: "",
    song_title: "",
    email: "",
    phone: "",
    audio_url: "",
    cover_image_url: "",
    instagram_url: "",
    tiktok_url: "",
    spotify_url: "",
    youtube_url: "",
    hashtags: "",
    notes: "",
  });

  useEffect(() => {
    supabase
      .from("promotion_packages")
      .select("*")
      .eq("active", true)
      .order("position")
      .then(({ data }) => {
        if (data) {
          setPackages(
            data.map((p: any) => ({
              ...p,
              features: Array.isArray(p.features) ? p.features : [],
            }))
          );
        }
        setLoading(false);
      });
  }, []);

  // Pre-select package from URL param
  useEffect(() => {
    const pkgId = searchParams.get("package");
    if (pkgId) setSelectedPackage(pkgId);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPackage) {
      toast.error("Please select a promotion package");
      return;
    }
    if (!form.artist_name || !form.song_title || !form.email) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmitting(true);

    // Custom package: insert directly without payment
    if (selectedPackage === CUSTOM_PACKAGE_ID) {
      try {
        // We need a real package_id for the FK — find or use the first package as a placeholder
        // Instead, insert with a special flow: use the edge function but skip checkout
        const { error } = await supabase.from("artist_submissions").insert({
          package_id: packages[0]?.id, // fallback FK reference
          artist_name: form.artist_name,
          song_title: form.song_title,
          email: form.email,
          phone: form.phone || null,
          audio_url: form.audio_url || null,
          cover_image_url: form.cover_image_url || null,
          instagram_url: form.instagram_url || null,
          tiktok_url: form.tiktok_url || null,
          spotify_url: form.spotify_url || null,
          youtube_url: form.youtube_url || null,
          hashtags: form.hashtags ? form.hashtags.split(",").map((h) => h.trim()) : [],
          notes: `[CUSTOM PACKAGE REQUEST]\n${form.notes || ""}`.trim(),
          payment_status: "custom",
          review_status: "pending",
        });
        if (error) throw error;
        toast.success("Custom request submitted! We'll be in touch.");
        navigate("/promote/success");
      } catch (err: any) {
        toast.error(err.message || "Failed to submit request");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    try {
      const origin = window.location.origin;
      const { data, error } = await supabase.functions.invoke("create-promotion-checkout", {
        body: {
          package_id: selectedPackage,
          artist_name: form.artist_name,
          song_title: form.song_title,
          email: form.email,
          phone: form.phone || undefined,
          audio_url: form.audio_url || undefined,
          cover_image_url: form.cover_image_url || undefined,
          instagram_url: form.instagram_url || undefined,
          tiktok_url: form.tiktok_url || undefined,
          spotify_url: form.spotify_url || undefined,
          youtube_url: form.youtube_url || undefined,
          hashtags: form.hashtags ? form.hashtags.split(",").map((h) => h.trim()) : [],
          notes: form.notes || undefined,
          success_url: `${origin}/promote/success`,
          cancel_url: `${origin}/promote`,
        },
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to start checkout");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedPkg = packages.find((p) => p.id === selectedPackage);

  const tierIcons = [Music, Zap, TrendingUp, Star];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="pt-28 pb-16 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <Badge variant="secondary" className="mb-4 text-xs tracking-widest uppercase">
            Artist Services
          </Badge>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-4">
            Promote Your Music
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Get real dancers creating viral content to your track. Select a package, submit your song, and we handle the rest.
          </p>
        </div>
      </section>

      {/* Packages */}
      <section className="px-4 pb-16">
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : packages.length === 0 ? (
            <p className="text-center text-muted-foreground py-20">
              No promotion packages available yet. Check back soon!
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
              {packages.map((pkg, i) => {
                const Icon = tierIcons[i % tierIcons.length];
                const isSelected = selectedPackage === pkg.id;
                return (
                  <Card
                    key={pkg.id}
                    className={`relative cursor-pointer transition-all duration-200 hover:shadow-lg ${
                      isSelected
                        ? "ring-2 ring-primary shadow-lg"
                        : "hover:ring-1 hover:ring-border"
                    }`}
                    onClick={() => setSelectedPackage(pkg.id)}
                  >
                    {isSelected && (
                      <div className="absolute -top-3 -right-3 bg-primary text-primary-foreground rounded-full p-1">
                        <Check className="h-4 w-4" />
                      </div>
                    )}
                    <CardHeader>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-muted">
                          <Icon className="h-5 w-5" />
                        </div>
                        <CardTitle className="text-xl">{pkg.name}</CardTitle>
                      </div>
                      <div className="text-3xl font-black">
                        ${(pkg.price_cents / 100).toLocaleString()}
                      </div>
                      {pkg.description && (
                        <CardDescription>{pkg.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 mb-4">
                        <div className="text-sm font-medium text-muted-foreground">
                          Up to {pkg.max_creators} creators
                        </div>
                        {pkg.platforms.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {pkg.platforms.map((p) => (
                              <Badge key={p} variant="outline" className="text-xs">
                                {p}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <ul className="space-y-2">
                        {pkg.features.map((f, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                );
              })}

              {/* Custom Package Card */}
              <Card
                className={`relative cursor-pointer transition-all duration-200 hover:shadow-lg border-dashed border-2 ${
                  selectedPackage === CUSTOM_PACKAGE_ID
                    ? "ring-2 ring-primary shadow-lg"
                    : "hover:ring-1 hover:ring-border"
                }`}
                onClick={() => setSelectedPackage(CUSTOM_PACKAGE_ID)}
              >
                {selectedPackage === CUSTOM_PACKAGE_ID && (
                  <div className="absolute -top-3 -right-3 bg-primary text-primary-foreground rounded-full p-1">
                    <Check className="h-4 w-4" />
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-muted">
                      <Star className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-xl">Custom Campaign</CardTitle>
                  </div>
                  <div className="text-3xl font-black">Let's Talk</div>
                  <CardDescription>
                    Need something bigger? Submit your details and our team will build a custom plan for your campaign.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {["Unlimited creators", "Multi-platform rollout", "Dedicated campaign manager", "Custom timeline & deliverables", "Priority placement"].map((f, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Submission Form */}
          {selectedPackage && (
            <div className="max-w-2xl mx-auto" id="submit">
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">Submit Your Song</CardTitle>
                  <CardDescription>
                    {selectedPackage === CUSTOM_PACKAGE_ID
                      ? "Selected: Custom Campaign — We'll reach out with pricing"
                      : selectedPkg
                        ? `Selected: ${selectedPkg.name} — $${(selectedPkg.price_cents / 100).toLocaleString()}`
                        : "Select a package above to continue"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="artist_name">Artist Name *</Label>
                        <Input
                          id="artist_name"
                          value={form.artist_name}
                          onChange={(e) => setForm({ ...form, artist_name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="song_title">Song Title *</Label>
                        <Input
                          id="song_title"
                          value={form.song_title}
                          onChange={(e) => setForm({ ...form, song_title: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={form.phone}
                          onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="audio_url">Audio URL (SoundCloud, Dropbox, Google Drive)</Label>
                      <Input
                        id="audio_url"
                        type="url"
                        placeholder="https://..."
                        value={form.audio_url}
                        onChange={(e) => setForm({ ...form, audio_url: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cover_image_url">Cover Art URL</Label>
                      <Input
                        id="cover_image_url"
                        type="url"
                        placeholder="https://..."
                        value={form.cover_image_url}
                        onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="instagram_url">Instagram URL</Label>
                        <Input
                          id="instagram_url"
                          type="url"
                          value={form.instagram_url}
                          onChange={(e) => setForm({ ...form, instagram_url: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tiktok_url">TikTok URL</Label>
                        <Input
                          id="tiktok_url"
                          type="url"
                          value={form.tiktok_url}
                          onChange={(e) => setForm({ ...form, tiktok_url: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="spotify_url">Spotify URL</Label>
                        <Input
                          id="spotify_url"
                          type="url"
                          value={form.spotify_url}
                          onChange={(e) => setForm({ ...form, spotify_url: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="youtube_url">YouTube URL</Label>
                        <Input
                          id="youtube_url"
                          type="url"
                          value={form.youtube_url}
                          onChange={(e) => setForm({ ...form, youtube_url: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="hashtags">Hashtags (comma-separated)</Label>
                      <Input
                        id="hashtags"
                        placeholder="#yoursong, #artistname"
                        value={form.hashtags}
                        onChange={(e) => setForm({ ...form, hashtags: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">Additional Notes</Label>
                      <Textarea
                        id="notes"
                        placeholder="Any specific instructions or preferences..."
                        value={form.notes}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      />
                    </div>

                    <Button
                      type="submit"
                      size="lg"
                      className="w-full"
                      disabled={!selectedPackage || submitting}
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <ArrowRight className="h-4 w-4 mr-2" />
                      )}
                      {selectedPackage === CUSTOM_PACKAGE_ID
                        ? "Submit Custom Request"
                        : selectedPkg
                          ? `Continue to Payment — $${(selectedPkg.price_cents / 100).toLocaleString()}`
                          : "Select a Package"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
