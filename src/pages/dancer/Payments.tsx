import DashboardLayout from "@/components/layout/DashboardLayout";

export default function DancerPayments() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Payments</h1>
        <p className="text-muted-foreground">View your earnings and payout history.</p>
        {/* TODO: Payment history table */}
      </div>
    </DashboardLayout>
  );
}
