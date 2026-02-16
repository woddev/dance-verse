import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, MousePointerClick, Download, Video, Upload, CheckCircle, DollarSign } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const steps = [
  {
    number: 1,
    icon: Search,
    title: "Browse Campaigns",
    description: "Explore available campaigns from major music artists and brands. Find opportunities that match your style and audience.",
    visual: "grid of campaigns"
  },
  {
    number: 2,
    icon: MousePointerClick,
    title: "Choose Your Campaign",
    description: "Select a campaign that resonates with you. Review compensation details, requirements, and deadlines before committing.",
    details: ["Compensation range", "Platform requirements", "Submission deadline"]
  },
  {
    number: 3,
    icon: Download,
    title: "Get the Official Sound",
    description: "Download the official track or save the sound directly on TikTok/Instagram to ensure you're using the correct audio.",
    platforms: ["TikTok", "Instagram", "YouTube"]
  },
  {
    number: 4,
    icon: Video,
    title: "Create Your Video",
    description: "Choreograph and film your dance using the campaign's music. Let your creativity shine!",
    requirements: [
      "Use the official sound",
      "Include required hashtags",
      "Tag required accounts (@artist, @label)",
      "Post to specified platforms"
    ]
  },
  {
    number: 5,
    icon: Upload,
    title: "Submit Your Video",
    description: "Share your video link with us for review. Make sure you've followed all campaign requirements.",
    note: "Double-check hashtags and mentions"
  },
  {
    number: 6,
    icon: CheckCircle,
    title: "Get Approved",
    description: "Our team reviews your submission within 24-48 hours. You'll be notified of approval status via email.",
    statuses: ["Under Review", "Approved", "Needs Revision"]
  },
  {
    number: 7,
    icon: DollarSign,
    title: "Earn Money",
    description: "Post your dance video on social media and get paid. It's that simple.",
    payScale: [
      { pay: "$10" },
      { pay: "$20" },
      { pay: "$50" },
      { pay: "$80" }
    ]
  }
];

const HowItWorks = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-32 pb-16 bg-black text-white">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <h1 className="text-5xl lg:text-6xl font-bold">How to Get Started</h1>
            <p className="text-xl lg:text-2xl opacity-80">
              Your step-by-step guide to earning money through dance
            </p>
          </div>
        </div>
      </section>

      {/* Steps Section */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto space-y-12">
            {steps.map((step, index) => (
              <Card 
                key={step.number} 
                className="overflow-hidden animate-fade-in hover:shadow-xl transition-shadow"
                style={{
                  animationDelay: `${index * 0.1}s`,
                  animationFillMode: 'backwards'
                }}
              >
                <CardContent className="p-8">
                  <div className="grid md:grid-cols-[auto_1fr] gap-8 items-start">
                    {/* Step Number & Icon */}
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-20 h-20 bg-black text-white rounded-full flex items-center justify-center text-3xl font-bold">
                        {step.number}
                      </div>
                      <step.icon className="w-12 h-12 text-secondary" />
                    </div>

                    {/* Content */}
                    <div className="space-y-4">
                      <h3 className="text-2xl lg:text-3xl font-bold">{step.title}</h3>
                      <p className="text-lg text-muted-foreground leading-relaxed">
                        {step.description}
                      </p>

                      {/* Additional Details */}
                      {step.details && (
                        <ul className="space-y-2 mt-4">
                          {step.details.map((detail, idx) => (
                            <li key={idx} className="flex items-center gap-2 text-base">
                              <span className="w-2 h-2 bg-secondary rounded-full"></span>
                              {detail}
                            </li>
                          ))}
                        </ul>
                      )}

                      {step.platforms && (
                        <div className="flex flex-wrap gap-2 mt-4">
                          {step.platforms.map((platform, idx) => (
                            <span 
                              key={idx} 
                              className="px-4 py-2 bg-muted rounded-full text-sm font-medium"
                            >
                              {platform}
                            </span>
                          ))}
                        </div>
                      )}

                      {step.requirements && (
                        <ul className="space-y-2 mt-4">
                          {step.requirements.map((req, idx) => (
                            <li key={idx} className="flex items-center gap-2 text-base">
                              <CheckCircle className="w-5 h-5 text-green-600" />
                              {req}
                            </li>
                          ))}
                        </ul>
                      )}

                      {step.note && (
                        <p className="text-sm text-secondary italic mt-2">
                          💡 {step.note}
                        </p>
                      )}

                      {step.statuses && (
                        <div className="flex flex-wrap gap-3 mt-4">
                          {step.statuses.map((status, idx) => (
                            <span 
                              key={idx} 
                              className="px-4 py-2 border border-border rounded-lg text-sm"
                            >
                              {status}
                            </span>
                          ))}
                        </div>
                      )}

                      {step.payScale && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                          {step.payScale.map((scale, idx) => (
                            <div 
                              key={idx} 
                              className="text-center p-4 bg-muted rounded-lg"
                            >
                              <p className="text-2xl font-bold text-secondary">{scale.pay}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-black text-white">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <h2 className="text-4xl lg:text-5xl font-bold">Ready to Get Started?</h2>
            <p className="text-xl opacity-80">
              Join hundreds of dancers already earning money doing what they love
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/campaigns">
                <Button 
                  size="lg" 
                  className="bg-white hover:bg-white/90 text-black px-12 py-6 text-lg rounded-full"
                >
                  Browse Campaigns
                </Button>
              </Link>
              <Link to="/dancer/apply">
                <Button 
                  size="lg" 
                  variant="outline"
                  className="border-white text-white hover:bg-white hover:text-black px-12 py-6 text-lg rounded-full"
                >
                  Apply Now
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default HowItWorks;
