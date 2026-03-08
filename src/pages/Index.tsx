import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import aboutLogo from "@/assets/dv-wod-logo.png";
import crossPattern from "@/assets/cross-patterns.png";
import heroDancer1 from "@/assets/hero-dancer-1.png";
import heroVideo from "@/assets/hero-video.mp4";
import heroDancer3 from "@/assets/hero-dancer-3.png";
import rhythmVisual from "@/assets/rhythm-visual-new.png";
import analyticsPhone from "@/assets/analytics-phone.jpg";
import labelUniversal from "@/assets/label-universal-2.png";
import labelHybe from "@/assets/label-hybe-2.png";
import labelHitco from "@/assets/label-hitco-2.png";
import labelWarner from "@/assets/label-warner-2.png";
import labelSony from "@/assets/label-sony-2.png";
import labelEmpire from "@/assets/label-empire-2.png";
import Navbar from "@/components/layout/Navbar";

const Index = () => {
  return <div className="min-h-screen">
      <Navbar />
      {/* Hero Section */}
      <section id="home" className="relative min-h-screen flex items-center bg-background overflow-hidden">
        {/* Dot pattern overlay */}
        <div
          className="absolute inset-0 z-0 opacity-60"
          style={{ backgroundImage: `url(${crossPattern})`, backgroundRepeat: 'repeat', backgroundSize: '1400px auto' }}
        />
        <div className="container mx-auto px-6 py-24 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="text-foreground space-y-6">
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                Campaigns for Dancers
              </h1>
              <p className="text-xl lg:text-2xl text-muted-foreground leading-relaxed">
                Are you a dancer that wants to earn<br />
                doing what you love?
              </p>

              <Link to="/dancer/apply" className="mt-4 inline-block">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-12 py-6 text-lg rounded-full">
                  APPLY NOW
                </Button>
              </Link>
            </div>

            {/* Right Content - Overlapping Photo Cards */}
            <div className="flex justify-center lg:justify-end overflow-visible">
              <div className="relative w-[320px] h-[420px] lg:w-[650px] lg:h-[780px]">
                {/* Card 3 - Back left */}
                <div className="absolute left-0 top-[40px] lg:top-[78px] w-[154px] h-[205px] lg:w-[312px] lg:h-[416px] drop-shadow-xl rotate-[-3deg] z-10">
                  <img src={heroDancer3} alt="Dancers performing" className="w-full h-full object-contain" />
                </div>
                {/* Card 1 - Top right */}
                <div className="absolute right-0 top-0 w-[154px] h-[205px] lg:w-[312px] lg:h-[416px] drop-shadow-xl rotate-[3deg] z-20">
                  <img src={heroDancer1} alt="Dancer posing" className="w-full h-full object-contain" />
                </div>
                {/* Card 2 - Front center (Video) */}
                <div className="absolute left-[52px] lg:left-[104px] top-[115px] lg:top-[234px] w-[180px] h-[256px] lg:w-[364px] lg:h-[520px] drop-shadow-2xl rotate-[-1deg] z-30 rounded-[2rem] overflow-hidden border-4 border-white shadow-2xl">
                  <video src={heroVideo} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="bg-black text-white py-24">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="flex justify-center mb-8">
              <iframe 
                width="672" 
                height="378" 
                src="https://www.youtube.com/embed/4AIpNR9JA3s" 
                title="YouTube video player" 
                frameBorder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
                className="rounded-lg shadow-2xl max-w-full"
              />
            </div>
            
            <h2 className="text-4xl lg:text-5xl font-bold mb-8">About Dance-Verse</h2>
            
            <div className="space-y-6 text-lg lg:text-xl leading-relaxed">
              <p>
                Welcome to the new era of dance — where your moves don't just inspire, they earn.
              </p>
              <p>
                We're building a platform that empowers dancers to turn their creativity and influence into real income. By joining our community, you'll get exclusive access to paid campaigns from major label music artists, brands, and entertainment companies — all looking for dancers like you to bring their projects to life through movement.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Artist Promotion Section */}
      <section className="bg-background text-foreground py-24 overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left — visual */}
            <div className="relative">
              <div className="absolute -inset-8 bg-primary/5 rounded-3xl blur-3xl" />
              <img src={rhythmVisual} alt="Music promotion" className="relative rounded-2xl shadow-2xl w-full" />
            </div>

            {/* Right — copy */}
            <div className="space-y-6">
              <span className="inline-block text-sm font-semibold tracking-widest uppercase text-primary">For Artists & Labels</span>
              <h3 className="text-3xl lg:text-4xl font-bold leading-tight">
                Your next hit deserves<br />a dance movement.
              </h3>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Get your music in front of thousands of dancers who create viral content on TikTok, Instagram, and YouTube. We handle the campaign, the creators, and the reporting — you just drop the track.
              </p>
              <ul className="space-y-3 text-base">
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <span>Access a vetted network of dance creators ready to move</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <span>Full campaign analytics — views, likes, shares & reach</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <span>Flexible packages from indie artists to major label rollouts</span>
                </li>
              </ul>
              <Link to="/promote">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-12 py-6 text-lg rounded-full mt-4">
                  PROMOTE YOUR MUSIC
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* We Work With The Best — Scrolling Logos */}
      <section className="bg-black text-white py-12 lg:py-16 overflow-hidden">
        <div className="text-center mb-8">
          <h3 className="text-3xl font-bold">We work with the best</h3>
        </div>
        <div className="relative w-full">
          {/* Fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-black to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-black to-transparent z-10" />
          {/* Scrolling track — duplicate logos for seamless loop */}
          <div className="flex w-max animate-[marquee_20s_linear_infinite] gap-16 items-center">
            {[labelUniversal, labelHybe, labelHitco, labelWarner, labelSony, labelEmpire,
              labelUniversal, labelHybe, labelHitco, labelWarner, labelSony, labelEmpire].map((src, i) => (
              <img key={i} src={src} alt="Label partner" className="h-10 lg:h-12 w-auto object-contain opacity-80 hover:opacity-100 transition-opacity" />
            ))}
          </div>
        </div>
      </section>



      {/* Footer */}
      <footer className="bg-black text-white py-16">
        <div className="container mx-auto px-6">
          
          <div className="border-t border-white/20 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm opacity-70">
            <div className="flex gap-8">
              <a href="#" className="hover:opacity-100 transition-opacity py-2 px-3">Contact Us</a>
              <a href="#" className="hover:opacity-100 transition-opacity py-2 px-3">Terms & Support</a>
              <a href="#" className="hover:opacity-100 transition-opacity py-2 px-3">Privacy Policy</a>
            </div>
            <p>&copy; {new Date().getFullYear()} Dance-Verse. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>;
};
export default Index;