import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  clientName: z.string().min(1).max(200),
  totalHours: z.number().min(0).max(100000),
  items: z.array(z.object({ label: z.string(), quantity: z.number(), hours: z.number() })).max(100),
});

export const generateCalculatorSummary = createServerFn({ method: "POST" })
  .inputValidator((d) => InputSchema.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY חסר");

    const itemsList = data.items.filter(i => i.quantity > 0).map(i => `- ${i.label}: ${i.quantity} (${(i.quantity * i.hours).toFixed(1)} שעות)`).join("\n");
    const prompt = `כתבי סיכום מקצועי בעברית להצעת מחיר עבור הקמת מערכת CRM ללקוח "${data.clientName}".\n\nהיקף העבודה כולל:\n${itemsList}\n\nסה"כ הערכת שעות: ${data.totalHours.toFixed(1)}\n\nכללי לסיכום:\n- 3-4 פסקאות קצרות\n- להזכיר שמדובר בהערכה עם סטייה אפשרית של עד 20%\n- טון מקצועי וחם\n- בלי כותרות Markdown`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`AI Gateway: ${res.status}`);
    const json = await res.json() as { choices: Array<{ message: { content: string } }> };
    return { summary: json.choices?.[0]?.message?.content ?? "" };
  });
