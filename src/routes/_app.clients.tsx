import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/_app/clients")({ component: () => <div><h1 className="text-3xl font-bold mb-2">לקוחות</h1><p className="text-muted-foreground">בבנייה</p></div> });
