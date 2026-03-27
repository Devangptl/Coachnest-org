"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Minus } from "lucide-react";

export default function CompareSection() {
  const features = [
    { feature: "Glassmorphism UI", us: true, them: false },
    { feature: "Free courses available", us: true, them: "Limited" },
    { feature: "Verified certificates", us: true, them: "Paid extra" },
    { feature: "Interactive quizzes", us: true, them: "Some" },
    { feature: "Progress tracking", us: true, them: true },
    { feature: "70% instructor revenue", us: true, them: false },
    { feature: "Lifetime course access", us: true, them: "Subscription" },
    { feature: "No ads or distractions", us: true, them: false },
  ];

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-orange-500/5 to-transparent pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[300px] bg-orange-500/10 rounded-[100%] blur-[100px] pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <span className="inline-block text-orange-400 text-sm font-semibold uppercase tracking-widest mb-2">
            Compare
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            CoachNest vs{" "}
            <span className="text-muted-foreground/70">the rest</span>
          </h2>
          <p className="text-muted-foreground/70 max-w-xl mx-auto text-base">
            See why thousands migrate to our platform every day.
          </p>
        </motion.div>

        {/* ── DESKTOP TABLE VIEW ( hidden on mobile ) ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="hidden md:block relative"
        >
          {/* Subtle glow specifically behind the CoachNest column */}
          <div className="absolute top-0 bottom-0 left-[33.33%] w-[33.33%] bg-gradient-to-b from-orange-500/10 via-orange-500/5 to-transparent rounded-2xl -z-10 blur-xl" />

          <div className="backdrop-blur-xl bg-white/[0.02] border border-white/[0.05] rounded-3xl overflow-hidden shadow-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="py-4 px-6 md:px-8 w-1/3 text-white/40 font-medium text-base border-b border-white/[0.05]">
                    Features
                  </th>
                  <th className="py-4 px-6 md:px-8 w-1/3 text-center border-b border-white/[0.05] relative">
                    <div className="absolute inset-0 bg-gradient-to-b from-orange-500/10 to-transparent pointer-events-none" />
                    <span className="relative z-10 text-orange-400 font-bold text-lg md:text-xl flex flex-col items-center gap-0.5">
                      CoachNest
                      <span className="text-orange-400/50 text-[10px] md:text-xs font-medium uppercase tracking-widest">Our Platform</span>
                    </span>
                  </th>
                  <th className="py-4 px-6 md:px-8 w-1/3 text-center border-b border-white/[0.05]">
                    <span className="text-white/40 font-semibold text-lg md:text-xl flex flex-col items-center gap-0.5">
                      Others
                      <span className="text-white/20 text-[10px] md:text-xs font-medium uppercase tracking-widest">Industry Average</span>
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {features.map((row, idx) => (
                  <tr
                    key={row.feature}
                    className="group border-b border-white/[0.02] last:border-0 hover:bg-white/[0.01] transition-colors"
                  >
                    {/* Feature Name */}
                    <td className="py-3.5 px-6 md:px-8 text-white/80 font-medium text-sm md:text-base group-hover:text-white transition-colors">
                      {row.feature}
                    </td>

                    {/* CoachNest Column */}
                    <td className="py-3.5 px-6 md:px-8 text-center relative">
                      <div className="absolute inset-0 bg-orange-500/[0.02] group-hover:bg-orange-500/[0.05] transition-colors pointer-events-none" />
                      {row.us === true ? (
                        <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-400 relative z-10">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      ) : (
                        <span className="text-muted-foreground/70 relative z-10 text-sm">{String(row.us)}</span>
                      )}
                    </td>

                    {/* Others Column */}
                    <td className="py-3.5 px-6 md:px-8 text-center text-sm">
                      {row.them === true ? (
                        <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white/5 text-white/40">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                      ) : row.them === false ? (
                        <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-500/5 text-red-400/50">
                          <Minus className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <span className="text-white/30 text-xs font-medium bg-white/5 px-2.5 py-1 rounded-full">
                          {row.them}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* ── MOBILE LIST VIEW ( visible only on small screens ) ── */}
        <div className="md:hidden space-y-4">
          <div className="flex justify-between px-4 mb-2">
            <span className="text-white/30 text-xs font-bold uppercase tracking-widest">Features</span>
            <div className="flex gap-8">
              <span className="text-orange-400 text-xs font-bold uppercase tracking-widest">Us</span>
              <span className="text-white/30 text-xs font-bold uppercase tracking-widest mr-2">Them</span>
            </div>
          </div>

          {features.map((row, idx) => (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.05 }}
              key={row.feature}
              className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-4 flex items-center justify-between"
            >
              <div className="text-white/80 font-medium text-sm w-1/2 pr-2">
                {row.feature}
              </div>
              
              <div className="flex items-center justify-end gap-6 w-1/2">
                {/* CoachNest status */}
                <div className="w-10 flex justify-center">
                  {row.us === true ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]" />
                  ) : (
                    <span className="text-muted-foreground/70 text-sm">{String(row.us)}</span>
                  )}
                </div>

                {/* Divider */}
                <div className="w-px h-6 bg-white/10" />

                {/* Others status */}
                <div className="w-16 flex justify-center">
                  {row.them === true ? (
                    <CheckCircle2 className="w-4 h-4 text-white/30" />
                  ) : row.them === false ? (
                    <Minus className="w-4 h-4 text-white/20" />
                  ) : (
                    <span className="text-white/30 text-[10px] font-medium uppercase truncate max-w-full">
                      {row.them}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        
        {/* Bottom Call to Action for Compare section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-12 text-center"
        >
          <div className="inline-block p-1 rounded-2xl bg-gradient-to-r from-orange-500/20 via-orange-400/10 to-transparent border border-orange-500/20 backdrop-blur-md">
            <div className="px-6 py-3 flex items-center gap-3 text-sm">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
              </span>
              <span className="text-white/80">Experience the difference today.</span>
              <a href="/signup" className="text-orange-400 font-semibold hover:text-orange-300 ml-2 transition-colors">
                Create free account &rarr;
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
