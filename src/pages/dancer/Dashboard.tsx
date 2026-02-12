import DashboardLayout from "@/components/layout/DashboardLayout";

export default function DancerDashboard() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to your dancer dashboard. Browse campaigns and start earning.</p>
        {/* TODO: Active campaigns summary, recent submissions, earnings overview */}
      </div>
    </DashboardLayout>
  );
}
