import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Download, Music, Instagram, AlertCircle, CheckCircle2 } from "lucide-react";
import danceVerseLogo from "@/assets/dv-blk-logo.png";
import albumHustlin from "@/assets/album-hustlin.jpg";
import album1 from "@/assets/album-1.jpg";
import album2 from "@/assets/album-2.jpg";
import album3 from "@/assets/album-3.jpg";
import album4 from "@/assets/album-4.jpg";

const CampaignPage = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <img src={danceVerseLogo} alt="Dance-Verse" className="h-8 w-auto" />
          </div>
          <div className="flex gap-8 items-center">
            <a href="/" className="text-sm font-medium hover:text-secondary transition-colors">Home</a>
            <a href="/campaign" className="text-sm font-medium hover:text-secondary transition-colors">Campaign Page</a>
          </div>
        </div>
      </nav>

      <div className="pt-24 pb-16">
        <div className="container mx-auto px-6">
          {/* Hero Section */}
          <div className="grid lg:grid-cols-3 gap-12 mb-16">
            {/* Album Cover */}
            <div className="lg:col-span-1">
              <img 
                src={albumHustlin} 
                alt="hustlin album cover" 
                className="w-full aspect-square rounded-2xl shadow-2xl object-cover"
              />
            </div>

            {/* Campaign Info */}
            <div className="lg:col-span-1 space-y-6">
              <div>
                <h1 className="text-4xl lg:text-5xl font-bold mb-2">Staving Artist</h1>
                <p className="text-xl text-muted-foreground mb-4">hustlin - ft. Dave G</p>
                <Badge className="bg-black hover:bg-black/80 text-white px-4 py-2 text-sm">
                  MUSIC CAMPAIGN
                </Badge>
              </div>
            </div>

            {/* Official Links */}
            <div className="lg:col-span-1">
              <h2 className="text-2xl font-bold mb-6">Official Links</h2>
              <div className="space-y-3">
                <Button className="w-full bg-black hover:bg-black/80 text-white justify-start text-base py-6">
                  <Download className="mr-3 h-5 w-5" />
                  DOWNLOAD MUSIC
                </Button>
                <Button className="w-full bg-black hover:bg-black/80 text-white justify-start text-base py-6">
                  <Music className="mr-3 h-5 w-5" />
                  TIK TOK SOUND
                </Button>
                <Button className="w-full bg-black hover:bg-black/80 text-white justify-start text-base py-6">
                  <Instagram className="mr-3 h-5 w-5" />
                  INSTAGRAM SOUND
                </Button>
              </div>
            </div>
          </div>

          {/* Requirements Section */}
          <Card className="p-8 mb-16 bg-muted/30">
            <h2 className="text-3xl font-bold mb-2">Requirements</h2>
            <p className="text-xl text-secondary mb-8">Campaign Details</p>

            <div className="grid md:grid-cols-2 gap-12">
              {/* Post Your Video On */}
              <div>
                <h3 className="text-xl font-semibold mb-4">Post your video on</h3>
                <ul className="space-y-2 text-lg">
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-secondary rounded-full"></span>
                    tiktok
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-secondary rounded-full"></span>
                    instagram
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-secondary rounded-full"></span>
                    youtube
                  </li>
                </ul>
              </div>

              {/* Required Hashtags & Mentions */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-4">Required Hashtags</h3>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-base px-3 py-1">#SunsetDreamsChallenge</Badge>
                    <Badge variant="outline" className="text-base px-3 py-1">#LunaParkMusic</Badge>
                    <Badge variant="outline" className="text-base px-3 py-1">#SummerVibes2025</Badge>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-4">Required Mentions</h3>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-base px-3 py-1">@lunapark</Badge>
                    <Badge variant="outline" className="text-base px-3 py-1">@universalmusic</Badge>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Compensation & Status Section */}
          <div className="grid lg:grid-cols-2 gap-12 mb-16">
            {/* Compensation */}
            <Card className="p-8">
              <h2 className="text-3xl font-bold mb-8">Compensation</h2>
              <p className="text-lg mb-6">Pay Scale : <span className="font-semibold">$10 - $80 USD</span></p>
              
              <div className="space-y-6">
                <div className="flex justify-between items-center pb-4 border-b border-border">
                  <span className="text-lg font-semibold">1000 VIEWS</span>
                  <span className="text-2xl font-bold text-secondary">$10</span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-border">
                  <span className="text-lg font-semibold">5000 VIEWS</span>
                  <span className="text-2xl font-bold text-secondary">$20</span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-border">
                  <span className="text-lg font-semibold">10000 VIEWS</span>
                  <span className="text-2xl font-bold text-secondary">$50</span>
                </div>
              </div>
            </Card>

            {/* Status */}
            <Card className="p-8">
              <h2 className="text-3xl font-bold mb-8">Your Status</h2>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4 p-4 bg-destructive/10 rounded-lg border border-destructive/30">
                  <AlertCircle className="h-6 w-6 text-destructive flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-semibold text-destructive mb-1">Video not accepted</p>
                    <p className="text-sm text-muted-foreground">Not using the right song</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-green-500/10 rounded-lg border border-green-500/30">
                  <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-semibold text-green-600">Video Approved</p>
                  </div>
                </div>

                <Button size="lg" className="w-full bg-black hover:bg-black/80 text-white text-lg py-6 mt-8">
                  Submit video
                </Button>
              </div>
            </Card>
          </div>

          {/* More Campaigns */}
          <div>
            <h2 className="text-3xl font-bold mb-8">More Campaigns</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[album1, album2, album3, album4].map((album, idx) => (
                <div key={idx} className="group cursor-pointer">
                  <div className="relative aspect-square rounded-xl overflow-hidden shadow-lg transition-transform group-hover:scale-105">
                    <img 
                      src={album} 
                      alt={`Album ${idx + 1}`} 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white font-semibold text-lg">View Campaign</span>
                    </div>
                  </div>
                  <p className="mt-3 text-center font-medium">album</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-black text-white py-12 mt-16">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-center items-center gap-8 text-sm opacity-70">
            <a href="#" className="hover:opacity-100 transition-opacity">Terms & Support</a>
            <a href="#" className="hover:opacity-100 transition-opacity">Privacy Policy</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default CampaignPage;
