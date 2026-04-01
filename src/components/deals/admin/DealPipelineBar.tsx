import { cn } from "@/lib/utils";

interface Stage {
  key: string;
  label: string;
  count: number;
  color: string;
}

interface Props {
  stages: Stage[];
  active: string | null;
  onSelect: (key: string | null) => void;
}

export default function DealPipelineBar({ stages, active, onSelect }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
      {stages.map((s) => (
        <button
          key={s.key}
          onClick={() => onSelect(active === s.key ? null : s.key)}
          className={cn(
            "relative rounded-lg border p-4 text-left transition-all hover:shadow-md",
            active === s.key
              ? "ring-2 ring-primary border-primary bg-primary/5"
              : "bg-card hover:border-primary/40"
          )}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className={cn("h-2.5 w-2.5 rounded-full", s.color)} />
            <span className="text-2xl font-bold">{s.count}</span>
          </div>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {s.label}
          </span>
        </button>
      ))}
    </div>
  );
}
