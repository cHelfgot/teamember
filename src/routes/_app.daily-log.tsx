import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/_app/daily-log")({ component: () => <div><h1 className="text-3xl font-bold mb-2">דיווח יומי</h1><p className="text-muted-foreground">בבנייה</p></div> });
