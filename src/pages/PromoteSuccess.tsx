import { Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

export default function PromoteSuccess() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-28 pb-20 px-4 flex items-center justify-center">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-10 pb-8 space-y-4">
            <CheckCircle className="h-16 w-16 text-primary mx-auto" />
            <h1 className="text-2xl font-black">Payment Successful!</h1>
            <p className="text-muted-foreground">
              Your submission has been received and your payment is confirmed. Our team will review your track and begin setting up your campaign.
            </p>
            <p className="text-sm text-muted-foreground">
              You'll receive a confirmation email with next steps shortly.
            </p>
            <div className="pt-4">
              <Button asChild>
                <Link to="/">Back to Home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
