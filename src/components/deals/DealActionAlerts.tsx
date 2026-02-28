import { Link } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FileText, FileCheck, Music, DollarSign, ArrowRight, CheckCircle2 } from "lucide-react";

interface ProducerCounts {
  pending_offers: number;
  contracts_to_sign: number;
  fully_executed: number;
}

interface AdminCounts {
  tracks_submitted: number;
  counter_offers_received: number;
  contracts_awaiting_countersign: number;
  pending_payout_liability: number;
}

interface Props {
  role: "producer" | "admin";
  counts: ProducerCounts | AdminCounts;
}

export default function DealActionAlerts({ role, counts }: Props) {
  const alerts: { show: boolean; icon: React.ElementType; title: string; desc: string; to: string; variant?: "default" | "destructive" }[] = [];

  if (role === "producer") {
    const c = counts as ProducerCounts;
    if (c.pending_offers > 0) {
      alerts.push({
        show: true,
        icon: FileText,
        title: "New Offers",
        desc: `You have ${c.pending_offers} offer(s) waiting for your review.`,
        to: "/producer/offers",
      });
    }
    if (c.contracts_to_sign > 0) {
      alerts.push({
        show: true,
        icon: FileCheck,
        title: "Contracts Ready",
        desc: `You have ${c.contracts_to_sign} contract(s) ready for your signature.`,
        to: "/producer/contracts",
      });
    }
    if (c.fully_executed > 0) {
      alerts.push({
        show: true,
        icon: CheckCircle2,
        title: "Deals Finalized",
        desc: `${c.fully_executed} contract(s) fully executed — your deal is live!`,
        to: "/producer/contracts",
      });
    }
  } else {
    const c = counts as AdminCounts;
    if ((c.tracks_submitted ?? 0) > 0) {
      alerts.push({
        show: true,
        icon: Music,
        title: "Submissions Pending",
        desc: `${c.tracks_submitted} new track submission(s) pending review.`,
        to: "/admin/deals?tab=tracks",
      });
    }
    if ((c.counter_offers_received ?? 0) > 0) {
      alerts.push({
        show: true,
        icon: FileText,
        title: "Counter-Offers",
        desc: `${c.counter_offers_received} counter-offer(s) received from producers.`,
        to: "/admin/deals?tab=offers",
      });
    }
    if ((c.contracts_awaiting_countersign ?? 0) > 0) {
      alerts.push({
        show: true,
        icon: FileCheck,
        title: "Awaiting Countersign",
        desc: `${c.contracts_awaiting_countersign} contract(s) awaiting admin countersign.`,
        to: "/admin/deals?tab=contracts",
        variant: "destructive",
      });
    }
  }

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-3">
      {alerts.map((a, i) => (
        <Link key={i} to={a.to} className="block">
          <Alert variant={a.variant ?? "default"} className="cursor-pointer hover:bg-muted/50 transition-colors">
            <a.icon className="h-4 w-4" />
            <AlertTitle className="flex items-center gap-2">
              {a.title}
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
            </AlertTitle>
            <AlertDescription>{a.desc}</AlertDescription>
          </Alert>
        </Link>
      ))}
    </div>
  );
}
