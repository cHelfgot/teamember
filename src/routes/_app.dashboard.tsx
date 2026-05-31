import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/_app/dashboard")({ component: () => <Stub title="לוח בקרה" /> });
function Stub({ title }: { title: string }) {
  return <div><h1 className="text-3xl font-bold mb-2">{title}</h1><p className="text-muted-foreground">בבנייה — אמלא בהודעה הבאה.</p></div>;
}
