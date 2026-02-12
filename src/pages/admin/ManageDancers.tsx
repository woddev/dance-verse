import { useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useAdminApi } from "@/hooks/useAdminApi";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Users, Instagram, AtSign } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Dancer {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  instagram_handle: string | null;
  tiktok_handle: string | null;
  bio: string | null;
  stripe_onboarded: boolean;
  created_at: string;
}

export default function ManageDancers() {
  const { callAdmin } = useAdminApi();
  const { toast } = useToast();
  const [dancers, setDancers] = useState<Dancer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await callAdmin("dancers");
        setDancers(data);
      } catch (err: any) {
        toast({ title: "Error loading dancers", description: err.message, variant: "destructive" });
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Dancers</h1>
          <Badge variant="secondary" className="text-sm">{dancers.length} total</Badge>
        </div>

        {dancers.length === 0 ? (
          <p className="text-muted-foreground text-sm">No dancers have signed up yet.</p>
        ) : (
          <div className="space-y-2">
            {dancers.map((dancer) => (
              <Card key={dancer.id} className="border border-border">
                <CardContent className="p-4 flex items-center gap-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={dancer.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-muted text-muted-foreground">
                      {(dancer.full_name ?? "?")[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{dancer.full_name || "Unnamed"}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {dancer.instagram_handle && (
                        <span className="flex items-center gap-1">
                          <Instagram className="h-3 w-3" /> @{dancer.instagram_handle}
                        </span>
                      )}
                      {dancer.tiktok_handle && (
                        <span className="flex items-center gap-1">
                          <AtSign className="h-3 w-3" /> {dancer.tiktok_handle}
                        </span>
                      )}
                    </div>
                    {dancer.bio && <p className="text-xs text-muted-foreground mt-1 truncate">{dancer.bio}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={dancer.stripe_onboarded ? "default" : "secondary"}>
                      {dancer.stripe_onboarded ? "Stripe Connected" : "No Stripe"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Joined {new Date(dancer.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
