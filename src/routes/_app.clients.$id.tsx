import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { PROCESS_STATUS_OPTIONS, PROCESS_STATUS_LABELS, PAYMENT_STATUS_LABELS, formatCurrency, formatHours, normalizeUrl } from "@/lib/format";
import { toast } from "sonner";
import { ArrowRight, ExternalLink, Trash2, Plus, Copy, MessageSquareHeart, Star } from "lucide-react";

export const Route = createFileRoute("/_app/clients/$id")({
  head: ({ params }) => ({ meta: [{ title: `לקוח - CRM` }] }),
  component: ClientDetail,
});

function ClientDetail() {
  const { id } = Route.useParams();
  const { user, role } = useAuth();
  const qc = useQueryClient();
  const [show10h, setShow10h] = useState(false);
  const [tenHourText, setTenHourText] = useState("");
  const [feedbackLink, setFeedbackLink] = useState<string | null>(null);

  const { data: client, isLoading } = useQuery({
    queryKey: ["client", id],
    queryFn: async () => (await supabase.from("clients").select("*").eq("id", id).maybeSingle()).data,
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["client-logs", id],
    queryFn: async () => (await supabase.from("daily_logs").select("*").eq("client_id", id).order("log_date", { ascending: false })).data ?? [],
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["client-payments", id],
    queryFn: async () => (await supabase.from("client_payments").select("*").eq("client_id", id).order("created_at", { ascending: false })).data ?? [],
  });

  const { data: docs = [] } = useQuery({
    queryKey: ["client-docs", id],
    queryFn: async () => (await supabase.from("client_documents").select("*").eq("client_id", id).order("created_at", { ascending: false })).data ?? [],
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["client-contacts", id],
    queryFn: async () => (await supabase.from("client_contacts").select("*").eq("client_id", id)).data ?? [],
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["client-tasks", id],
    queryFn: async () => (await supabase.from("client_tasks").select("*").eq("client_id", id).order("created_at", { ascending: false })).data ?? [],
  });

  const { data: feedback = [] } = useQuery({
    queryKey: ["client-feedback", id],
    queryFn: async () => (await supabase.from("feedback_responses").select("*").eq("client_id", id).order("created_at", { ascending: false })).data ?? [],
  });

  const totalHours = logs.reduce((s, l) => s + Number(l.hours || 0), 0);
  const totalPaid = payments.reduce((s, p) => s + Number(p.hours_paid || 0), 0);
  const unpaidHours = Math.max(0, totalHours - totalPaid);

  // Detect crossing 10h threshold
  useEffect(() => {
    if (!client) return;
    const currentBucket = Math.floor(totalHours / 10);
    const lastBucket = Number(client.last_10h_threshold || 0);
    if (currentBucket > lastBucket && totalHours > 0) {
      setShow10h(true);
    }
  }, [totalHours, client]);

  const updateClient = useMutation({
    mutationFn: async (patch: Partial<{ process_status: string; characterization_text: string; miro_link: string; characterization_hours_estimate: number; free_notes: string; last_10h_threshold: number }>) => {
      const { error } = await supabase.from("clients").update(patch as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["client", id] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const handleStatusChange = async (newStatus: string) => {
    await updateClient.mutateAsync({ process_status: newStatus });
    toast.success("הסטטוס עודכן");
    // If moved to 'live', generate feedback link
    if (newStatus === "live" && client?.process_status !== "live") {
      const { data: tok } = await supabase.from("feedback_tokens").insert({ client_id: id }).select("token").maybeSingle();
      if (tok) {
        const link = `${window.location.origin}/feedback/${tok.token}`;
        setFeedbackLink(link);
      }
    }
  };

  const save10h = async () => {
    if (!tenHourText.trim()) return toast.error("נדרש סיכום");
    const { error } = await supabase.from("client_documents").insert({
      client_id: id, user_id: user!.id, doc_type: "ten_hours",
      title: `סיכום ${Math.floor(totalHours / 10) * 10} שעות`, content: tenHourText,
    });
    if (error) return toast.error(error.message);
    await updateClient.mutateAsync({ last_10h_threshold: Math.floor(totalHours / 10) });
    setShow10h(false);
    setTenHourText("");
    qc.invalidateQueries({ queryKey: ["client-docs", id] });
    toast.success("הסיכום נשמר");
  };

  if (isLoading) return <div>טוען...</div>;
  if (!client) return <div>לא נמצא</div>;

  return (
    <>
      <Link to="/clients" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowRight className="h-4 w-4" /> חזרה ללקוחות
      </Link>

      <Card className="p-6 mb-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
          <div>
            <h1 className="text-2xl font-bold">{client.name}</h1>
            {client.contact_name && <div className="text-sm text-muted-foreground">{client.contact_name} · {client.phone} · {client.email}</div>}
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <Badge variant={client.payment_status === "due" ? "destructive" : client.payment_status === "paid" ? "default" : "secondary"}>
              {PAYMENT_STATUS_LABELS[client.payment_status]}
            </Badge>
            <Select value={client.process_status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PROCESS_STATUS_OPTIONS.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t">
          <Stat label="תעריף" value={formatCurrency(Number(client.hourly_rate))} />
          <Stat label="שעות עבודה" value={formatHours(totalHours)} />
          <Stat label="שעות ששולמו" value={formatHours(totalPaid)} />
          <Stat label="יתרה לתשלום" value={`${formatHours(unpaidHours)} ש׳ (${formatCurrency(unpaidHours * Number(client.hourly_rate))})`} />
        </div>
      </Card>

      <Tabs defaultValue="char">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="char">אפיון</TabsTrigger>
          <TabsTrigger value="docs">תיעוד</TabsTrigger>
          <TabsTrigger value="contacts">אנשי קשר</TabsTrigger>
          <TabsTrigger value="tasks">משימות {tasks.filter(t => !t.is_read).length > 0 && <Badge className="mr-1">{tasks.filter(t => !t.is_read).length}</Badge>}</TabsTrigger>
          <TabsTrigger value="read-tasks">משימות שנקראו</TabsTrigger>
          <TabsTrigger value="payments">תשלומים</TabsTrigger>
          <TabsTrigger value="feedback">משוב</TabsTrigger>
        </TabsList>

        <TabsContent value="char">
          <CharacterizationTab client={client} onChange={(p) => updateClient.mutate(p)} />
        </TabsContent>
        <TabsContent value="docs">
          <DocsTab clientId={id} docs={docs} userId={user!.id} />
        </TabsContent>
        <TabsContent value="contacts">
          <ContactsTab clientId={id} contacts={contacts} />
        </TabsContent>
        <TabsContent value="tasks">
          <TasksTab clientId={id} tasks={tasks.filter(t => !t.is_read)} userId={user!.id} isAdmin={role === "admin"} />
        </TabsContent>
        <TabsContent value="read-tasks">
          <TasksTab clientId={id} tasks={tasks.filter(t => t.is_read)} userId={user!.id} isAdmin={role === "admin"} readOnly />
        </TabsContent>
        <TabsContent value="payments">
          <PaymentsTab clientId={id} payments={payments} userId={user!.id} hourlyRate={Number(client.hourly_rate)} isAdmin={role === "admin"} />
        </TabsContent>
        <TabsContent value="feedback">
          <FeedbackTab clientId={id} feedback={feedback} />
        </TabsContent>
      </Tabs>

      <Dialog open={show10h} onOpenChange={(o) => !o && setShow10h(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>השלמת {Math.floor(totalHours / 10) * 10} שעות עבודה</DialogTitle>
            <DialogDescription>נדרש סיכום של מה שנעשה ב-10 השעות האחרונות</DialogDescription>
          </DialogHeader>
          <Textarea value={tenHourText} onChange={e => setTenHourText(e.target.value)} rows={8} placeholder="סיכום העבודה..." />
          <DialogFooter><Button onClick={save10h}>שמור והמשך</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!feedbackLink} onOpenChange={(o) => !o && setFeedbackLink(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>לינק למשוב הלקוח</DialogTitle>
            <DialogDescription>שלחי לינק זה ללקוח כדי לקבל משוב</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Input value={feedbackLink ?? ""} readOnly />
            <Button onClick={() => { navigator.clipboard.writeText(feedbackLink ?? ""); toast.success("הועתק"); }}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div><div className="text-xs text-muted-foreground">{label}</div><div className="font-semibold">{value}</div></div>;
}

function CharacterizationTab({ client, onChange }: { client: { id: string; characterization_text: string | null; miro_link: string | null; characterization_hours_estimate: number | null; free_notes: string | null }; onChange: (p: Record<string, unknown>) => void }) {
  const [text, setText] = useState(client.characterization_text ?? "");
  const [miro, setMiro] = useState(client.miro_link ?? "");
  const [est, setEst] = useState(String(client.characterization_hours_estimate ?? ""));
  const [notes, setNotes] = useState(client.free_notes ?? "");

  return (
    <Card className="p-6 space-y-4 mt-4">
      <div>
        <Label>אפיון</Label>
        <Textarea value={text} onChange={e => setText(e.target.value)} rows={6} />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label>קישור Miro</Label>
          <div className="flex gap-2">
            <Input value={miro} onChange={e => setMiro(e.target.value)} placeholder="https://miro.com/..." />
            {miro && <a href={normalizeUrl(miro)} target="_blank" rel="noreferrer" className="inline-flex items-center"><ExternalLink className="h-4 w-4" /></a>}
          </div>
        </div>
        <div>
          <Label>הערכת שעות \</Label>
          <Input type="number" value={est} onChange={e => setEst(e.target.value)} />
        </div>
      </div>
      <div>
        <Label>הערות חופשיות</Label>
        <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} />
      </div>
      <Button onClick={() => onChange({ characterization_text: text, miro_link: miro, characterization_hours_estimate: Number(est) || 0, free_notes: notes })}>
        שמור
      </Button>
    </Card>
  );
}

function DocsTab({ clientId, docs, userId }: { clientId: string; docs: Array<{ id: string; doc_type: string; title: string | null; content: string; created_at: string }>; userId: string }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("client_documents").insert({ client_id: clientId, user_id: userId, doc_type: "free", title, content });
      if (error) throw error;
    },
    onSuccess: () => { setTitle(""); setContent(""); qc.invalidateQueries({ queryKey: ["client-docs", clientId] }); toast.success("נשמר"); },
  });
  return (
    <div className="space-y-4 mt-4">
      <Card className="p-4 space-y-2">
        <Input placeholder="כותרת" value={title} onChange={e => setTitle(e.target.value)} />
        <Textarea placeholder="תוכן..." value={content} onChange={e => setContent(e.target.value)} rows={3} />
        <Button onClick={() => add.mutate()} disabled={!content}>הוסף תיעוד</Button>
      </Card>
      {docs.map(d => (
        <Card key={d.id} className="p-4">
          <div className="flex items-center justify-between mb-1">
            <div className="font-semibold">{d.title || "ללא כותרת"}</div>
            <div className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleDateString("he-IL")} {d.doc_type === "ten_hours" && <Badge className="mr-2">סיכום 10 שעות</Badge>}</div>
          </div>
          <div className="text-sm whitespace-pre-wrap">{d.content}</div>
        </Card>
      ))}
    </div>
  );
}

function ContactsTab({ clientId, contacts }: { clientId: string; contacts: Array<{ id: string; name: string; role: string | null; phone: string | null; email: string | null }> }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", role: "", phone: "", email: "" });
  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("client_contacts").insert({ client_id: clientId, ...form });
      if (error) throw error;
    },
    onSuccess: () => { setForm({ name: "", role: "", phone: "", email: "" }); qc.invalidateQueries({ queryKey: ["client-contacts", clientId] }); toast.success("נוסף"); },
  });
  const del = useMutation({
    mutationFn: async (cid: string) => { await supabase.from("client_contacts").delete().eq("id", cid); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["client-contacts", clientId] }),
  });
  return (
    <div className="space-y-4 mt-4">
      <Card className="p-4 grid sm:grid-cols-5 gap-2 items-end">
        <Input placeholder="שם" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <Input placeholder="תפקיד" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} />
        <Input placeholder="טלפון" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
        <Input placeholder="אימייל" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
        <Button onClick={() => add.mutate()} disabled={!form.name}><Plus className="h-4 w-4" /></Button>
      </Card>
      {contacts.map(c => (
        <Card key={c.id} className="p-3 flex items-center justify-between">
          <div>
            <div className="font-medium">{c.name} <span className="text-xs text-muted-foreground">{c.role}</span></div>
            <div className="text-xs text-muted-foreground">{c.phone} · {c.email}</div>
          </div>
          <Button size="icon" variant="ghost" onClick={() => del.mutate(c.id)}><Trash2 className="h-4 w-4" /></Button>
        </Card>
      ))}
    </div>
  );
}

function TasksTab({ clientId, tasks, userId, isAdmin, readOnly }: { clientId: string; tasks: Array<{ id: string; title: string; description: string | null; is_read: boolean; created_at: string }>; userId: string; isAdmin: boolean; readOnly?: boolean }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: "", description: "" });
  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("client_tasks").insert({ client_id: clientId, created_by: userId, ...form });
      if (error) throw error;
    },
    onSuccess: () => { setForm({ title: "", description: "" }); qc.invalidateQueries({ queryKey: ["client-tasks", clientId] }); toast.success("נוסף"); },
  });
  const mark = useMutation({
    mutationFn: async (tid: string) => { await supabase.from("client_tasks").update({ is_read: true }).eq("id", tid); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["client-tasks", clientId] }),
  });
  return (
    <div className="space-y-3 mt-4">
      {!readOnly && isAdmin && (
        <Card className="p-4 space-y-2">
          <Input placeholder="כותרת המשימה" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          <Textarea placeholder="תיאור" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          <Button onClick={() => add.mutate()} disabled={!form.title}>הוסף משימה</Button>
        </Card>
      )}
      {tasks.map(t => (
        <Card key={t.id} className="p-3 flex items-start gap-3">
          {!readOnly && <Checkbox checked={t.is_read} onCheckedChange={() => mark.mutate(t.id)} className="mt-1" />}
          <div className="flex-1">
            <div className="font-medium">{t.title}</div>
            {t.description && <div className="text-sm text-muted-foreground whitespace-pre-wrap">{t.description}</div>}
            <div className="text-xs text-muted-foreground mt-1">{new Date(t.created_at).toLocaleDateString("he-IL")}</div>
          </div>
        </Card>
      ))}
      {tasks.length === 0 && <div className="text-center text-muted-foreground py-6">אין משימות</div>}
    </div>
  );
}

function PaymentsTab({ clientId, payments, userId, hourlyRate, isAdmin }: { clientId: string; payments: Array<{ id: string; hours_paid: number; note: string | null; created_at: string }>; userId: string; hourlyRate: number; isAdmin: boolean }) {
  const qc = useQueryClient();
  const [hours, setHours] = useState("");
  const [note, setNote] = useState("");
  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("client_payments").insert({ client_id: clientId, created_by: userId, hours_paid: Number(hours), note });
      if (error) throw error;
    },
    onSuccess: () => { setHours(""); setNote(""); qc.invalidateQueries({ queryKey: ["client-payments", clientId] }); qc.invalidateQueries({ queryKey: ["client", clientId] }); toast.success("נשמר"); },
  });
  return (
    <div className="space-y-3 mt-4">
      {isAdmin && (
        <Card className="p-4 grid sm:grid-cols-3 gap-2 items-end">
          <div><Label>שעות ששולמו</Label><Input type="number" value={hours} onChange={e => setHours(e.target.value)} /></div>
          <div><Label>הערה</Label><Input value={note} onChange={e => setNote(e.target.value)} /></div>
          <Button onClick={() => add.mutate()} disabled={!hours}>רשום תשלום</Button>
        </Card>
      )}
      {payments.map(p => (
        <Card key={p.id} className="p-3 flex items-center justify-between">
          <div>
            <div className="font-medium">{formatHours(Number(p.hours_paid))} שעות = {formatCurrency(Number(p.hours_paid) * hourlyRate)}</div>
            {p.note && <div className="text-sm text-muted-foreground">{p.note}</div>}
          </div>
          <div className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString("he-IL")}</div>
        </Card>
      ))}
    </div>
  );
}

function FeedbackTab({ clientId, feedback }: { clientId: string; feedback: Array<{ id: string; service_rating: number; professionalism_rating: number; comments: string | null; created_at: string }> }) {
  const [link, setLink] = useState<string | null>(null);
  const generate = async () => {
    const { data } = await supabase.from("feedback_tokens").insert({ client_id: clientId }).select("token").maybeSingle();
    if (data) setLink(`${window.location.origin}/feedback/${data.token}`);
  };
  return (
    <div className="space-y-3 mt-4">
      <Card className="p-4 flex items-center justify-between">
        <div>
          <div className="font-semibold">שליחת לינק משוב ללקוח</div>
          <div className="text-sm text-muted-foreground">צרי לינק ייחודי לשליחה ללקוח</div>
        </div>
        <Button onClick={generate}><MessageSquareHeart className="h-4 w-4 ml-1" /> צור לינק</Button>
      </Card>
      {link && (
        <Card className="p-3 flex gap-2">
          <Input readOnly value={link} />
          <Button onClick={() => { navigator.clipboard.writeText(link); toast.success("הועתק"); }}><Copy className="h-4 w-4" /></Button>
        </Card>
      )}
      {feedback.map(f => (
        <Card key={f.id} className="p-4">
          <div className="flex items-center gap-4 mb-2">
            <RatingDisplay label="שירות" value={f.service_rating} />
            <RatingDisplay label="מקצועיות" value={f.professionalism_rating} />
            <div className="text-xs text-muted-foreground mr-auto">{new Date(f.created_at).toLocaleDateString("he-IL")}</div>
          </div>
          {f.comments && <p className="text-sm whitespace-pre-wrap">{f.comments}</p>}
        </Card>
      ))}
      {feedback.length === 0 && <div className="text-center text-muted-foreground py-6">עוד אין משובים</div>}
    </div>
  );
}

function RatingDisplay({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-1 text-sm">
      <span className="text-muted-foreground">{label}:</span>
      <Star className="h-4 w-4 fill-primary text-primary" />
      <span className="font-semibold">{value}/10</span>
    </div>
  );
}
