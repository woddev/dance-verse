import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Music, Send, DollarSign, ArrowRight } from "lucide-react";

const steps = [
  { icon: Send, title: "Apply", desc: "Fill out a quick application with your info and portfolio links." },
  { icon: Music, title: "Submit Tracks", desc: "Once approved, upload your beats and music for review by our A&R team." },
  { icon: DollarSign, title: "Get Deals & Earn", desc: "Receive offers — buyout, revenue split, or recoupment — and start earning." },
];

const dealTypes = [
  { name: "Buyout", desc: "One-time payment for full rights to the track. Simple, upfront cash." },
  { name: "Revenue Split", desc: "Ongoing royalty share from campaign performance. Earn as your music grows." },
  { name: "Recoupment", desc: "Upfront buyout plus a marketing budget that recoups before your revenue split kicks in." },
];

export default function ProducerLanding() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-20 bg-background">
        <div className="container mx-auto px-6 text-center max-w-3xl space-y-6">
          <h1 className="text-5xl lg:text-6xl font-bold tracking-tight">
            Submit Your Beats.<br />Get Paid.
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Dance-Verse connects producers with major campaigns. Upload your music, land deals, and earn — all from one platform.
          </p>
          <Link to="/producer/apply">
            <Button size="lg" className="px-12 py-6 text-lg rounded-full mt-4">
              APPLY AS A PRODUCER <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-muted">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl lg:text-4xl font-bold text-center mb-16">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {steps.map((step, i) => (
              <div key={i} className="bg-background rounded-xl p-8 text-center space-y-4 border border-border">
                <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-primary text-primary-foreground mx-auto">
                  <step.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold">{step.title}</h3>
                <p className="text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Deal Types */}
      <section className="py-20 bg-foreground text-background">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl lg:text-4xl font-bold text-center mb-16">Deal Types</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {dealTypes.map((deal, i) => (
              <div key={i} className="border border-background/20 rounded-xl p-8 space-y-3">
                <h3 className="text-xl font-bold">{deal.name}</h3>
                <p className="opacity-80">{deal.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-6 text-center space-y-6">
          <h2 className="text-3xl lg:text-4xl font-bold">Ready to get started?</h2>
          <p className="text-lg text-muted-foreground">Join the Dance-Verse producer network today.</p>
          <Link to="/producer/apply">
            <Button size="lg" className="px-12 py-6 text-lg rounded-full">
              APPLY NOW
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
