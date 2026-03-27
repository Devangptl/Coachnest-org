"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import GlassCard from "@/components/GlassCard";
import { X, Send } from "lucide-react";

interface Props {
  studentId: string;
  studentName: string;
  onClose: () => void;
}

export default function SendNotificationModal({ studentId, studentName, onClose }: Props) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("SYSTEM");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      setResult({ type: "error", text: "Title and message are required." });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(`/api/admin/students/${studentId}/send-notification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, message, type }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send notification");
      }

      setResult({ type: "success", text: "Notification sent!" });
      setTimeout(onClose, 1200);
    } catch (err: any) {
      setResult({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-card flex items-center justify-center">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg max-w-lg w-full mx-4 border border-border">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-white">Send Notification</h2>
            <p className="text-muted-foreground/70 text-sm">To: {studentName}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          <div>
            <label className="text-muted-foreground text-sm font-medium mb-1.5 block">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-400/25 transition-all"
            >
              <option value="SYSTEM">System</option>
              <option value="COURSE_UPDATE">Course Update</option>
              <option value="REMINDER">Reminder</option>
              <option value="OFFER">Offer</option>
            </select>
          </div>

          <div>
            <label className="text-muted-foreground text-sm font-medium mb-1.5 block">Title</label>
            <input
              type="text"
              placeholder="Notification title"
              className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:border-orange-400/25 transition-all"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setResult(null); }}
            />
          </div>

          <div>
            <label className="text-muted-foreground text-sm font-medium mb-1.5 block">Message</label>
            <textarea
              rows={3}
              placeholder="Your message to the student..."
              className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:border-orange-400/25 transition-all resize-none"
              value={message}
              onChange={(e) => { setMessage(e.target.value); setResult(null); }}
            />
          </div>

          {result && (
            <div
              className={`text-sm px-4 py-2.5 rounded-xl border ${
                result.type === "success"
                  ? "bg-emerald-500/10 border-emerald-400/30 text-emerald-300"
                  : "bg-red-500/10 border-red-400/30 text-red-300"
              }`}
            >
              {result.text}
            </div>
          )}

          <div className="flex gap-3">
            <Button loading={loading} onClick={handleSend} className="flex-1">
              <Send className="w-4 h-4" /> Send
            </Button>
            <Button variant="ghost" onClick={onClose} className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
