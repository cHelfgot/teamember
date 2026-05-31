import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Star, Sparkles } from "lucide-react";

export const Route = createFileRoute("/feedback/$token")({
  head: () => ({ meta: [{ title: "משוב על השירות" }] }),
  component: FeedbackForm,
});

function FeedbackForm() {
  const { token } = Route.useParams();
  const [service, setService] = useState(0);
  const [prof, setProf] = useState(0);
  const [comments, setComments] = useState("");
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["fb-token", token],
    queryFn: async () => {
      const { data: tok } = await supabase.from("feedback_tokens").select("client_id,used").eq("token", token).maybeSingle();
      if (!tok) return null;
      const { data: client } = await supabase.from("clients").select("id,name,owner_id").eq("id", tok.client_id).maybeSingle();
      return { token: tok, client };
    },
  });

  const submit = async () => {
    if (!service || !prof || !data?.client) return toast.error("נא לדרג את שני הקריטריונים");
    setSubmitting(true);
    const { error } = await supabase.from("feedback_responses").insert({
      client_id: data.client.id, member_user_id: data.client.owner_id,
      service_rating: service, professionalism_rating: prof, comments,
    });
    if (!error) {
      await supabase.from("feedback_tokens").update({ used: true }).eq("token", token);
      setDone(true);
    } else {
      toast.error(error.message);
    }
    setSubmitting(false);
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">טוען...</div>;
  if (!data || !data.client) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">הלינק לא תקף</div>;
  if (data.token.used) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">המשוב כבר נשלח. תודה!</div>;
  if (done) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="p-8 text-center max-w-md">
        <Sparkles className="h-12 w-12 mx-auto text-primary mb-3" />
        <h1 className="text-2xl font-bold mb-2">תודה רבה!</h1>
        <p className="text-muted-foreground">המשוב שלך התקבל ויסייע לנו להשתפר.</p>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-lg p-8">
        <div className="text-center mb-6">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary shadow-glow mb-3">
            <Sparkles className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">איך היה השירות שלנו?</h1>
          <p className="text-sm text-muted-foreground mt-1">המשוב שלך חשוב לנו · {data.client.name}</p>
        </div>

        <div className="space-y-5">
          <Rating label="כמה נהנית מהשירות?" value={service} onChange={setService} />
          <Rating label="כמה נהנית מהמקצועיות?" value={prof} onChange={setProf} />
          <div>
            <Label>משהו להוסיף? (אופציונלי)</Label>
            <Textarea value={comments} onChange={e => setComments(e.target.value)} rows={4} />
          </div>
          <Button className="w-full" onClick={submit} disabled={submitting}>שלח משוב</Button>
        </div>
      </Card>
    </div>
  );
}

function Rating({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex gap-1 mt-2 flex-wrap">
        {Array.from({ length: 10 }).map((_, i) => {
          const n = i + 1;
          const active = n <= value;
          return (
            <button key={n} type="button" onClick={() => onChange(n)} className={`h-10 w-10 rounded-md border flex items-center justify-center transition-colors ${active ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}>
              <span className="text-xs font-bold">{n}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
