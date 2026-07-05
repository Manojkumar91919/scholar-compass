import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { aiChat } from "@/lib/scholar.functions";
import { Send, Loader2, Sparkles, Bot, User, Copy, Check, BookOpen } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({ meta: [{ title: "AI Assistant — ScholarAI" }] }),
  component: ChatPage,
});

type Source = { id: string; title: string; provider: string };
type Msg = { role: "user" | "assistant"; content: string; sources?: Source[]; at: number };

const SUGGESTIONS = [
  "Find fully-funded Master's scholarships in Europe",
  "What documents do I need for a Fulbright application?",
  "Show me STEM scholarships with deadlines this month",
  "Help me draft an SOP outline for MIT",
];

function ChatPage() {
  const chat = useServerFn(aiChat);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      at: Date.now(),
      content:
        "Hi! I'm **ScholarAI** — your multi-agent scholarship assistant.\n\nAsk me about scholarships, eligibility, essays, or deadlines. I run a supervisor → search → RAG pipeline and cite the sources I use.",
    },
  ]);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const send = useMutation({
    mutationFn: async (userText: string) => {
      const history = [...messages, { role: "user" as const, content: userText, at: Date.now() }];
      return await chat({ data: { messages: history.map((m) => ({ role: m.role, content: m.content })) } });
    },
    onSuccess: (r) => {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          at: Date.now(),
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
    ask(input);
  }
  function ask(text: string) {
    const t = text.trim();
    if (!t || send.isPending) return;
    setMessages((m) => [...m, { role: "user", content: t, at: Date.now() }]);
    send.mutate(t);
    setInput("");
  }

  const showSuggestions = messages.length <= 1 && !send.isPending;

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
        <div className="mb-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand grid place-items-center glow shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold leading-tight">AI Assistant</h1>
            <p className="text-muted-foreground text-xs">Supervisor · Search · RAG · Cited sources</p>
          </div>
        </div>

        <div className="flex-1 overflow-auto space-y-5 pb-4 pr-1">
          <AnimatePresence initial={false}>
            {messages.map((m, i) => (
              <MessageBubble key={i} msg={m} />
            ))}
          </AnimatePresence>

          {send.isPending && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
              <Avatar role="assistant" />
              <div className="glass rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground">
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
                Thinking through your question…
              </div>
            </motion.div>
          )}
          <div ref={endRef} />
        </div>

        {showSuggestions && (
          <div className="grid sm:grid-cols-2 gap-2 mb-3">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => ask(s)}
                className="text-left text-sm glass rounded-xl px-3 py-2 hover:bg-primary/10 hover:border-primary/30 transition-colors border border-transparent"
              >
                <Sparkles className="w-3 h-3 text-primary inline mr-1.5" />
                {s}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={submit} className="glass rounded-2xl p-2 flex gap-2 items-center border border-border/60 focus-within:border-primary/50 transition-colors">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about scholarships, eligibility, essays…"
            disabled={send.isPending}
            className="flex-1 bg-transparent focus:outline-none px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={send.isPending || !input.trim()}
            className="bg-brand text-white h-9 w-9 rounded-xl grid place-items-center disabled:opacity-40 hover:opacity-90"
            aria-label="Send"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </AppShell>
  );
}

function Avatar({ role }: { role: "user" | "assistant" }) {
  return (
    <div
      className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${
        role === "user" ? "bg-primary/15 border border-primary/30" : "bg-brand glow"
      }`}
    >
      {role === "user" ? <User className="w-4 h-4 text-primary" /> : <Bot className="w-4 h-4 text-white" />}
    </div>
  );
}

function MessageBubble({ msg }: { msg: Msg }) {
  const [copied, setCopied] = useState(false);
  const isUser = msg.role === "user";

  function copy() {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}
    >
      <Avatar role={msg.role} />
      <div className={`flex flex-col gap-1.5 max-w-[85%] ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`px-4 py-3 rounded-2xl ${
            isUser
              ? "bg-primary/15 border border-primary/25 rounded-tr-sm"
              : "glass rounded-tl-sm relative group"
          }`}
        >
          <div className="prose prose-invert prose-sm max-w-none prose-p:my-2 prose-headings:mt-3 prose-headings:mb-2 prose-headings:font-display prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:text-foreground">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
          </div>
          {!isUser && (
            <button
              onClick={copy}
              className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition bg-background border border-border rounded-lg p-1.5 text-muted-foreground hover:text-foreground"
              aria-label="Copy"
            >
              {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
            </button>
          )}
        </div>

        {msg.sources && msg.sources.length > 0 && (
          <div className="glass rounded-xl p-3 w-full">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
              <BookOpen className="w-3 h-3 text-primary" />
              Sources ({msg.sources.length})
            </div>
            <div className="flex flex-wrap gap-1.5">
              {msg.sources.map((s, i) => (
                <a
                  key={s.id}
                  href={`/scholarship/${s.id}`}
                  className="group flex items-center gap-1.5 text-xs bg-primary/8 border border-primary/20 text-foreground px-2.5 py-1 rounded-full hover:bg-primary/15 hover:border-primary/40 transition-colors"
                >
                  <span className="grid place-items-center w-4 h-4 rounded-full bg-primary/20 text-[10px] text-primary font-medium">
                    {i + 1}
                  </span>
                  <span className="truncate max-w-[220px]">{s.title}</span>
                  <span className="text-muted-foreground text-[10px] group-hover:text-primary">
                    · {s.provider}
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}

        <div className={`text-[10px] text-muted-foreground/70 ${isUser ? "pr-1" : "pl-1"}`}>
          {new Date(msg.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    </motion.div>
  );
}
