import { Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { GraduationCap, LayoutDashboard, Search, MessageSquareText, FileText, ListChecks, CalendarClock, KanbanSquare, Bell, Settings, User as UserIcon, LogOut, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/discover", label: "Discover", icon: Search },
  { to: "/chat", label: "AI Assistant", icon: MessageSquareText },
  { to: "/profile", label: "Profile", icon: UserIcon },
  { to: "/documents", label: "Documents", icon: FileText },
  { to: "/checklist", label: "Checklist", icon: ListChecks },
  { to: "/deadlines", label: "Deadlines", icon: CalendarClock },
  { to: "/tracker", label: "Tracker", icon: KanbanSquare },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [path, setPath] = useState<string>(typeof window !== "undefined" ? window.location.pathname : "/");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const unsub = router.subscribe("onResolved", (e) => setPath(e.toLocation.pathname));
    return () => unsub();
  }, [router]);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <div className="min-h-screen flex bg-hero">
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border/50 glass px-4 py-6 gap-2 sticky top-0 h-screen">
        <Link to="/dashboard" className="flex items-center gap-2 px-2 mb-4">
          <div className="w-9 h-9 rounded-xl bg-brand grid place-items-center glow">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-display text-lg font-semibold">ScholarAI</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Multi-Agent</div>
          </div>
        </Link>
        <nav className="flex-1 flex flex-col gap-1">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = path.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition",
                  active
                    ? "bg-primary/15 text-primary border border-primary/30"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
                )}
              >
                <Icon className="w-4 h-4" /> {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="glass rounded-xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand grid place-items-center text-xs font-semibold">
            {user?.email?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs truncate">{user?.email ?? "…"}</div>
            <button onClick={signOut} className="text-[11px] text-muted-foreground hover:text-destructive flex items-center gap-1">
              <LogOut className="w-3 h-3" /> Sign out
            </button>
          </div>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <div className="md:hidden sticky top-0 z-30 glass border-b border-border/50 px-4 py-3 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand grid place-items-center">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <div className="font-display font-semibold">ScholarAI</div>
          <div className="ml-auto"><Sparkles className="w-4 h-4 text-primary" /></div>
        </div>
        <div className="p-4 md:p-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
