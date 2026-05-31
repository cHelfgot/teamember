import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/PageHeader";
import { toast } from "sonner";
import { Trash2, Lightbulb } from "lucide-react";

export const Route = createFileRoute("/_app/inspiration")({
  head: () => ({ meta: [{ title: "השראה - CRM" }] }),
  component: InspirationPage,
});

function InspirationPage() {
  const { user, role } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");

  const { data: posts = [] } = useQuery({
    queryKey: ["inspiration"],
    queryFn: async () => {
      const { data } = await supabase.from("inspiration_posts").select("*").order("created_at", { ascending: false });
      const userIds = [...new Set((data ?? []).map(p => p.user_id))];
      const { data: profs } = await supabase.from("profiles").select("id,full_name").in("id", userIds);
      const nameMap = new Map((profs ?? []).map(p => [p.id, p.full_name]));
      return (data ?? []).map(p => ({ ...p, author: nameMap.get(p.user_id) ?? "" }));
    },
  });

  const add = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("inspiration_posts").insert({ user_id: user!.id, content: text }); if (error) throw error; },
    onSuccess: () => { setText(""); qc.invalidateQueries({ queryKey: ["inspiration"] }); toast.success("פורסם"); },
  });

  const del = useMutation({
    mutationFn: async (id: string) => { await supabase.from("inspiration_posts").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inspiration"] }),
  });

  return (
    <>
      <PageHeader title="השראה" description="לוח השראה משותף לכל הצוות" />

      <Card className="p-4 mb-6">
        <Textarea value={text} onChange={e => setText(e.target.value)} rows={3} placeholder="שתפי רעיון, ציטוט, השראה..." />
        <div className="flex justify-end mt-2">
          <Button onClick={() => add.mutate()} disabled={!text.trim()}><Lightbulb className="h-4 w-4 ml-1" /> פרסם</Button>
        </div>
      </Card>

      <div className="space-y-3">
        {posts.map(p => (
          <Card key={p.id} className="p-4">
            <div className="flex items-start justify-between mb-1">
              <div>
                <div className="font-semibold text-sm">{p.author}</div>
                <div className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString("he-IL")}</div>
              </div>
              {(p.user_id === user?.id || role === "admin") && (
                <Button size="icon" variant="ghost" onClick={() => del.mutate(p.id)}><Trash2 className="h-4 w-4" /></Button>
              )}
            </div>
            <p className="whitespace-pre-wrap">{p.content}</p>
          </Card>
        ))}
        {posts.length === 0 && <div className="text-center text-muted-foreground py-10">אין פוסטים עדיין</div>}
      </div>
    </>
  );
}
