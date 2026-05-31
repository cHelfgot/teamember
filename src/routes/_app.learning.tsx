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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { PageHeader } from "@/components/PageHeader";
import { normalizeUrl } from "@/lib/format";
import { toast } from "sonner";
import { Plus, ExternalLink, Trash2, BookOpen } from "lucide-react";

export const Route = createFileRoute("/_app/learning")({
  head: () => ({ meta: [{ title: "מרכז הדרכה - CRM" }] }),
  component: LearningPage,
});

function LearningPage() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const qc = useQueryClient();
  const [linkForm, setLinkForm] = useState({ title: "", url: "", description: "", category_id: "" });
  const [catName, setCatName] = useState("");
  const [openCat, setOpenCat] = useState(false);

  const { data: cats = [] } = useQuery({
    queryKey: ["learning-cats"],
    queryFn: async () => (await supabase.from("learning_categories").select("*").order("sort_order")).data ?? [],
  });

  const { data: links = [] } = useQuery({
    queryKey: ["learning-links"],
    queryFn: async () => (await supabase.from("learning_links").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const addCat = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("learning_categories").insert({ name: catName }); if (error) throw error; },
    onSuccess: () => { setCatName(""); setOpenCat(false); qc.invalidateQueries({ queryKey: ["learning-cats"] }); toast.success("נוסף"); },
  });

  const addLink = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("learning_links").insert({ ...linkForm, url: normalizeUrl(linkForm.url), category_id: linkForm.category_id || null });
      if (error) throw error;
    },
    onSuccess: () => { setLinkForm({ title: "", url: "", description: "", category_id: "" }); qc.invalidateQueries({ queryKey: ["learning-links"] }); toast.success("נוסף"); },
  });

  const delLink = useMutation({
    mutationFn: async (id: string) => { await supabase.from("learning_links").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["learning-links"] }),
  });

  return (
    <>
      <PageHeader
        title="מרכז הדרכה"
        description="מאגר ידע, לינקים והדרכות"
        actions={isAdmin && (
          <Dialog open={openCat} onOpenChange={setOpenCat}>
            <DialogTrigger asChild><Button variant="outline"><Plus className="h-4 w-4 ml-1" /> קטגוריה</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>קטגוריה חדשה</DialogTitle></DialogHeader>
              <Input value={catName} onChange={e => setCatName(e.target.value)} placeholder="שם הקטגוריה" />
              <DialogFooter><Button onClick={() => addCat.mutate()} disabled={!catName}>שמור</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      />

      {isAdmin && (
        <Card className="p-4 mb-6 grid sm:grid-cols-5 gap-2 items-end">
          <Input placeholder="כותרת" value={linkForm.title} onChange={e => setLinkForm({ ...linkForm, title: e.target.value })} />
          <Input placeholder="קישור" value={linkForm.url} onChange={e => setLinkForm({ ...linkForm, url: e.target.value })} />
          <Input placeholder="תיאור" value={linkForm.description} onChange={e => setLinkForm({ ...linkForm, description: e.target.value })} />
          <Select value={linkForm.category_id} onValueChange={v => setLinkForm({ ...linkForm, category_id: v })}>
            <SelectTrigger><SelectValue placeholder="קטגוריה" /></SelectTrigger>
            <SelectContent>{cats.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={() => addLink.mutate()} disabled={!linkForm.title || !linkForm.url}>הוסף</Button>
        </Card>
      )}

      {cats.length === 0 && links.length === 0 && (
        <div className="text-center text-muted-foreground py-10">
          <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>אין עדיין תוכן במרכז ההדרכה</p>
        </div>
      )}

      <div className="space-y-6">
        {cats.map(cat => {
          const items = links.filter(l => l.category_id === cat.id);
          if (items.length === 0) return null;
          return (
            <div key={cat.id}>
              <h2 className="text-lg font-semibold mb-2" style={{ color: cat.color ?? undefined }}>{cat.name}</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map(l => (
                  <Card key={l.id} className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <a href={normalizeUrl(l.url)} target="_blank" rel="noreferrer" className="font-semibold hover:text-primary flex items-center gap-1">
                        <ExternalLink className="h-4 w-4" /> {l.title}
                      </a>
                      {isAdmin && <Button size="icon" variant="ghost" onClick={() => delLink.mutate(l.id)}><Trash2 className="h-4 w-4" /></Button>}
                    </div>
                    {l.description && <p className="text-sm text-muted-foreground mt-1">{l.description}</p>}
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
        {links.filter(l => !l.category_id).length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-2">ללא קטגוריה</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {links.filter(l => !l.category_id).map(l => (
                <Card key={l.id} className="p-4">
                  <a href={normalizeUrl(l.url)} target="_blank" rel="noreferrer" className="font-semibold hover:text-primary flex items-center gap-1">
                    <ExternalLink className="h-4 w-4" /> {l.title}
                  </a>
                  {l.description && <p className="text-sm text-muted-foreground mt-1">{l.description}</p>}
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
