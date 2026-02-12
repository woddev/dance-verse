import DashboardLayout from "@/components/layout/DashboardLayout";

export default function DancerSettings() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your profile and payment settings.</p>
        {/* TODO: Profile form + Stripe onboarding */}
      </div>
    </DashboardLayout>
  );
}
