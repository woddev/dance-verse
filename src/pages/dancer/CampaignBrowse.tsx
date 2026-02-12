import DashboardLayout from "@/components/layout/DashboardLayout";

export default function CampaignBrowse() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Browse Campaigns</h1>
        <p className="text-muted-foreground">Find campaigns that match your style and start earning.</p>
        {/* TODO: Campaign grid with filters */}
      </div>
    </DashboardLayout>
  );
}
