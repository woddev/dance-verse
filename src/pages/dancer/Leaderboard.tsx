import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Trophy, Eye, Video, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type LeaderboardEntry = {
  dancer_id: string;
  full_name: string;
  avatar_url: string;
  approved_submissions: number;
  total_views: number;
};

export default function Leaderboard() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    supabase
      .rpc("get_monthly_leaderboard", { p_year: year, p_month: month })
      .then(({ data: rows, error }) => {
        if (!error && rows) setData(rows as LeaderboardEntry[]);
        setLoading(false);
      });
  }, [month, year]);

  const years = Array.from({ length: 3 }, (_, i) => now.getFullYear() - i);

  const rankStyle = (rank: number) => {
    if (rank === 1) return "bg-yellow-500/15 border-yellow-500/40 text-yellow-700 dark:text-yellow-400";
    if (rank === 2) return "bg-gray-300/20 border-gray-400/40 text-gray-600 dark:text-gray-300";
    if (rank === 3) return "bg-amber-600/15 border-amber-600/40 text-amber-700 dark:text-amber-400";
    return "";
  };

  const rankBadge = (rank: number) => {
    if (rank <= 3) {
      const colors = ["", "text-yellow-500", "text-gray-400", "text-amber-600"];
      return <Trophy className={cn("h-5 w-5", colors[rank])} />;
    }
    return <span className="text-sm font-semibold text-muted-foreground w-5 text-center">{rank}</span>;
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-2xl font-bold tracking-tight">Leaderboard</h1>
          <div className="flex gap-2">
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => (
                  <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Top Performers — {MONTHS[month - 1]} {year}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : data.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">No approved submissions this month.</p>
            ) : (
              <div className="space-y-2">
                {data.map((entry, idx) => {
                  const rank = idx + 1;
                  const isMe = entry.dancer_id === currentUserId;
                  return (
                    <Link
                      key={entry.dancer_id}
                      to={`/creators/${entry.dancer_id}`}
                      className={cn(
                        "flex items-center gap-4 rounded-lg border px-4 py-3 transition-colors hover:bg-muted/50",
                        rankStyle(rank),
                        isMe && "ring-2 ring-primary/50"
                      )}
                    >
                      <div className="flex items-center justify-center w-8">
                        {rankBadge(rank)}
                      </div>
                      <Avatar className="h-9 w-9">
                        {entry.avatar_url ? (
                          <AvatarImage src={entry.avatar_url} alt={entry.full_name || ""} />
                        ) : null}
                        <AvatarFallback className="text-xs">
                          {(entry.full_name || "?").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium flex-1 truncate">
                        {entry.full_name || "Anonymous"}
                        {isMe && <span className="ml-2 text-xs text-primary">(You)</span>}
                      </span>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Video className="h-3.5 w-3.5" />
                          {entry.approved_submissions}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="h-3.5 w-3.5" />
                          {entry.total_views.toLocaleString()}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
