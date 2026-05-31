import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/_app/feedback")({ component: () => <div><h1 className="text-3xl font-bold mb-2">משוב לקוחות</h1><p className="text-muted-foreground">בבנייה</p></div> });
