import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { GraduationCap, Sparkles, Search, Brain, ShieldCheck, Rocket, MessageSquareText, CalendarClock, LineChart, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ScholarAI — Multi-Agent Scholarship Discovery & Application Assistant" },
      {
        name: "description",
        content:
          "Discover scholarships, verify eligibility, prepare stronger applications, and never miss a deadline — powered by a multi-agent AI supervisor.",
      },
      { property: "og:title", content: "ScholarAI — Multi-Agent Scholarship Assistant" },
      { property: "og:description", content: "Discover, apply, and win scholarships with a team of AI agents." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-hero">
      <header className="max-w-6xl mx-auto flex items-center justify-between px-6 py-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-brand grid place-items-center glow">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="font-display text-xl font-semibold">ScholarAI</span>
        </Link>
        <nav className="hidden sm:flex items-center gap-6 text-sm text-muted-foreground">
          <a href="#agents" className="hover:text-foreground transition">Agents</a>
          <a href="#how" className="hover:text-foreground transition">How it works</a>
          <a href="#features" className="hover:text-foreground transition">Features</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground">Sign in</Link>
          <Link
            to="/auth"
            className="text-sm bg-brand px-4 py-2 rounded-lg font-medium text-white hover:opacity-90 transition"
          >
            Get started
          </Link>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 pt-16 pb-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs text-muted-foreground mb-6"
        >
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          Powered by a Supervisor + 7 specialised AI agents
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="font-display text-5xl md:text-7xl font-bold leading-[1.05] tracking-tight"
        >
          Your{" "}
          <span className="text-gradient">scholarship team</span>
          <br /> in one intelligent workspace
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto"
        >
          Multi-agent AI discovers scholarships you actually qualify for, reviews your SOP, generates checklists,
          tracks every deadline, and explains every recommendation — with citations.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <Link to="/auth" className="bg-brand px-6 py-3 rounded-xl font-medium text-white flex items-center gap-2 glow hover:scale-[1.02] transition">
            Start free <ArrowRight className="w-4 h-4" />
          </Link>
          <Link to="/discover" className="glass px-6 py-3 rounded-xl font-medium hover:bg-white/5 transition">
            Browse scholarships
          </Link>
        </motion.div>

        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { k: "30+", v: "Curated scholarships" },
            { k: "8", v: "Cooperating agents" },
            { k: "9-stage", v: "Application tracker" },
            { k: "RAG", v: "Explainable matches" },
          ].map((s) => (
            <div key={s.v} className="glass rounded-2xl p-5 text-left">
              <div className="text-3xl font-display font-bold text-gradient">{s.k}</div>
              <div className="text-xs text-muted-foreground mt-1">{s.v}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Agents */}
      <section id="agents" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <div className="text-xs uppercase tracking-widest text-primary mb-2">The multi-agent stack</div>
          <h2 className="font-display text-4xl md:text-5xl font-bold">One supervisor. Seven specialists.</h2>
          <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
            Every task in ScholarAI is routed through a Supervisor agent that decides which specialists to call,
            with every step logged for transparency.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Brain, name: "Supervisor", desc: "Plans, routes, and reconciles outputs across agents." },
            { icon: Search, name: "Search", desc: "Retrieves scholarships via hybrid RAG (pgvector + keyword)." },
            { icon: ShieldCheck, name: "Eligibility", desc: "Verifies each scholarship against your profile." },
            { icon: LineChart, name: "Ranking", desc: "Explainable match scores weighted by 6 factors." },
            { icon: MessageSquareText, name: "Doc Review", desc: "Grammar, ATS, readability, actionable suggestions." },
            { icon: Rocket, name: "Checklist", desc: "Generates a step-by-step per-application plan." },
            { icon: CalendarClock, name: "Reminder", desc: "Tracks deadlines and prompts you at the right time." },
            { icon: Sparkles, name: "Tracker", desc: "9-stage application lifecycle from Saved to Awarded." },
          ].map((a, i) => (
            <motion.div
              key={a.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="glass rounded-2xl p-5"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/15 border border-primary/30 grid place-items-center mb-3">
                <a.icon className="w-5 h-5 text-primary" />
              </div>
              <div className="font-display text-lg font-semibold">{a.name} Agent</div>
              <div className="text-sm text-muted-foreground mt-1">{a.desc}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How */}
      <section id="how" className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { n: "01", t: "Build your profile", d: "Country, degree, CGPA, skills, target fields. The more you share, the sharper the matches." },
            { n: "02", t: "Let agents work", d: "Supervisor plans → Search retrieves → Eligibility filters → Ranking explains." },
            { n: "03", t: "Apply with confidence", d: "Reviewed documents, generated checklists, tracked deadlines, celebrated wins." },
          ].map((s) => (
            <div key={s.n} className="glass rounded-2xl p-6">
              <div className="text-5xl font-display font-bold text-gradient">{s.n}</div>
              <div className="mt-2 font-display text-xl font-semibold">{s.t}</div>
              <div className="text-sm text-muted-foreground mt-2">{s.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 pb-24 text-center">
        <div className="glass rounded-3xl p-10 elevated">
          <h3 className="font-display text-3xl md:text-4xl font-bold">Ready to win your scholarship?</h3>
          <p className="text-muted-foreground mt-3">Free forever core. No credit card. Start with your profile in under 60 seconds.</p>
          <Link to="/auth" className="mt-6 inline-flex bg-brand text-white px-6 py-3 rounded-xl font-medium glow items-center gap-2">
            Create your account <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <footer className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-2">
        <div>© {new Date().getFullYear()} ScholarAI. Built with TanStack, Lovable Cloud & Lovable AI.</div>
        <div className="flex gap-4">
          <a href="#" className="hover:text-foreground">Privacy</a>
          <a href="#" className="hover:text-foreground">Terms</a>
        </div>
      </footer>
    </div>
  );
}
