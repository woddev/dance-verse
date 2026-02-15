import { useEffect, useState } from "react";
import { differenceInSeconds } from "date-fns";
import { Clock } from "lucide-react";

interface CountdownTimerProps {
  endDate: string;
  className?: string;
}

function formatRemaining(totalSeconds: number): string {
  if (totalSeconds <= 0) return "Ended";
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

export default function CountdownTimer({ endDate, className = "" }: CountdownTimerProps) {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, differenceInSeconds(new Date(endDate), new Date()))
  );

  useEffect(() => {
    if (remaining <= 0) return;
    const id = setInterval(() => {
      const diff = differenceInSeconds(new Date(endDate), new Date());
      setRemaining(Math.max(0, diff));
      if (diff <= 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [endDate, remaining <= 0]);

  const label = formatRemaining(remaining);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
        remaining > 0
          ? "bg-amber-600 text-white"
          : "bg-muted text-muted-foreground"
      } ${className}`}
    >
      <Clock className="h-3 w-3" />
      {remaining > 0 ? `${label} left` : "Ended"}
    </span>
  );
}
