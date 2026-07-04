import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — ScholarAI" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);
  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm">Account preferences.</p>
      </div>
      <div className="glass rounded-2xl p-6 max-w-lg space-y-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Email</div>
          <div className="text-lg">{email ?? "—"}</div>
        </div>
        <div className="pt-4 border-t border-border/50">
          <button
            onClick={async () => {
              if (!email) return;
              const { error } = await supabase.auth.resetPasswordForEmail(email);
              if (error) toast.error(error.message);
              else toast.success("Password reset email sent");
            }}
            className="text-sm bg-white/5 border border-border px-4 py-2 rounded-lg hover:bg-white/10"
          >
            Send password reset
          </button>
        </div>
        <div className="pt-4 border-t border-border/50">
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/";
            }}
            className="text-sm text-destructive hover:underline"
          >
            Sign out of all sessions
          </button>
        </div>
      </div>
    </AppShell>
  );
}
