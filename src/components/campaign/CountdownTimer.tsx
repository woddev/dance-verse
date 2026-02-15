import { useEffect, useState } from "react";
import { differenceInSeconds } from "date-fns";
import { Clock } from "lucide-react";

interface CountdownTimerProps {
  endDate: string;
  className?: string;
  size?: "sm" | "lg";
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export default function CountdownTimer({ endDate, className = "", size = "sm" }: CountdownTimerProps) {
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

  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;

  if (remaining <= 0) {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold bg-muted text-muted-foreground ${className}`}>
        <Clock className="h-3 w-3" />
        Ended
      </span>
    );
  }

  // Compact badge for cards
  if (size === "sm") {
    const label = days > 0
      ? `${days}d ${hours}h ${minutes}m`
      : hours > 0
        ? `${hours}h ${minutes}m ${seconds}s`
        : `${minutes}m ${seconds}s`;

    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold bg-amber-600 text-white ${className}`}>
        <Clock className="h-3 w-3" />
        {label} left
      </span>
    );
  }

  // Large bold countdown for detail page
  const blocks = [
    { value: days, label: "DAYS" },
    { value: hours, label: "HRS" },
    { value: minutes, label: "MIN" },
    { value: seconds, label: "SEC" },
  ];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1">
        {blocks.map((block, idx) => (
          <div key={block.label} className="flex items-center gap-1">
            <div className="flex flex-col items-center bg-foreground text-background rounded-lg px-3 py-2 min-w-[52px]">
              <span className="text-2xl font-black tabular-nums leading-none tracking-tight">
                {pad(block.value)}
              </span>
              <span className="text-[10px] font-bold opacity-60 mt-0.5 tracking-widest">
                {block.label}
              </span>
            </div>
            {idx < blocks.length - 1 && (
              <span className="text-xl font-black text-foreground animate-pulse">:</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
