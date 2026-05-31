import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "התחברות - CRM" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard", replace: true });
  }, [user, loading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error("שגיאת התחברות", { description: error.message });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) toast.error("שגיאת הרשמה", { description: error.message });
    else toast.success("נרשמת בהצלחה! המשתמש הראשון מקבל הרשאות מנהל אוטומטית.");
  };

  const handleGoogle = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) {
      toast.error("שגיאת התחברות עם גוגל");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 shadow-elegant">
        <div className="text-center mb-6">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary shadow-glow mb-3">
            <Sparkles className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">מערכת CRM</h1>
          <p className="text-sm text-muted-foreground mt-1">ניהול לקוחות ושעות עבודה</p>
        </div>

        <Tabs defaultValue="login">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="login">התחברות</TabsTrigger>
            <TabsTrigger value="signup">הרשמה</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4 mt-4">
              <div>
                <Label htmlFor="li-email">אימייל</Label>
                <Input id="li-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="li-pwd">סיסמה</Label>
                <Input id="li-pwd" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "..." : "התחבר"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignup} className="space-y-4 mt-4">
              <div>
                <Label htmlFor="su-name">שם מלא</Label>
                <Input id="su-name" value={fullName} onChange={e => setFullName(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="su-email">אימייל</Label>
                <Input id="su-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="su-pwd">סיסמה</Label>
                <Input id="su-pwd" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "..." : "הירשם"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">או</span>
          </div>
        </div>

        <Button variant="outline" className="w-full" onClick={handleGoogle} disabled={busy}>
          התחבר עם Google
        </Button>
      </Card>
    </div>
  );
}
