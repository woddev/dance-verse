import DashboardLayout from "@/components/layout/DashboardLayout";

export default function MySubmissions() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">My Submissions</h1>
        <p className="text-muted-foreground">Track your video submissions and their review status.</p>
        {/* TODO: Submissions list with status badges */}
      </div>
    </DashboardLayout>
  );
}
