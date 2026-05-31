import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/feedback/$token")({ component: () => <div className="min-h-screen flex items-center justify-center"><div><h1 className="text-3xl font-bold mb-2">טופס משוב</h1><p className="text-muted-foreground">בבנייה</p></div></div> });
