"use client";

const DICEBEAR_BASE = "https://api.dicebear.com/9.x/avataaars/svg";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ReviewItem {
  id: string;
  name: string;
  role: string;   // course title used as context
  avatar?: string | null;
  seed: string;   // DiceBear seed (user id or name)
  rating: number;
  text: string;
}

// ── Fallback dummy data (shown when DB has < 6 real reviews) ──────────────────

const DUMMY_ROW1: ReviewItem[] = [
  { id: "d1", name: "Alex Rivera",    role: "Full-Stack Web Development",  seed: "AlexRivera",    rating: 5, text: "Coachnest completely changed my trajectory. I landed a senior dev role 8 months after finishing my first course.", avatar: null },
  { id: "d2", name: "Priya Sharma",   role: "UI/UX Design Fundamentals",   seed: "PriyaSharma",   rating: 5, text: "The design courses are incredibly hands-on. Real projects, real feedback — not just theory.", avatar: null },
  { id: "d3", name: "Marcus Johnson", role: "Product Management",          seed: "MarcusJohnson", rating: 5, text: "Earned my certificate in 3 months while working full-time. The pacing is perfect for busy people.", avatar: null },
  { id: "d4", name: "Emily Watson",   role: "Data Analytics with Python",  seed: "EmilyWatson",   rating: 5, text: "The interactive quizzes after each lesson genuinely make concepts stick. I retained so much more than other platforms.", avatar: null },
  { id: "d5", name: "James Park",     role: "Backend Engineering",         seed: "JamesPark",     rating: 5, text: "Best investment I've made in my education. The content is always up-to-date with industry standards.", avatar: null },
  { id: "d6", name: "Liam O'Connor",  role: "JavaScript Mastery",         seed: "LiamOConnor",   rating: 5, text: "Zero to employed in 6 months. The structured learning path took all the guesswork out of what to study next.", avatar: null },
];

const DUMMY_ROW2: ReviewItem[] = [
  { id: "d7",  name: "Sofia Martinez",  role: "React & Next.js",           seed: "SofiaMartinez",  rating: 5, text: "The certificate from Coachnest actually gets noticed by recruiters. It carries real weight in interviews.", avatar: null },
  { id: "d8",  name: "David Kim",       role: "DevOps & Cloud",            seed: "DavidKim",       rating: 5, text: "Clear, concise, and always current. I've recommended Coachnest to my entire engineering team.", avatar: null },
  { id: "d9",  name: "Rachel Thompson", role: "Frontend Development",      seed: "RachelThompson", rating: 5, text: "The progress tracking kept me accountable. Seeing my streaks grow pushed me to show up every single day.", avatar: null },
  { id: "d10", name: "Aisha Patel",     role: "Tech Leadership",           seed: "AishaPatel",     rating: 5, text: "I use Coachnest to upskill my whole team. The quality is consistently excellent across every subject.", avatar: null },
  { id: "d11", name: "Noah Williams",   role: "Mobile App Development",    seed: "NoahWilliams",   rating: 5, text: "Switched careers at 32 with help from these courses. The community support made all the difference.", avatar: null },
  { id: "d12", name: "Chen Wei",        role: "Cloud Architecture",        seed: "ChenWei",        rating: 5, text: "Went from beginner to AWS certified in four months. The structured path is genuinely world-class.", avatar: null },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5 mb-3">
      {Array.from({ length: Math.min(count, 5) }).map((_, i) => (
        <svg key={i} className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#ea580c]" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: ReviewItem }) {
  const avatarUrl = review.avatar
    ? review.avatar
    : `${DICEBEAR_BASE}?seed=${encodeURIComponent(review.seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffdfbf,ffd5dc&radius=50`;

  const initials = review.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <article className="flex-shrink-0 w-[220px] sm:w-[260px] md:w-[280px] lg:w-[300px] mx-2 sm:mx-3 bg-card border border-border rounded-xl p-4 sm:p-5 flex flex-col gap-3 shadow-card">
      <StarRating count={review.rating} />
      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed flex-1 line-clamp-4">
        &ldquo;{review.text}&rdquo;
      </p>
      <div className="flex items-center gap-2.5 pt-1 border-t border-border/50">
        {review.avatar ? (
          <img
            src={review.avatar}
            alt={review.name}
            width={36}
            height={36}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex-shrink-0 object-cover bg-secondary"
            loading="lazy"
          />
        ) : (
          <img
            src={avatarUrl}
            alt={initials}
            width={36}
            height={36}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex-shrink-0 bg-secondary"
            loading="lazy"
            onError={(e) => {
              const target = e.currentTarget;
              target.style.display = "none";
              const fallback = target.nextElementSibling as HTMLElement | null;
              if (fallback) fallback.style.display = "flex";
            }}
          />
        )}
        {/* Initials fallback (hidden until img errors) */}
        <span
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex-shrink-0 bg-gradient-to-br from-[#ea580c] to-[#fb923c] text-white text-xs font-bold items-center justify-center hidden"
          aria-hidden
        >
          {initials}
        </span>
        <div className="min-w-0">
          <p className="text-xs sm:text-sm font-semibold text-foreground leading-tight truncate">{review.name}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground truncate" title={review.role}>{review.role}</p>
        </div>
      </div>
    </article>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  reviews?: ReviewItem[];
}

export default function ReviewsMarquee({ reviews = [] }: Props) {
  // Use real data when we have enough; fall back to dummy otherwise
  const useReal = reviews.length >= 6;

  const row1 = useReal ? reviews.slice(0, Math.ceil(reviews.length / 2)) : DUMMY_ROW1;
  const row2 = useReal ? reviews.slice(Math.ceil(reviews.length / 2))    : DUMMY_ROW2;

  // Each row needs at least 2 copies for seamless loop
  const track1 = [...row1, ...row1];
  const track2 = [...row2, ...row2];

  return (
    <section className="py-10 sm:py-14 md:py-16 lg:py-20 overflow-hidden">
      {/* Section header */}
      <div className="text-center px-4 mb-8 sm:mb-10 md:mb-12">
        <p className="text-xs sm:text-sm uppercase tracking-widest text-muted-foreground font-medium mb-2">
          Learner reviews
        </p>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-foreground tracking-tight">
          Trusted by thousands of learners
        </h2>
      </div>

      <div className="relative">
        {/* Edge fade masks */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-16 sm:w-24 lg:w-40 z-10 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-16 sm:w-24 lg:w-40 z-10 bg-gradient-to-l from-background to-transparent" />

        {/* Row 1 — left to right */}
        <div className="flex mb-3 sm:mb-4 w-max animate-marquee-ltr">
          {track1.map((r, i) => <ReviewCard key={`r1-${r.id}-${i}`} review={r} />)}
        </div>

        {/* Row 2 — right to left */}
        <div className="flex w-max animate-marquee-rtl">
          {track2.map((r, i) => <ReviewCard key={`r2-${r.id}-${i}`} review={r} />)}
        </div>
      </div>
    </section>
  );
}
