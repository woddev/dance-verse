import AdminLayout from "@/components/layout/AdminLayout";

export default function AdminDashboard() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Overview of campaigns, submissions, and payouts.</p>
        {/* TODO: Stats cards, recent activity */}
      </div>
    </AdminLayout>
  );
}
