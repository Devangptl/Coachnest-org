"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  X,
  Send,
  Bot,
  User,
  Loader2,
  Trash2,
  Minimize2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
}

interface Props {
  lessonId: string;
  lessonTitle: string;
}

export default function AiChatWidget({ lessonId, lessonTitle }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Load existing conversation for this lesson
  useEffect(() => {
    if (!isOpen) return;

    async function loadHistory() {
      setLoadingHistory(true);
      try {
        const res = await fetch(`/api/chat/history?lessonId=${lessonId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.conversationId) {
          setConversationId(data.conversationId);
          setMessages(data.messages);
        }
      } catch {
        // Silently fail — user can still start fresh
      } finally {
        setLoadingHistory(false);
      }
    }

    loadHistory();
  }, [isOpen, lessonId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId,
          message: text,
          conversationId,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        let msg = "Failed to send message";
        try {
          const data = JSON.parse(text);
          msg = data.error || msg;
        } catch {
          if (text.includes("429") || text.includes("RESOURCE_EXHAUSTED")) {
            msg = "AI service rate limit reached. Please wait a minute and try again.";
          }
        }
        throw new Error(msg);
      }

      const data = await res.json();
      setConversationId(data.conversationId);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response },
      ]);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Something went wrong";
      const isRateLimit = errorMsg.includes("rate limit") || errorMsg.includes("quota");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: isRateLimit
            ? "The AI service is currently rate-limited. Please wait a minute and try again."
            : `Sorry, I encountered an error: ${errorMsg}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleClear() {
    setMessages([]);
    setConversationId(null);
  }

  return (
    <>
      {/* Floating trigger button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-shadow"
            aria-label="Open AI Tutor"
          >
            <MessageCircle className="h-6 w-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-50 flex w-[400px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-gray-950 shadow-2xl shadow-black/50"
            style={{ height: "min(600px, calc(100vh - 6rem))" }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-white/10 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 px-4 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500/20">
                <Bot className="h-5 w-5 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-white">AI Tutor</h3>
                <p className="truncate text-xs text-gray-400">{lessonTitle}</p>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={handleClear}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
                  title="Clear conversation"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
                  title="Minimize"
                >
                  <Minimize2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
              {loadingHistory ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10">
                    <Bot className="h-6 w-6 text-blue-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-300">
                    Hi! I&apos;m your AI tutor
                  </p>
                  <p className="mt-1 text-xs text-gray-500 max-w-[260px]">
                    Ask me anything about this lesson. I&apos;ll help you understand the concepts.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2 justify-center">
                    {[
                      "Explain the key concepts",
                      "Summarize this lesson",
                      "Give me an example",
                    ].map((q) => (
                      <button
                        key={q}
                        onClick={() => {
                          setInput(q);
                          inputRef.current?.focus();
                        }}
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-300 hover:bg-white/10 transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex gap-2.5",
                      msg.role === "user" ? "flex-row-reverse" : "flex-row"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                        msg.role === "user"
                          ? "bg-indigo-500/20"
                          : "bg-blue-500/20"
                      )}
                    >
                      {msg.role === "user" ? (
                        <User className="h-3.5 w-3.5 text-indigo-400" />
                      ) : (
                        <Bot className="h-3.5 w-3.5 text-blue-400" />
                      )}
                    </div>
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                        msg.role === "user"
                          ? "bg-indigo-600/30 text-white rounded-tr-md"
                          : "bg-white/5 text-gray-200 rounded-tl-md"
                      )}
                    >
                      <div className="whitespace-pre-wrap break-words prose-sm prose-invert">
                        {msg.content}
                      </div>
                    </div>
                  </div>
                ))
              )}

              {loading && (
                <div className="flex gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-500/20">
                    <Bot className="h-3.5 w-3.5 text-blue-400" />
                  </div>
                  <div className="rounded-2xl rounded-tl-md bg-white/5 px-4 py-3">
                    <div className="flex gap-1">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-gray-500 [animation-delay:0ms]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-gray-500 [animation-delay:150ms]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-gray-500 [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="border-t border-white/10 bg-gray-950 px-3 py-3">
              <div className="flex items-end gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a question..."
                  rows={1}
                  className="flex-1 resize-none bg-transparent text-sm text-white placeholder:text-gray-500 focus:outline-none max-h-[100px]"
                  style={{
                    height: "auto",
                    minHeight: "24px",
                    overflow: "hidden",
                  }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = "auto";
                    target.style.height = Math.min(target.scrollHeight, 100) + "px";
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                    input.trim() && !loading
                      ? "bg-blue-500 text-white hover:bg-blue-400"
                      : "text-gray-600"
                  )}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="mt-1.5 text-center text-[10px] text-gray-600">
                AI responses may not always be accurate. Verify important information.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
