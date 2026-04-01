import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Music, Hash, CheckCircle, ArrowRight } from "lucide-react";
import CountdownTimer from "@/components/campaign/CountdownTimer";
import { useCampaignCategories } from "@/hooks/useCampaignCategories";
import heroDancer1 from "@/assets/hero-dancer-1.png";
import heroVideoFallback from "@/assets/hero-video.mp4";
import rhythmVisual from "@/assets/rhythm-visual-new.png";
import labelUniversal from "@/assets/label-universal-2.png";
import labelHybe from "@/assets/label-hybe-2.png";
import labelHitco from "@/assets/label-hitco-2.png";
import labelWarner from "@/assets/label-warner-2.png";
import labelSony from "@/assets/label-sony-2.png";
import labelEmpire from "@/assets/label-empire-2.png";
import Navbar from "@/components/layout/Navbar";
import { supabase } from "@/integrations/supabase/client";

interface HeroSettings {
  headline: string;
  subheadline: string;
  video_url: string | null;
  cta_text: string;
  cta_link: string;
}

function formatPay(payScale: any): string {
  if (!Array.isArray(payScale) || payScale.length === 0) return "—";
  const amounts = payScale.map((p: any) => p.amount_cents ?? p.amount ?? 0);
  const min = Math.min(...amounts);
  const max = Math.max(...amounts);
  const fmt = (v: number) => (v >= 100 ? `$${(v / 100).toFixed(0)}` : `$${v}`);
  if (min === max) return fmt(max);
  return `${fmt(min)}–${fmt(max)}`;
}

const Index = () => {
  const { data: categories = [] } = useCampaignCategories();
  const categoryMap = Object.fromEntries(categories.map((c) => [c.slug, c]));

  const [hero, setHero] = useState<HeroSettings>({
    headline: "Building the Sonic Foundation for dance",
    subheadline: "Connecting the dance and music industry one move at a time",
    video_url: null,
    cta_text: "APPLY NOW",
    cta_link: "/dancer/apply",
  });
  const [campaigns, setCampaigns] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from("hero_settings")
      .select("headline, subheadline, video_url, cta_text, cta_link")
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) setHero(data);
      });

    supabase
      .from("campaigns")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(4)
      .then(({ data }) => {
        if (data) setCampaigns(data);
      });
  }, []);

  const videoSrc = hero.video_url || heroVideoFallback;

  return <div className="min-h-screen">
      <Navbar />

      {/* Hero Section — Pearpop-style full-width video background */}
      <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background video */}
        <video
          src={videoSrc}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/50" />

        {/* Content */}
        <div className="relative z-10 text-center text-white px-6 max-w-4xl mx-auto space-y-6">
          <h1 className="text-5xl md:text-7xl font-bold leading-[0.95] tracking-tight lg:text-7xl">
            {hero.headline}
          </h1>
          <p className="text-lg md:text-xl lg:text-2xl opacity-80 max-w-2xl mx-auto">
            {hero.subheadline}
          </p>
          {/* CTA button hidden for now */}
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-foreground text-background py-16">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-3 gap-8 text-center">
            <div>
              <p className="text-4xl lg:text-5xl font-bold">500+</p>
              <p className="text-sm lg:text-base mt-2 opacity-70">Dancers Worldwide</p>
            </div>
            <div>
              <p className="text-4xl lg:text-5xl font-bold">10M+</p>
              <p className="text-sm lg:text-base mt-2 opacity-70">Total Campaign Reach</p>
            </div>
            <div>
              <p className="text-4xl lg:text-5xl font-bold">50+</p>
              <p className="text-sm lg:text-base mt-2 opacity-70">Campaigns Launched</p>
            </div>
          </div>
        </div>
      </section>

      {/* We Work With The Best — Scrolling Logos */}
      <section className="bg-foreground text-background pt-8 lg:pt-10 pb-20 lg:pb-28 overflow-hidden">
        <div className="text-center mb-8">
          <h3 className="text-3xl font-medium py-[18px]">We work with the best</h3>
        </div>
        <div className="relative w-full">
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-foreground to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-foreground to-transparent z-10" />
          <div className="flex w-max animate-marquee items-center">
            {[0, 1].map((set) => (
              <div key={set} className="flex items-center gap-16 pr-16 shrink-0">
                {[labelUniversal, labelHybe, labelHitco, labelWarner, labelSony, labelEmpire].map((src, i) => (
                  <img key={i} src={src} alt="Label partner" className="h-10 lg:h-12 w-auto object-contain opacity-80 hover:opacity-100 transition-opacity shrink-0" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Dancers Section */}
      <section className="bg-background text-foreground py-24">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <span className="inline-block text-sm font-semibold tracking-widest uppercase text-primary">For Dancers</span>
              <h3 className="text-3xl lg:text-4xl font-bold leading-tight">
                Weekly Campaigns
              </h3>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Dance Verse is where dancers become collaborators, not just content. Partner with top artists and labels on campaigns that put your artistry front and center.
              </p>
...
              <p className="text-lg text-muted-foreground leading-relaxed">
                Get your music in front of thousands of dancers who create viral content on TikTok, Instagram, and YouTube. We handle the campaign, the creators, and the reporting, you just drop the track.
              </p>
...
              <p className="text-lg text-muted-foreground leading-relaxed">
                Dance Verse connects producers with major campaigns. Upload your music, receive deal offers, and start earning — all from one platform.
              </p>
              <ul className="space-y-3 text-base">
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <span>Submit tracks and get reviewed by our A&R team</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <span>We offer buyouts, splits and or community support</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <span>Track earnings and manage contracts in one dashboard</span>
                </li>
              </ul>
              <Link to="/producers">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-12 py-6 text-lg rounded-full mt-4">
                  LEARN MORE
                </Button>
              </Link>
            </div>
            <div className="relative">
              <div className="absolute -inset-8 bg-primary/5 rounded-3xl blur-3xl" />
              <div className="relative rounded-2xl shadow-2xl w-full max-w-md mx-auto bg-muted p-10 flex flex-col items-center justify-center gap-6">
                <Music className="h-20 w-20 text-primary opacity-80" />
                <p className="text-2xl font-bold text-center">Your beats.<br />Their movement.</p>
              </div>
            </div>
          </div>
        </div>
      </section>


      <section className="bg-foreground text-background py-20">
        <div className="container mx-auto px-6 text-center space-y-8">
          <h3 className="text-3xl lg:text-4xl font-bold">Ready to get started?</h3>
          <p className="text-lg opacity-70 max-w-2xl mx-auto whitespace-nowrap">Whether you dance or make music, there's a place for you on Dance-Verse.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/dancer/apply">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-10 py-6 text-lg rounded-full">
                I'M A DANCER
              </Button>
            </Link>
            <Link to="/promote">
              <Button size="lg" variant="outline" className="border-background bg-background text-foreground hover:bg-background/90 px-10 py-6 text-lg rounded-full">
                PROMOTE MUSIC
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-background py-16">
        <div className="container mx-auto px-6">
          <div className="border-t border-background/20 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm opacity-70">
            <div className="flex gap-8">
              <a href="#" className="hover:opacity-100 transition-opacity py-2 px-3">Contact Us</a>
              <a href="#" className="hover:opacity-100 transition-opacity py-2 px-3">Terms & Support</a>
              <a href="#" className="hover:opacity-100 transition-opacity py-2 px-3">Privacy Policy</a>
            </div>
            <p>&copy; {new Date().getFullYear()} Dance Verse. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>;
};
export default Index;
