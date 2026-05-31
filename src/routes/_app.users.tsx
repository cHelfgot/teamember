import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/PageHeader";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/users")({
  head: () => ({ meta: [{ title: "ניהול משתמשים - CRM" }] }),
  component: UsersPage,
});

function UsersPage() {
  const { role, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => { if (!loading && role !== "admin") navigate({ to: "/dashboard", replace: true }); }, [role, loading, navigate]);

  const { data: users = [] } = useQuery({
    queryKey: ["users-admin"],
    enabled: role === "admin",
    queryFn: async () => {
      const { data: profs = [] } = await supabase.from("profiles").select("*").order("full_name");
      const { data: roles = [] } = await supabase.from("user_roles").select("*");
      const roleMap = new Map((roles ?? []).map(r => [r.user_id, r.role]));
      return (profs ?? []).map(p => ({ ...p, role: roleMap.get(p.id) ?? "member" }));
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({ user_id, role }: { user_id: string; role: "admin" | "member" }) => {
      await supabase.from("user_roles").delete().eq("user_id", user_id);
      const { error } = await supabase.from("user_roles").insert({ user_id, role });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users-admin"] }); toast.success("עודכן"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader title="ניהול משתמשים" description={`${users.length} משתמשים במערכת`} />
      <div className="space-y-2">
        {users.map(u => (
          <Card key={u.id} className="p-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold">
              {u.full_name?.[0] ?? "?"}
            </div>
            <div className="flex-1">
              <div className="font-medium">{u.full_name}</div>
              <div className="text-xs text-muted-foreground">{u.email}</div>
            </div>
            <Select value={u.role} onValueChange={(v: "admin" | "member") => updateRole.mutate({ user_id: u.id, role: v })}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">מנהל</SelectItem>
                <SelectItem value="member">חבר צוות</SelectItem>
              </SelectContent>
            </Select>
          </Card>
        ))}
      </div>
    </>
  );
}
