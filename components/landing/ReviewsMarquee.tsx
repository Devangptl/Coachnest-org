"use client";

const DICEBEAR_BASE = "https://api.dicebear.com/9.x/avataaars/svg";

const reviews = [
  {
    name: "Alex Rivera",
    role: "Full-Stack Developer",
    seed: "AlexRivera",
    rating: 5,
    text: "LearnHub completely changed my trajectory. I landed a senior dev role 8 months after finishing my first course.",
  },
  {
    name: "Priya Sharma",
    role: "UX Designer",
    seed: "PriyaSharma",
    rating: 5,
    text: "The design courses are incredibly hands-on. Real projects, real feedback — not just theory.",
  },
  {
    name: "Marcus Johnson",
    role: "Product Manager",
    seed: "MarcusJohnson",
    rating: 5,
    text: "Earned my certificate in 3 months while working full-time. The pacing is perfect for busy people.",
  },
  {
    name: "Emily Watson",
    role: "Data Analyst",
    seed: "EmilyWatson",
    rating: 5,
    text: "The interactive quizzes after each lesson genuinely make concepts stick. I retained so much more than other platforms.",
  },
  {
    name: "James Park",
    role: "Backend Engineer",
    seed: "JamesPark",
    rating: 5,
    text: "Best investment I've made in my education. The content is always up-to-date with industry standards.",
  },
  {
    name: "Liam O'Connor",
    role: "Software Engineer",
    seed: "LiamOConnor",
    rating: 5,
    text: "Zero to employed in 6 months. The structured learning path took all the guesswork out of what to study next.",
  },
];

const reviews2 = [
  {
    name: "Sofia Martinez",
    role: "UI Designer",
    seed: "SofiaMartinez",
    rating: 5,
    text: "The certificate from CoachNest actually gets noticed by recruiters. It carries real weight in interviews.",
  },
  {
    name: "David Kim",
    role: "DevOps Engineer",
    seed: "DavidKim",
    rating: 5,
    text: "Clear, concise, and always current. I've recommended CoachNest to my entire engineering team.",
  },
  {
    name: "Rachel Thompson",
    role: "Frontend Developer",
    seed: "RachelThompson",
    rating: 5,
    text: "The progress tracking kept me accountable. Seeing my streaks grow pushed me to show up every single day.",
  },
  {
    name: "Aisha Patel",
    role: "Tech Lead",
    seed: "AishaPatel",
    rating: 5,
    text: "I use CoachNest to upskill my whole team. The quality is consistently excellent across every subject.",
  },
  {
    name: "Noah Williams",
    role: "Mobile Developer",
    seed: "NoahWilliams",
    rating: 5,
    text: "Switched careers at 32 with help from these courses. The community support made all the difference.",
  },
  {
    name: "Chen Wei",
    role: "Cloud Architect",
    seed: "ChenWei",
    rating: 5,
    text: "Went from beginner to AWS certified in four months. The structured path is genuinely world-class.",
  },
];

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5 mb-3">
      {Array.from({ length: count }).map((_, i) => (
        <svg key={i} className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#ea580c]" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

type Review = typeof reviews[0];

function ReviewCard({ review }: { review: Review }) {
  const avatarUrl = `${DICEBEAR_BASE}?seed=${review.seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffdfbf,ffd5dc&radius=50`;

  return (
    <article className="flex-shrink-0 w-[220px] sm:w-[260px] lg:w-[300px] mx-2 sm:mx-3 bg-card border border-border rounded-xl p-4 sm:p-5 flex flex-col gap-3 shadow-card">
      <StarRating count={review.rating} />
      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed flex-1">
        &ldquo;{review.text}&rdquo;
      </p>
      <div className="flex items-center gap-2.5 pt-1 border-t border-border/50">
        <img
          src={avatarUrl}
          alt={review.name}
          width={36}
          height={36}
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex-shrink-0 bg-secondary"
          loading="lazy"
        />
        <div className="min-w-0">
          <p className="text-xs sm:text-sm font-semibold text-foreground leading-tight truncate">{review.name}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{review.role}</p>
        </div>
      </div>
    </article>
  );
}

export default function ReviewsMarquee() {
  return (
    <section className="py-10 sm:py-14 lg:py-20 overflow-hidden">
      {/* Section header */}
      <div className="text-center px-4 mb-8 sm:mb-10">
        <p className="text-xs sm:text-sm uppercase tracking-widest text-muted-foreground font-medium mb-2">
          Learner reviews
        </p>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-foreground tracking-tight">
          Trusted by thousands of learners
        </h2>
      </div>

      <div className="relative">
        {/* Edge fade masks — wider on larger screens */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-16 sm:w-24 lg:w-40 z-10 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-16 sm:w-24 lg:w-40 z-10 bg-gradient-to-l from-background to-transparent" />

        {/* Row 1 — left to right */}
        <div className="flex mb-3 sm:mb-4 w-max animate-marquee-ltr">
          {[...reviews, ...reviews].map((r, i) => (
            <ReviewCard key={i} review={r} />
          ))}
        </div>

        {/* Row 2 — right to left */}
        <div className="flex w-max animate-marquee-rtl">
          {[...reviews2, ...reviews2].map((r, i) => (
            <ReviewCard key={i} review={r} />
          ))}
        </div>
      </div>
    </section>
  );
}
