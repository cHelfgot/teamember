import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { PROCESS_STATUS_LABELS, PAYMENT_STATUS_LABELS, formatHours, formatCurrency } from "@/lib/format";
import { Users, Clock, AlertCircle, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "לוח בקרה - CRM" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user, role, fullName } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", user?.id, role],
    enabled: !!user,
    queryFn: async () => {
      const clientsQ = supabase.from("clients").select("id,name,owner_id,hourly_rate,payment_status,process_status");
      const logsQ = supabase.from("daily_logs").select("hours,client_id,user_id,log_date");
      const [{ data: clients = [] }, { data: logs = [] }] = await Promise.all([clientsQ, logsQ]);
      return { clients: clients ?? [], logs: logs ?? [] };
    },
  });

  if (isLoading || !data) return <div className="text-muted-foreground">טוען...</div>;

  const totalHours = data.logs.reduce((s, l) => s + Number(l.hours || 0), 0);
  const totalRevenue = data.clients.reduce((sum, c) => {
    const h = data.logs.filter(l => l.client_id === c.id).reduce((s, l) => s + Number(l.hours || 0), 0);
    return sum + h * Number(c.hourly_rate || 0);
  }, 0);
  const dueCount = data.clients.filter(c => c.payment_status === "due").length;

  const byProcess: Record<string, number> = {};
  data.clients.forEach(c => { byProcess[c.process_status] = (byProcess[c.process_status] ?? 0) + 1; });

  return (
    <>
      <PageHeader title={`שלום, ${fullName.split(" ")[0]}`} description="סקירה כללית של הפעילות שלך" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={<Users />} label="לקוחות" value={data.clients.length.toString()} tone="primary" />
        <StatCard icon={<Clock />} label="סה״כ שעות" value={formatHours(totalHours)} tone="accent" />
        <StatCard icon={<TrendingUp />} label="הכנסה צבורה" value={formatCurrency(totalRevenue)} tone="primary" />
        <StatCard icon={<AlertCircle />} label="ממתינים לתשלום" value={dueCount.toString()} tone="warn" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-6">
          <h2 className="font-semibold mb-4">פילוח לפי שלב תהליך</h2>
          <div className="space-y-2">
            {Object.entries(PROCESS_STATUS_LABELS).map(([k, label]) => (
              <div key={k} className="flex items-center justify-between text-sm">
                <span>{label}</span>
                <Badge variant="secondary">{byProcess[k] ?? 0}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-semibold mb-4">סטטוס תשלומים</h2>
          <div className="space-y-2">
            {Object.entries(PAYMENT_STATUS_LABELS).map(([k, label]) => {
              const count = data.clients.filter(c => c.payment_status === k).length;
              return (
                <div key={k} className="flex items-center justify-between text-sm">
                  <span>{label}</span>
                  <Badge variant={k === "due" ? "destructive" : k === "paid" ? "default" : "secondary"}>{count}</Badge>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </>
  );
}

function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: "primary" | "accent" | "warn" }) {
  const bg = tone === "primary" ? "gradient-primary" : tone === "accent" ? "bg-accent" : "bg-destructive/10";
  const fg = tone === "warn" ? "text-destructive" : "text-primary-foreground";
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${bg} ${fg}`}>{icon}</div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-xl font-bold">{value}</div>
        </div>
      </div>
    </Card>
  );
}
