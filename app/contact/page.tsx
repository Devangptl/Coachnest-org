/**
 * /contact — Contact Us page
 */
import type { Metadata } from "next";
import {
  Mail,
  MapPin,
  Clock,
  Phone,
  MessageCircle,
  Sparkles,
  ArrowRight,
  HelpCircle,
  BookOpen,
  Users,
} from "lucide-react";
import ContactForm from "@/components/contact/ContactForm";

export const metadata: Metadata = {
  title: "Contact Us — Coachnest",
  description:
    "Get in touch with the Coachnest team. We're here to help with courses, technical support, partnerships, and more.",
};

const CONTACT_CARDS = [
  {
    icon: Mail,
    title: "Email Us",
    detail: "support@coachnest.com",
    sub: "We reply within 24 hours",
    iconColor: "text-orange-500",
    bgColor: "bg-orange-500/10 border-orange-500/20",
  },
  {
    icon: Phone,
    title: "Call Us",
    detail: "+91 98765 43210",
    sub: "Mon–Fri, 9 AM – 6 PM IST",
    iconColor: "text-blue-500",
    bgColor: "bg-blue-500/10 border-blue-500/20",
  },
  {
    icon: MapPin,
    title: "Visit Us",
    detail: "Mumbai, Maharashtra",
    sub: "India",
    iconColor: "text-purple-500",
    bgColor: "bg-purple-500/10 border-purple-500/20",
  },
  {
    icon: Clock,
    title: "Business Hours",
    detail: "Mon – Fri, 9:00 – 18:00",
    sub: "Indian Standard Time (IST)",
    iconColor: "text-emerald-500",
    bgColor: "bg-emerald-500/10 border-emerald-500/20",
  },
];

const FAQ_ITEMS = [
  {
    icon: HelpCircle,
    question: "How do I reset my password?",
    answer:
      "Go to the login page and click 'Forgot Password'. Follow the instructions sent to your registered email.",
  },
  {
    icon: BookOpen,
    question: "Can I get a refund for a course?",
    answer:
      "Yes, we offer a 7-day refund policy for all paid courses if you haven't completed more than 25% of the content.",
  },
  {
    icon: Users,
    question: "Do you offer team or enterprise plans?",
    answer:
      "Absolutely! Contact us using the form and we'll set up a tailored plan for your organization.",
  },
];

export default function ContactPage() {
  return (
    <div className="min-h-screen">
      {/* ─── Hero ─────────────────────────────────────────────────── */}
      <section className="relative pt-8 pb-16 overflow-hidden">
        <div className="absolute inset-0 hero-dot-grid opacity-40 pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-orange-600/[.06] rounded-full blur-[120px] pointer-events-none" />

        <div className="relative mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-[#d97757]/20 text-orange-500 text-xs font-semibold mb-6">
            <MessageCircle className="w-3.5 h-3.5" />
            Get In Touch
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-foreground mb-4">
            We&apos;d Love to{" "}
            <span className="hero-gradient-text">Hear from You</span>
          </h1>
          <p className="text-muted-foreground text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
            Have a question, feedback, or partnership inquiry? Our team is ready
            to help. Reach out and we&apos;ll get back to you as soon as possible.
          </p>
        </div>
      </section>

      {/* ─── Contact Info Cards ───────────────────────────────────── 
        <section className="mx-auto px-4 sm:px-6 -mt-4 mb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CONTACT_CARDS.map(({ icon: Icon, title, detail, sub, iconColor, bgColor }) => (
            <div
              key={title}
              className="rounded-md border border-border/60 bg-secondary/20 p-5 flex gap-4 transition-all  hover:border-border"
            >
              <div className={`w-9 h-9 rounded-lg ${bgColor} border flex items-center justify-center shrink-0 mt-0.5`}>
                <Icon className={`w-4 h-4 ${iconColor}`} />
              </div>
              <div>
                <p className="text-foreground font-medium text-sm mb-0.5">{title}</p>
                <p className="text-foreground/80 text-sm">{detail}</p>
                <p className="text-muted-foreground text-xs mt-0.5">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
        */}
      

      {/* ─── Main Form + Sidebar ──────────────────────────────────── */}
      <section className="mx-auto px-4 sm:px-6 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">

          {/* Sidebar */}
          <div className="lg:col-span-2 space-y-4">
            {/* How Can We Help */}
            <div className="rounded-md border border-border/60 bg-secondary/20 p-6">
              <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-orange-500" />
                How Can We Help?
              </h2>
              <ul className="space-y-3">
                {[
                  "Course content questions & support",
                  "Technical issues & bug reports",
                  "Partnership & collaboration inquiries",
                  "Enterprise & team plan requests",
                  "Feedback & feature suggestions",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <ArrowRight className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* FAQ */}
            <div className="rounded-md border border-border/60 bg-secondary/20 p-6">
              <h2 className="text-base font-bold text-foreground mb-4">
                Frequently Asked Questions
              </h2>
              <div className="space-y-4">
                {FAQ_ITEMS.map(({ icon: FaqIcon, question, answer }) => (
                  <div key={question}>
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-1">
                      <FaqIcon className="w-4 h-4 text-orange-500 flex-shrink-0" />
                      {question}
                    </h4>
                    <p className="text-muted-foreground text-xs pl-6 leading-relaxed">
                      {answer}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Response time */}
            <div className="rounded-md border border-orange-500/20 bg-orange-500/5 p-5 flex gap-3 items-center">
              <div className="w-9 h-9 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 text-orange-500" />
              </div>
              <div>
                <p className="text-foreground text-sm font-semibold">Average Response Time</p>
                <p className="text-muted-foreground text-xs">Under 12 hours on business days</p>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-3">
            <ContactForm />
          </div>

        </div>
      </section>
    </div>
  );
}
