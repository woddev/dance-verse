import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";
import danceVerseLogo from "@/assets/dance-verse-logo-new.png";
import danceVerseLogoHeader from "@/assets/dance-verse-logo-white.png";
import heroPhone from "@/assets/hero-dancer.png";
import rhythmVisual from "@/assets/rhythm-visual-new.png";
import analyticsPhone from "@/assets/analytics-phone.jpg";
import labelUniversal from "@/assets/label-universal-2.png";
import labelHybe from "@/assets/label-hybe-2.png";
import labelHitco from "@/assets/label-hitco-2.png";
import labelWarner from "@/assets/label-warner-2.png";
import labelSony from "@/assets/label-sony-2.png";
import labelEmpire from "@/assets/label-empire-2.png";

const Index = () => {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <img src={danceVerseLogoHeader} alt="Dance-Verse" className="h-8 w-auto" />
          </div>
          <div className="flex gap-8 items-center">
            <a href="/" className="text-sm font-medium hover:text-secondary transition-colors">Home</a>
            <a href="/campaign" className="text-sm font-medium hover:text-secondary transition-colors">Campaign Page</a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="relative min-h-screen flex items-center overflow-hidden">
        {/* Black Background */}
        <div className="absolute inset-0 bg-black" />
        
        <div className="container mx-auto px-6 py-24 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="text-white space-y-8">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-6">
                  <Globe className="h-8 w-8 text-white" />
                  <span className="text-sm tracking-widest opacity-90">KEEP MAKING MOVES</span>
                </div>
                <div>
                  <img src={danceVerseLogo} alt="Dance-Verse" className="h-32 w-auto" />
                </div>
              </div>

              <div className="space-y-4">
                <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                  Campaigns for Dancers
                </h1>
                <p className="text-xl lg:text-2xl opacity-90">
                  Are you a dancer that wants to earn<br />
                  doing what you love?
                </p>
              </div>

              <Button 
                size="lg" 
                className="bg-black hover:bg-black/80 text-white px-12 py-6 text-lg rounded-full"
              >
                APPLY NOW
              </Button>
            </div>

            {/* Right Content - Phone Mockup */}
            <div className="flex justify-center lg:justify-end">
              <div className="relative animate-fade-in">
                {/* Phone Frame */}
                <div className="relative w-[320px] h-[640px] bg-black rounded-[3rem] p-3 shadow-2xl">
                  <div className="w-full h-full rounded-[2.5rem] overflow-hidden">
                    <img 
                      src={heroPhone} 
                      alt="Dancer in colorful outfit" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {/* Notch */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-black rounded-b-3xl" />
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
            <p className="text-sm tracking-widest opacity-70">keep making moves</p>
            
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
              <img 
                src={rhythmVisual} 
                alt="Rhythm visualization" 
                className="rounded-2xl shadow-2xl w-full"
              />
            </div>
            <div className="space-y-6">
              <h3 className="text-3xl lg:text-4xl font-bold">What's dance without rhythm?</h3>
              <p className="text-lg opacity-80">
                Get early access to tracks, create your choreography, and share it to earn.
              </p>
              <h4 className="text-2xl font-bold pt-4">Beyond music</h4>
              <p className="text-lg opacity-80">
                you'll also join special projects — from movie and game launches to fashion and lifestyle collabs — expanding your reach and creativity.
              </p>
              <p className="text-xl font-semibold pt-4">
                Your time to get paid doing what you love.
              </p>
              <p className="text-lg">
                Join the movement. Let's make dance work for you.
              </p>
              <Button 
                size="lg" 
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-12 py-6 text-lg rounded-full mt-6"
              >
                APPLY NOW
              </Button>
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
              <img src={labelUniversal} alt="Universal Music" className="h-12 w-auto object-contain animate-fade-in" style={{ animationDelay: '0.1s', animationFillMode: 'backwards' }} />
              <img src={labelHybe} alt="Hybe" className="h-12 w-auto object-contain animate-fade-in" style={{ animationDelay: '0.2s', animationFillMode: 'backwards' }} />
              <img src={labelHitco} alt="Hitco" className="h-12 w-auto object-contain animate-fade-in" style={{ animationDelay: '0.3s', animationFillMode: 'backwards' }} />
              <img src={labelWarner} alt="Warner Music" className="h-12 w-auto object-contain animate-fade-in" style={{ animationDelay: '0.4s', animationFillMode: 'backwards' }} />
              <img src={labelSony} alt="Sony Music" className="h-12 w-auto object-contain animate-fade-in" style={{ animationDelay: '0.5s', animationFillMode: 'backwards' }} />
              <img src={labelEmpire} alt="Empire" className="h-12 w-auto object-contain animate-fade-in" style={{ animationDelay: '0.6s', animationFillMode: 'backwards' }} />
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
                  Automatically track all influencer posts, across social networks. Measure key metrics and generate reports in seconds.
                </p>
                <p>
                  Focus on building relationships with creators, not spreadsheets.
                </p>
              </div>
            </div>
            <div className="flex justify-center animate-fade-in">
              <img 
                src={analyticsPhone} 
                alt="Analytics dashboard" 
                className="rounded-2xl shadow-2xl max-w-md w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-white py-16">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-12 mb-12">
            <div>
              <h4 className="text-sm tracking-widest mb-4 opacity-70">social</h4>
            </div>
            <div>
              <h4 className="text-sm tracking-widest mb-4 opacity-70">Phone</h4>
              <p className="text-lg">(123) 456-7890</p>
            </div>
            <div>
              <h4 className="text-sm tracking-widest mb-4 opacity-70">Email</h4>
              <p className="text-lg">hello@dance-verse.com</p>
            </div>
          </div>
          
          <div className="border-t border-white/20 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm opacity-70">
            <div className="flex gap-8">
              <a href="#" className="hover:opacity-100 transition-opacity">Contact Us</a>
              <a href="#" className="hover:opacity-100 transition-opacity">Terms & Support</a>
              <a href="#" className="hover:opacity-100 transition-opacity">Privacy Policy</a>
            </div>
            <p>&copy; {new Date().getFullYear()} Dance-Verse. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
