import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/_app/calculator")({ component: () => <div><h1 className="text-3xl font-bold mb-2">מחשבון שעות מערכת</h1><p className="text-muted-foreground">בבנייה</p></div> });
