import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { Star } from "lucide-react";

export const Route = createFileRoute("/_app/feedback")({
  head: () => ({ meta: [{ title: "משוב - CRM" }] }),
  component: FeedbackOverview,
});

function FeedbackOverview() {
  const { role, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && role !== "admin") navigate({ to: "/dashboard", replace: true }); }, [role, loading, navigate]);

  const { data: rows = [] } = useQuery({
    queryKey: ["feedback-all"],
    enabled: role === "admin",
    queryFn: async () => {
      const { data: fb = [] } = await supabase.from("feedback_responses").select("*,clients(name)").order("created_at", { ascending: false });
      const memberIds = [...new Set((fb ?? []).map(f => f.member_user_id))];
      const { data: profs = [] } = await supabase.from("profiles").select("id,full_name").in("id", memberIds);
      const nm = new Map((profs ?? []).map(p => [p.id, p.full_name]));
      return (fb ?? []).map(f => ({ ...f, memberName: nm.get(f.member_user_id) ?? "" }));
    },
  });

  // Per-member averages
  const byMember = new Map<string, { name: string; count: number; service: number; prof: number }>();
  rows.forEach(r => {
    const cur = byMember.get(r.member_user_id) ?? { name: r.memberName, count: 0, service: 0, prof: 0 };
    cur.count++; cur.service += Number(r.service_rating); cur.prof += Number(r.professionalism_rating);
    byMember.set(r.member_user_id, cur);
  });

  return (
    <>
      <PageHeader title="משוב לקוחות" description="כל המשובים שהתקבלו" />

      {byMember.size > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {[...byMember.values()].map(m => (
            <Card key={m.name} className="p-4">
              <div className="font-semibold mb-2">{m.name}</div>
              <div className="text-sm space-y-1">
                <div>שירות: <strong>{(m.service / m.count).toFixed(1)}/10</strong></div>
                <div>מקצועיות: <strong>{(m.prof / m.count).toFixed(1)}/10</strong></div>
                <div className="text-xs text-muted-foreground">{m.count} משובים</div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {rows.map(r => (
          <Card key={r.id} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <Link to="/clients/$id" params={{ id: r.client_id }} className="font-semibold hover:text-primary">
                  {(r as { clients?: { name?: string } }).clients?.name}
                </Link>
                <span className="text-sm text-muted-foreground mr-2">· {r.memberName}</span>
              </div>
              <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("he-IL")}</div>
            </div>
            <div className="flex items-center gap-4 text-sm mb-2">
              <span className="flex items-center gap-1"><Star className="h-4 w-4 fill-primary text-primary" /> שירות {r.service_rating}/10</span>
              <span className="flex items-center gap-1"><Star className="h-4 w-4 fill-primary text-primary" /> מקצועיות {r.professionalism_rating}/10</span>
            </div>
            {r.comments && <p className="text-sm whitespace-pre-wrap">{r.comments}</p>}
          </Card>
        ))}
        {rows.length === 0 && <div className="text-center text-muted-foreground py-10">עדיין אין משובים</div>}
      </div>
    </>
  );
}
