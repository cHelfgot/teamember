import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/PageHeader";
import { formatHours } from "@/lib/format";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/_app/daily-log")({
  head: () => ({ meta: [{ title: "דיווח יומי - CRM" }] }),
  component: DailyLogPage,
});

function DailyLogPage() {
  const { user, role } = useAuth();
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ client_id: "", log_date: today, hours: "", description: "" });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-for-log"],
    enabled: !!user,
    queryFn: async () => (await supabase.from("clients").select("id,name").order("name")).data ?? [],
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["logs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const q = supabase.from("daily_logs").select("*,clients(name)").order("log_date", { ascending: false }).limit(50);
      if (role !== "admin") q.eq("user_id", user!.id);
      return (await q).data ?? [];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("daily_logs").insert({
        user_id: user!.id,
        client_id: form.client_id,
        log_date: form.log_date,
        hours: Number(form.hours),
        description: form.description,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setForm({ ...form, hours: "", description: "" });
      qc.invalidateQueries({ queryKey: ["logs"] });
      qc.invalidateQueries({ queryKey: ["client-logs", form.client_id] });
      qc.invalidateQueries({ queryKey: ["client", form.client_id] });
      toast.success("הדיווח נשמר");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { await supabase.from("daily_logs").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["logs"] }),
  });

  const totalToday = logs.filter(l => l.log_date === today && l.user_id === user?.id).reduce((s, l) => s + Number(l.hours || 0), 0);

  return (
    <>
      <PageHeader title="דיווח יומי" description={`היום דיווחת ${formatHours(totalToday)} שעות`} />

      <Card className="p-6 mb-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <Label>לקוח</Label>
            <Select value={form.client_id} onValueChange={v => setForm({ ...form, client_id: v })}>
              <SelectTrigger><SelectValue placeholder="בחר..." /></SelectTrigger>
              <SelectContent>
                {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>תאריך</Label><Input type="date" value={form.log_date} onChange={e => setForm({ ...form, log_date: e.target.value })} /></div>
          <div><Label>שעות</Label><Input type="number" step="0.25" value={form.hours} onChange={e => setForm({ ...form, hours: e.target.value })} /></div>
          <div className="flex items-end"><Button className="w-full" onClick={() => add.mutate()} disabled={!form.client_id || !form.hours}>הוסף</Button></div>
        </div>
        <div className="mt-3">
          <Label>תיאור</Label>
          <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} placeholder="מה נעשה?" />
        </div>
      </Card>

      <div className="space-y-2">
        {logs.map(l => (
          <Card key={l.id} className="p-3 flex items-center gap-3">
            <div className="text-center w-16">
              <div className="text-xs text-muted-foreground">{new Date(l.log_date).toLocaleDateString("he-IL", { day: "numeric", month: "short" })}</div>
              <div className="font-bold">{formatHours(Number(l.hours))}<span className="text-xs">ש׳</span></div>
            </div>
            <div className="flex-1">
              <div className="font-medium text-sm">{(l as { clients?: { name?: string } }).clients?.name ?? ""}</div>
              {l.description && <div className="text-xs text-muted-foreground truncate">{l.description}</div>}
            </div>
            {(l.user_id === user?.id || role === "admin") && (
              <Button size="icon" variant="ghost" onClick={() => del.mutate(l.id)}><Trash2 className="h-4 w-4" /></Button>
            )}
          </Card>
        ))}
        {logs.length === 0 && <div className="text-center text-muted-foreground py-10">אין דיווחים עדיין</div>}
      </div>
    </>
  );
}
