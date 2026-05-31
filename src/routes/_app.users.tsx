import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/_app/users")({ component: () => <div><h1 className="text-3xl font-bold mb-2">ניהול משתמשים</h1><p className="text-muted-foreground">בבנייה</p></div> });
