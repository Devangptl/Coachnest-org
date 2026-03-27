/**
 * /contact — Contact Us page
 * A premium contact page with contact information + form.
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
  title: "Contact Us — CoachNest",
  description:
    "Get in touch with the CoachNest team. We're here to help with courses, technical support, partnerships, and more.",
};

const CONTACT_CARDS = [
  {
    icon: Mail,
    title: "Email Us",
    detail: "support@coachnest.com",
    sub: "We reply within 24 hours",
    color: "from-orange-500 to-amber-500",
    bgColor: "bg-orange-500/10 border-orange-400/20",
  },
  {
    icon: Phone,
    title: "Call Us",
    detail: "+91 98765 43210",
    sub: "Mon–Fri, 9 AM – 6 PM IST",
    color: "from-blue-500 to-cyan-500",
    bgColor: "bg-blue-500/10 border-blue-400/20",
  },
  {
    icon: MapPin,
    title: "Visit Us",
    detail: "Mumbai, Maharashtra",
    sub: "India",
    color: "from-purple-500 to-pink-500",
    bgColor: "bg-purple-500/10 border-purple-400/20",
  },
  {
    icon: Clock,
    title: "Business Hours",
    detail: "Mon – Fri, 9:00 – 18:00",
    sub: "Indian Standard Time (IST)",
    color: "from-green-500 to-emerald-500",
    bgColor: "bg-green-500/10 border-green-400/20",
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
      {/* ─── Hero Section ─────────────────────────────────────────── */}
      <section className="relative pt-8 pb-16 overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 hero-dot-grid opacity-40 pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-orange-600/[.06] rounded-full blur-[120px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-400/20 text-orange-400 text-xs font-semibold mb-6">
            <MessageCircle className="w-3.5 h-3.5" />
            Get In Touch
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-foreground mb-4">
            We&apos;d Love to{" "}
            <span className="hero-gradient-text">Hear from You</span>
          </h1>
          <p className="text-muted-foreground text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
            Have a question, feedback, or partnership inquiry? Our team is ready
            to help. Reach out and we&apos;ll get back to you as soon as
            possible.
          </p>
        </div>
      </section>

      {/* ─── Contact Info Cards ────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 -mt-4 mb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CONTACT_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="glass p-5 group hover:border-orange-500/20 transition-all duration-300"
              >
                <div
                  className={`w-11 h-11 rounded-xl ${card.bgColor} border flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}
                >
                  <Icon className="w-5 h-5 text-foreground" />
                </div>
                <h3 className="text-foreground font-semibold text-sm mb-1">
                  {card.title}
                </h3>
                <p className="text-foreground text-sm">{card.detail}</p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  {card.sub}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── Main Form + Sidebar ──────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Left — Sidebar info */}
          <div className="lg:col-span-2 space-y-8">
            {/* Why Contact Section */}
            <div className="glass p-6">
              <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-orange-400" />
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
                  <li
                    key={item}
                    className="flex items-start gap-2.5 text-sm text-muted-foreground"
                  >
                    <ArrowRight className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* FAQ Section */}
            <div className="glass p-6">
              <h2 className="text-lg font-bold text-foreground mb-4">
                Frequently Asked Questions
              </h2>
              <div className="space-y-4">
                {FAQ_ITEMS.map((faq) => {
                  const FaqIcon = faq.icon;
                  return (
                    <div
                      key={faq.question}
                      className="group"
                    >
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-1">
                        <FaqIcon className="w-4 h-4 text-orange-400 flex-shrink-0" />
                        {faq.question}
                      </h4>
                      <p className="text-muted-foreground text-xs pl-6 leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Response time banner */}
            <div className="glass p-5 bg-gradient-to-r from-orange-500/5 to-amber-500/5 border-orange-400/15">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-500/15 border border-orange-400/25 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-foreground text-sm font-semibold">
                    Average Response Time
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Under 12 hours on business days
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right — Contact Form */}
          <div className="lg:col-span-3">
            <ContactForm />
          </div>
        </div>
      </section>
    </div>
  );
}
