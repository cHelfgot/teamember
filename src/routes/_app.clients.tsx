import { createFileRoute, Link, Outlet, useMatches } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { PageHeader } from "@/components/PageHeader";
import { PROCESS_STATUS_LABELS, PAYMENT_STATUS_LABELS, PROCESS_STATUS_OPTIONS, formatCurrency } from "@/lib/format";
import { toast } from "sonner";
import { Plus, Search, UserCircle } from "lucide-react";

export const Route = createFileRoute("/_app/clients")({
  head: () => ({ meta: [{ title: "לקוחות - CRM" }] }),
  component: ClientsLayout,
});

function ClientsLayout() {
  const matches = useMatches();
  const onChild = matches.some(m => m.routeId === "/_app/clients/$id");
  if (onChild) return <Outlet />;
  return <ClientsList />;
}

function ClientsList() {
  const { user, role } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [payFilter, setPayFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", contact_name: "", phone: "", email: "", hourly_rate: "150", owner_id: "" });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    enabled: !!user,
    queryFn: async () => (await supabase.from("clients").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const { data: members = [] } = useQuery({
    queryKey: ["profiles-all"],
    enabled: !!user && role === "admin",
    queryFn: async () => (await supabase.from("profiles").select("id,full_name")).data ?? [],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const owner_id = role === "admin" && form.owner_id ? form.owner_id : user!.id;
      const { error } = await supabase.from("clients").insert({
        name: form.name, contact_name: form.contact_name, phone: form.phone, email: form.email,
        hourly_rate: Number(form.hourly_rate) || 0, owner_id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("לקוח נוסף");
      setOpen(false);
      setForm({ name: "", contact_name: "", phone: "", email: "", hourly_rate: "150", owner_id: "" });
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (e: Error) => toast.error("שגיאה", { description: e.message }),
  });

  const filtered = clients.filter(c =>
    (statusFilter === "all" || c.process_status === statusFilter) &&
    (payFilter === "all" || c.payment_status === payFilter) &&
    (search === "" || c.name?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <>
      <PageHeader
        title="לקוחות"
        description={`${filtered.length} מתוך ${clients.length} לקוחות`}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 ml-1" /> לקוח חדש</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>לקוח חדש</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>שם לקוח</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>איש קשר</Label><Input value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>טלפון</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                  <div><Label>אימייל</Label><Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                </div>
                <div><Label>תעריף שעתי (₪)</Label><Input type="number" value={form.hourly_rate} onChange={e => setForm({ ...form, hourly_rate: e.target.value })} /></div>
                {role === "admin" && (
                  <div>
                    <Label>שייך לחבר צוות</Label>
                    <Select value={form.owner_id} onValueChange={v => setForm({ ...form, owner_id: v })}>
                      <SelectTrigger><SelectValue placeholder="אני" /></SelectTrigger>
                      <SelectContent>
                        {members.map(m => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button onClick={() => createMutation.mutate()} disabled={!form.name || createMutation.isPending}>שמור</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pr-9" placeholder="חיפוש..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל שלבי התהליך</SelectItem>
            {PROCESS_STATUS_OPTIONS.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={payFilter} onValueChange={setPayFilter}>
          <SelectTrigger className="sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל סטטוסי התשלום</SelectItem>
            {Object.entries(PAYMENT_STATUS_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(c => (
          <Link key={c.id} to="/clients/$id" params={{ id: c.id }} className="block">
            <Card className="p-4 hover:shadow-elegant transition-shadow h-full">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-full gradient-primary flex items-center justify-center text-primary-foreground">
                    <UserCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold">{c.name}</div>
                    {c.contact_name && <div className="text-xs text-muted-foreground">{c.contact_name}</div>}
                  </div>
                </div>
                <Badge variant={c.payment_status === "due" ? "destructive" : c.payment_status === "paid" ? "default" : "secondary"}>
                  {PAYMENT_STATUS_LABELS[c.payment_status]}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground mb-2">{PROCESS_STATUS_LABELS[c.process_status]}</div>
              <div className="text-sm">{formatCurrency(Number(c.hourly_rate))} / שעה</div>
            </Card>
          </Link>
        ))}
        {filtered.length === 0 && <div className="col-span-full text-center text-muted-foreground py-10">אין לקוחות להצגה</div>}
      </div>
    </>
  );
}
