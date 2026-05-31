import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/PageHeader";
import { formatHours } from "@/lib/format";
import { generateCalculatorSummary } from "@/lib/calculator.functions";
import { toast } from "sonner";
import { Copy, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_app/calculator")({
  head: () => ({ meta: [{ title: "מחשבון שעות - CRM" }] }),
  component: CalculatorPage,
});

const FIELDS: { key: string; label: string; hours: number }[] = [
  { key: "team_size", label: "כמות חברי צוות", hours: 0.5 },
  { key: "tickets", label: "סוגי פניות", hours: 0.5 },
  { key: "fields", label: "שדות במערכת", hours: 0.25 },
  { key: "statuses", label: "סטטוסים", hours: 0.25 },
  { key: "internal_states", label: "מצבים פנימיים", hours: 0.3 },
  { key: "automations", label: "אוטומציות", hours: 1.5 },
  { key: "doctors", label: "רופאים / נותני שירות", hours: 0.4 },
  { key: "meeting_types", label: "סוגי פגישות", hours: 0.4 },
  { key: "tabs", label: "טאבים", hours: 0.5 },
  { key: "waffle_templates", label: "תבניות Waffle", hours: 1 },
  { key: "email_templates", label: "תבניות אימייל", hours: 0.75 },
  { key: "forms", label: "טפסים", hours: 1.5 },
  { key: "rooms", label: "חדרים", hours: 0.25 },
  { key: "email_accounts", label: "חשבונות אימייל", hours: 0.5 },
  { key: "waffle_accounts", label: "חשבונות Waffle", hours: 0.5 },
  { key: "social_networks", label: "רשתות חברתיות", hours: 0.75 },
  { key: "make_automations", label: "אוטומציות Make", hours: 2 },
  { key: "msf_automations", label: "אוטומציות MSF", hours: 2 },
  { key: "centers", label: "מוקדים", hours: 1 },
  { key: "products", label: "מוצרים", hours: 0.3 },
  { key: "projects", label: "פרויקטים", hours: 0.5 },
  { key: "campaigns", label: "קמפיינים", hours: 1 },
];

function CalculatorPage() {
  const [clientName, setClientName] = useState("");
  const [values, setValues] = useState<Record<string, number>>({});
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);
  const generate = useServerFn(generateCalculatorSummary);

  const items = useMemo(() => FIELDS.map(f => ({ ...f, quantity: values[f.key] ?? 0 })), [values]);
  const totalHours = useMemo(() => items.reduce((s, i) => s + i.quantity * i.hours, 0), [items]);

  const handleGenerate = async () => {
    if (!clientName) return toast.error("נא להזין שם לקוח");
    setBusy(true);
    try {
      const res = await generate({ data: { clientName, totalHours, items: items.map(i => ({ label: i.label, quantity: i.quantity, hours: i.hours })) } });
      setSummary(res.summary);
      toast.success("הסיכום נוצר");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="מחשבון שעות מערכת" description="הערכת שעות הקמה ללקוח" />

      <Card className="p-6 mb-6">
        <div className="mb-4">
          <Label>שם הלקוח</Label>
          <Input value={clientName} onChange={e => setClientName(e.target.value)} />
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {FIELDS.map(f => (
            <div key={f.key}>
              <Label className="text-xs">{f.label} <span className="text-muted-foreground">({f.hours} ש׳)</span></Label>
              <Input type="number" min="0" value={values[f.key] ?? ""} onChange={e => setValues({ ...values, [f.key]: Number(e.target.value) || 0 })} />
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t flex items-center justify-between">
          <div>
            <div className="text-sm text-muted-foreground">סה״כ הערכה</div>
            <div className="text-3xl font-bold">{formatHours(totalHours)} שעות</div>
            <div className="text-xs text-muted-foreground">סטייה אפשרית של עד 20%</div>
          </div>
          <Button onClick={handleGenerate} disabled={busy || !clientName}>
            <Sparkles className="h-4 w-4 ml-1" /> {busy ? "מייצר..." : "צור סיכום עם AI"}
          </Button>
        </div>
      </Card>

      {summary && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">סיכום מוכן ללקוח</h2>
            <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(summary); toast.success("הועתק"); }}>
              <Copy className="h-4 w-4 ml-1" /> העתק
            </Button>
          </div>
          <Textarea value={summary} onChange={e => setSummary(e.target.value)} rows={12} />
        </Card>
      )}
    </>
  );
}
