"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Loader2,
  CheckCircle2,
  User,
  Mail,
  MessageSquare,
  FileText,
} from "lucide-react";
import toast from "react-hot-toast";

interface FormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

interface FieldErrors {
  name?: string[];
  email?: string[];
  subject?: string[];
  message?: string[];
}

export default function ContactForm() {
  const [form, setForm] = useState<FormData>({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear error on change
    if (errors[name as keyof FieldErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.errors) {
          setErrors(data.errors);
        }
        toast.error(data.error || "Something went wrong.");
        return;
      }

      setSubmitted(true);
      toast.success("Message sent successfully!");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setForm({ name: "", email: "", subject: "", message: "" });
    setErrors({});
    setSubmitted(false);
  }

  // ─── Success State ───────────────────────────────────
  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass p-10 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
          className="w-20 h-20 mx-auto rounded-full bg-green-500/15 border border-green-400/25 flex items-center justify-center mb-6"
        >
          <CheckCircle2 className="w-10 h-10 text-green-400" />
        </motion.div>
        <h3 className="text-2xl font-bold text-foreground mb-2">
          Message Sent!
        </h3>
        <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
          Thank you for reaching out. A confirmation email has been sent to your
          inbox. We&apos;ll get back to you within 24 hours.
        </p>
        <button onClick={handleReset} className="btn-secondary">
          Send Another Message
        </button>
      </motion.div>
    );
  }

  // ─── Form ─────────────────────────────────────────────
  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="glass p-6 sm:p-8 space-y-5"
    >
      {/* Name */}
      <div>
        <label htmlFor="contact-name" className="label flex items-center gap-1.5">
          <User className="w-3.5 h-3.5" />
          Full Name <span className="text-red-400">*</span>
        </label>
        <input
          id="contact-name"
          name="name"
          type="text"
          placeholder="John Doe"
          value={form.name}
          onChange={handleChange}
          className={`input-glass ${errors.name ? "border-red-400/60 focus:border-red-400 focus:ring-red-400/30" : ""}`}
        />
        <AnimatePresence>
          {errors.name && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="text-red-400 text-xs mt-1.5"
            >
              {errors.name[0]}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Email */}
      <div>
        <label htmlFor="contact-email" className="label flex items-center gap-1.5">
          <Mail className="w-3.5 h-3.5" />
          Email Address <span className="text-red-400">*</span>
        </label>
        <input
          id="contact-email"
          name="email"
          type="email"
          placeholder="john@example.com"
          value={form.email}
          onChange={handleChange}
          className={`input-glass ${errors.email ? "border-red-400/60 focus:border-red-400 focus:ring-red-400/30" : ""}`}
        />
        <AnimatePresence>
          {errors.email && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="text-red-400 text-xs mt-1.5"
            >
              {errors.email[0]}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Subject */}
      <div>
        <label htmlFor="contact-subject" className="label flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5" />
          Subject <span className="text-muted-foreground text-xs">(optional)</span>
        </label>
        <input
          id="contact-subject"
          name="subject"
          type="text"
          placeholder="How can we help?"
          value={form.subject}
          onChange={handleChange}
          className={`input-glass ${errors.subject ? "border-red-400/60 focus:border-red-400 focus:ring-red-400/30" : ""}`}
        />
        <AnimatePresence>
          {errors.subject && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="text-red-400 text-xs mt-1.5"
            >
              {errors.subject[0]}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Message */}
      <div>
        <label htmlFor="contact-message" className="label flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5" />
          Message <span className="text-red-400">*</span>
        </label>
        <textarea
          id="contact-message"
          name="message"
          rows={5}
          placeholder="Tell us what you need help with..."
          value={form.message}
          onChange={handleChange}
          className={`input-glass resize-none ${errors.message ? "border-red-400/60 focus:border-red-400 focus:ring-red-400/30" : ""}`}
        />
        <div className="flex justify-between items-center mt-1">
          <AnimatePresence>
            {errors.message && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="text-red-400 text-xs"
              >
                {errors.message[0]}
              </motion.p>
            )}
          </AnimatePresence>
          <span className="text-muted-foreground text-xs ml-auto">
            {form.message.length} / 5000
          </span>
        </div>
      </div>

      {/* Submit */}
      <motion.button
        type="submit"
        disabled={loading}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        className="btn-primary w-full py-3.5 text-base"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Sending...
          </>
        ) : (
          <>
            <Send className="w-5 h-5" />
            Send Message
          </>
        )}
      </motion.button>

      <p className="text-muted-foreground text-xs text-center">
        We typically respond within 24 hours on business days.
      </p>
    </motion.form>
  );
}
