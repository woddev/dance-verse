import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import aboutLogo from "@/assets/dv-wod-logo.png";
import heroDancer1 from "@/assets/hero-dancer-1.png";
import heroDancer2 from "@/assets/hero-dancer-2.png";
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
            <div className="flex justify-center lg:justify-end">
              <div className="relative w-[500px] h-[600px]">
                {/* Card 3 - Back left */}
                <div className="absolute left-0 top-[60px] w-[240px] h-[320px] drop-shadow-xl rotate-[-3deg] z-10">
                  <img src={heroDancer3} alt="Dancers performing" className="w-full h-full object-contain" />
                </div>
                {/* Card 1 - Top right */}
                <div className="absolute right-0 top-0 w-[240px] h-[320px] drop-shadow-xl rotate-[3deg] z-20">
                  <img src={heroDancer1} alt="Dancer posing" className="w-full h-full object-contain" />
                </div>
                {/* Card 2 - Front center */}
                <div className="absolute left-[80px] top-[180px] w-[280px] h-[400px] drop-shadow-2xl rotate-[-1deg] z-30">
                  <img src={heroDancer2} alt="Dancer in costume" className="w-full h-full object-contain" />
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

      {/* Features Section */}
      <section className="bg-background text-foreground py-24">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="animate-scale-in">
              <img src={rhythmVisual} alt="Rhythm visualization" className="rounded-2xl shadow-2xl w-full" />
            </div>
            <div className="space-y-6">
              <h3 className="text-3xl lg:text-4xl font-bold">What's dance without rhythm?</h3>
              <p className="text-lg opacity-80">
                Get early access to tracks, create your choreography, and share it to earn.
              </p>
              <p className="text-xl font-semibold pt-4">
                Your time to get paid doing what you love.
              </p>
              <p className="text-lg">
                Join the movement. Let's make dance work for you.
              </p>
              <Link to="/dancer/apply">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-12 py-6 text-lg rounded-full mt-6">
                  APPLY NOW
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Access to new releases Section */}
      <section className="bg-black text-white py-24">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold mb-12">Access to new releases</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 items-center justify-items-center max-w-6xl mx-auto">
              <img src={labelUniversal} alt="Universal Music" className="h-12 w-auto object-contain animate-fade-in" style={{
              animationDelay: '0.1s',
              animationFillMode: 'backwards'
            }} />
              <img src={labelHybe} alt="Hybe" className="h-12 w-auto object-contain animate-fade-in" style={{
              animationDelay: '0.2s',
              animationFillMode: 'backwards'
            }} />
              <img src={labelHitco} alt="Hitco" className="h-12 w-auto object-contain animate-fade-in" style={{
              animationDelay: '0.3s',
              animationFillMode: 'backwards'
            }} />
              <img src={labelWarner} alt="Warner Music" className="h-12 w-auto object-contain animate-fade-in" style={{
              animationDelay: '0.4s',
              animationFillMode: 'backwards'
            }} />
              <img src={labelSony} alt="Sony Music" className="h-12 w-auto object-contain animate-fade-in" style={{
              animationDelay: '0.5s',
              animationFillMode: 'backwards'
            }} />
              <img src={labelEmpire} alt="Empire" className="h-12 w-auto object-contain animate-fade-in" style={{
              animationDelay: '0.6s',
              animationFillMode: 'backwards'
            }} />
            </div>
          </div>
        </div>
      </section>

      {/* Get in Touch Section */}
      <section className="bg-black text-white py-24">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <h2 className="text-4xl lg:text-5xl font-bold">Get in touch</h2>
              <h3 className="text-3xl lg:text-4xl font-bold">
                Looking to promote<br />your music?
              </h3>
              <div className="space-y-4 text-lg">
                <p>
                  Key metrics are measured and reports generated.
                </p>
              <p>
                  Focus on building relationships with creators, not spreadsheets.
                </p>
              </div>
              <Link to="/inquire">
                <Button size="lg" className="bg-white hover:bg-white/90 text-black px-12 py-6 text-lg rounded-full mt-4">
                  GET STARTED
                </Button>
              </Link>
            </div>
            <div className="flex justify-center animate-fade-in">
              <img src={analyticsPhone} alt="Analytics dashboard" className="rounded-2xl shadow-2xl max-w-md w-full" />
            </div>
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