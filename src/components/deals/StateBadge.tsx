import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const trackColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  under_review: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  denied: "bg-destructive/10 text-destructive",
  offer_pending: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  offer_sent: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  counter_received: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  deal_signed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  expired: "bg-muted text-muted-foreground",
  terminated: "bg-destructive/10 text-destructive",
};

const offerColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  viewed: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  countered: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  revised: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  accepted: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  rejected: "bg-destructive/10 text-destructive",
  expired: "bg-muted text-muted-foreground",
  signed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

const contractColors: Record<string, string> = {
  generated: "bg-muted text-muted-foreground",
  sent_for_signature: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  signed_by_producer: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  signed_by_platform: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  fully_executed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  archived: "bg-muted text-muted-foreground",
};

const payoutColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  processing: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  failed: "bg-destructive/10 text-destructive",
};

type BadgeType = "track" | "offer" | "contract" | "payout";

const allMaps = { ...offerColors, ...contractColors, ...payoutColors };

function guessType(state: string): BadgeType {
  if (state in trackColors && !(state in offerColors)) return "track";
  if (state in offerColors && !(state in trackColors)) return "offer";
  if (state in contractColors) return "contract";
  if (state in payoutColors) return "payout";
  return "track";
}

interface StateBadgeProps {
  state: string;
  type?: BadgeType;
}

export default function StateBadge({ state, type }: StateBadgeProps) {
  const resolvedType = type ?? guessType(state);
  const colorMap = resolvedType === "track" ? trackColors : resolvedType === "offer" ? offerColors : resolvedType === "contract" ? contractColors : payoutColors;
  const color = colorMap[state] ?? "bg-muted text-muted-foreground";
  const label = state.replace(/_/g, " ");

  return (
    <Badge variant="outline" className={cn("capitalize border-0 font-medium", color)}>
      {label}
    </Badge>
  );
}
