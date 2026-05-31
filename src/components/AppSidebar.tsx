import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Users, ClipboardList, BookOpen, Calculator, Lightbulb, UserCog, LogOut, Sparkles, MessageSquareHeart } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/dashboard", label: "לוח בקרה", icon: LayoutDashboard, adminOnly: false },
  { to: "/clients", label: "לקוחות", icon: Users, adminOnly: false },
  { to: "/daily-log", label: "דיווח יומי", icon: ClipboardList, adminOnly: false },
  { to: "/learning", label: "מרכז הדרכה", icon: BookOpen, adminOnly: false },
  { to: "/calculator", label: "מחשבון שעות", icon: Calculator, adminOnly: false },
  { to: "/inspiration", label: "השראה", icon: Lightbulb, adminOnly: false },
  { to: "/feedback", label: "משוב", icon: MessageSquareHeart, adminOnly: true },
  { to: "/users", label: "ניהול משתמשים", icon: UserCog, adminOnly: true },
] as const;

export function AppSidebar() {
  const { role, fullName, signOut } = useAuth();
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  return (
    <aside className="w-64 shrink-0 border-l bg-sidebar text-sidebar-foreground flex flex-col">
      <div className="p-5 border-b">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <div className="font-bold text-base">CRM</div>
            <div className="text-xs text-muted-foreground">{role === "admin" ? "מנהל" : "חבר צוות"}</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV.filter(n => !n.adminOnly || role === "admin").map(n => {
          const active = pathname.startsWith(n.to);
          const Icon = n.icon;
          return (
            <Link
              key={n.to}
              to={n.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-elegant" : "hover:bg-sidebar-accent"
              }`}
            >
              <Icon className="h-4 w-4" />
              {n.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t">
        <div className="text-xs text-muted-foreground px-3 pb-2 truncate">{fullName}</div>
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={signOut}>
          <LogOut className="h-4 w-4 ml-2" />
          התנתק
        </Button>
      </div>
    </aside>
  );
}
