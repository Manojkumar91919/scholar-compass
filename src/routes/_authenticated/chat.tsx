import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { aiChat } from "@/lib/scholar.functions";
import { Send, Loader2, Sparkles, Bot, User } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion } from "framer-motion";

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({ meta: [{ title: "AI Assistant — ScholarAI" }] }),
  component: ChatPage,
});

type Msg = { role: "user" | "assistant"; content: string; sources?: Array<{ id: string; title: string; provider: string }> };

function ChatPage() {
  const chat = useServerFn(aiChat);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm ScholarAI — your multi-agent scholarship assistant. Ask about scholarships, eligibility, essays, deadlines, or anything in between. I'll cite the sources I use.",
    },
  ]);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const send = useMutation({
    mutationFn: async (userText: string) => {
      const history = [...messages, { role: "user" as const, content: userText }];
      return await chat({ data: { messages: history.map((m) => ({ role: m.role, content: m.content })) } });
    },
    onSuccess: (r) => {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: r.reply,
          sources: r.sources.map((s) => ({ id: s.id, title: s.title, provider: s.provider })),
        },
      ]);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Chat failed"),
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, send.isPending]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || send.isPending) return;
    setMessages((m) => [...m, { role: "user", content: input }]);
    send.mutate(input);
    setInput("");
  }

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
        <div className="mb-4">
          <h1 className="font-display text-3xl font-bold">AI Assistant</h1>
          <p className="text-muted-foreground text-sm">Powered by supervisor + search + RAG</p>
        </div>
        <div className="flex-1 overflow-auto space-y-4 pb-4">
          {messages.map((m, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`w-8 h-8 rounded-full grid place-items-center shrink-0 ${m.role === "user" ? "bg-primary/20" : "bg-brand glow"}`}>
                {m.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4 text-white" />}
              </div>
              <div className={`glass rounded-2xl p-4 max-w-[80%] ${m.role === "user" ? "bg-primary/10" : ""}`}>
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                </div>
                {m.sources && m.sources.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Sparkles className="w-3 h-3 text-primary" /> Sources</div>
                    <div className="flex flex-wrap gap-1.5">
                      {m.sources.map((s) => (
                        <a key={s.id} href={`/scholarship/${s.id}`} className="text-xs bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded-full hover:bg-primary/20">
                          {s.title}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
          {send.isPending && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-brand grid place-items-center glow"><Bot className="w-4 h-4 text-white" /></div>
              <div className="glass rounded-2xl p-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Thinking…
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
        <form onSubmit={submit} className="glass rounded-2xl p-3 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about scholarships, eligibility, essays…"
            disabled={send.isPending}
            className="flex-1 bg-transparent focus:outline-none px-2"
          />
          <button type="submit" disabled={send.isPending || !input.trim()} className="bg-brand text-white px-4 py-2 rounded-xl flex items-center gap-1 disabled:opacity-50">
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </AppShell>
  );
}
