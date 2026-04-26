/**
 * CertificatePreview — full-size on-screen certificate of completion.
 *
 * Visual layout mirrors the print cert: brand mark top-left, big serif title,
 * recipient name in brand-orange script, course meta, instructor signature,
 * a vertical "verified" ribbon with seal on the right, and a QR-style block
 * with the certificate id in the bottom-right.
 *
 * Renders at landscape A4 aspect ratio (1.414:1) and scales responsively.
 */
"use client";

import Image from "next/image";
import { format } from "date-fns";

interface Props {
  recipientName: string;
  courseTitle: string;
  issuedAt: Date | string;
  certificateId: string;
  instructorName?: string;
}

export default function CertificatePreview({
  recipientName,
  courseTitle,
  issuedAt,
  certificateId,
  instructorName = "Course Instructor",
}: Props) {
  const date = new Date(issuedAt);
  const shortId = certificateId.slice(0, 12).toUpperCase();

  return (
    <div className="relative w-full aspect-[1.414/1] bg-white text-slate-800 rounded-lg overflow-hidden shadow-xl border border-black/[0.06] font-serif select-none">
      {/* ── Guilloché-style background pattern ───────────────────────────── */}
      <GuillochePattern />

      {/* ── Brand mark top-left ──────────────────────────────────────────── */}
      <div className="absolute top-[5%] left-[5%] flex items-center gap-3">
        <div className="relative w-9 h-9 sm:w-12 sm:h-12 flex-shrink-0">
          <Image src="/logo.png" alt="CoachNest" fill className="object-contain" />
        </div>
        <div className="leading-[1.05] font-sans">
          <p className="text-base sm:text-xl font-extrabold text-orange-500 tracking-tight">Coach</p>
          <p className="text-base sm:text-xl font-extrabold text-slate-800 tracking-tight">Nest</p>
        </div>
      </div>

      {/* ── Title ────────────────────────────────────────────────────────── */}
      <div className="absolute top-[26%] left-[5%] right-[24%]">
        <h2 className="text-[clamp(1.1rem,3.4vw,2.6rem)] font-bold text-slate-900 tracking-wide leading-tight">
          CERTIFICATE OF COMPLETION
        </h2>
      </div>

      {/* ── Body: presented to / course / date ───────────────────────────── */}
      <div className="absolute top-[42%] left-[5%] right-[26%] space-y-[2%]">
        <p className="text-[clamp(0.6rem,1.1vw,0.95rem)] text-slate-600">Presented to</p>
        <p className="text-[clamp(1.2rem,3vw,2.2rem)] font-semibold italic text-orange-500 leading-tight truncate">
          {recipientName}
        </p>

        <div className="pt-[3%]">
          <p className="text-[clamp(0.6rem,1.1vw,0.95rem)] text-slate-600">
            For successfully completing an online course
          </p>
          <p className="text-[clamp(0.85rem,1.6vw,1.3rem)] font-bold text-slate-900 mt-[0.6%] leading-snug line-clamp-2">
            {courseTitle}
          </p>
          <p className="text-[clamp(0.6rem,1.1vw,0.9rem)] text-slate-600 mt-[0.8%]">
            Course completed on {format(date, "MMMM yyyy")}
          </p>
        </div>
      </div>

      {/* ── Signature ────────────────────────────────────────────────────── */}
      <div className="absolute bottom-[7%] left-[5%]">
        <SignatureMark />
        <p className="text-[clamp(0.7rem,1.2vw,1rem)] font-bold text-slate-800 mt-[2px]">
          {instructorName}
        </p>
        <p className="text-[clamp(0.55rem,0.95vw,0.8rem)] text-slate-500">
          Course Instructor, CoachNest
        </p>
      </div>

      {/* ── Side ribbon with verified seal ───────────────────────────────── */}
      <div className="absolute top-0 right-[18%] w-[7%] min-w-[36px] max-w-[72px] h-[58%]">
        <div className="absolute inset-x-0 top-0 bottom-[14px] bg-gradient-to-b from-orange-600 to-orange-500 shadow-md" />
        <div
          className="absolute bottom-0 inset-x-0 h-[14px] bg-orange-700"
          style={{ clipPath: "polygon(0 0, 100% 0, 50% 100%)" }}
        />
        <div className="absolute top-[58%] left-1/2 -translate-x-1/2 -translate-y-1/2">
          <VerifiedSeal />
        </div>
      </div>

      {/* ── QR-style block (verification placeholder) ───────────────────── */}
      <div className="absolute bottom-[7%] right-[5%] flex flex-col items-end gap-1">
        <div className="w-[clamp(48px,7vw,84px)] aspect-square bg-white border border-slate-300 p-[6px] shadow-sm">
          <QrPattern seed={certificateId} />
        </div>
        <p className="text-[clamp(0.45rem,0.7vw,0.65rem)] text-slate-400 tracking-wider font-mono">
          ID · {shortId}
        </p>
      </div>
    </div>
  );
}

/* ── Decorative pieces ───────────────────────────────────────────────────── */

function GuillochePattern() {
  // Concentric rotated ellipses — soft "spirograph" feel without an asset file.
  const rings = Array.from({ length: 14 }, (_, i) => i);
  return (
    <svg
      aria-hidden
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 1414 1000"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <radialGradient id="cert-fade" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#1d4ed8" stopOpacity="0.10" />
          <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g transform="translate(900 500)" opacity="0.55">
        {rings.map((i) => (
          <ellipse
            key={i}
            cx="0"
            cy="0"
            rx={420 - i * 14}
            ry={260 - i * 9}
            fill="none"
            stroke="url(#cert-fade)"
            strokeWidth="0.6"
            transform={`rotate(${i * 13})`}
          />
        ))}
      </g>
    </svg>
  );
}

function VerifiedSeal() {
  return (
    <svg viewBox="0 0 100 100" className="w-[clamp(40px,6vw,72px)] h-[clamp(40px,6vw,72px)] drop-shadow-md">
      <circle cx="50" cy="50" r="46" fill="#fff" stroke="#1d4ed8" strokeWidth="3" />
      <circle cx="50" cy="50" r="38" fill="none" stroke="#1d4ed8" strokeWidth="1" strokeDasharray="2 2" />
      {/* Stars ring */}
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2;
        const x = 50 + Math.cos(a) * 32;
        const y = 50 + Math.sin(a) * 32;
        return <circle key={i} cx={x} cy={y} r="1.4" fill="#f97316" />;
      })}
      {/* Center brand letter */}
      <text
        x="50"
        y="58"
        textAnchor="middle"
        fontFamily="serif"
        fontWeight="800"
        fontSize="28"
        fill="#1d4ed8"
      >
        C
      </text>
      {/* Curved label */}
      <defs>
        <path id="seal-top" d="M 16 50 a 34 34 0 0 1 68 0" fill="none" />
        <path id="seal-bot" d="M 16 50 a 34 34 0 0 0 68 0" fill="none" />
      </defs>
      <text fill="#1d4ed8" fontSize="7" fontWeight="700" letterSpacing="2">
        <textPath href="#seal-top" startOffset="50%" textAnchor="middle">
          VERIFIED
        </textPath>
      </text>
      <text fill="#1d4ed8" fontSize="7" fontWeight="700" letterSpacing="2">
        <textPath href="#seal-bot" startOffset="50%" textAnchor="middle">
          CERTIFICATE
        </textPath>
      </text>
    </svg>
  );
}

function SignatureMark() {
  // Stylised handwritten flourish — purely decorative, not a real signature.
  return (
    <svg viewBox="0 0 140 50" className="w-[clamp(70px,10vw,130px)] h-auto text-slate-800">
      <path
        d="M5 35 C 18 5, 32 50, 45 25 S 68 0, 78 30 T 110 22 L 130 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M55 38 q 18 -2 38 -1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function QrPattern({ seed }: { seed: string }) {
  // Deterministic 9×9 black-square pattern derived from the cert id —
  // visually QR-like, used as a placeholder until a real encoder is wired in.
  const SIZE = 9;
  const cells: boolean[] = [];
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  for (let i = 0; i < SIZE * SIZE; i++) {
    h = (h * 1664525 + 1013904223) >>> 0;
    cells.push((h & 1) === 1);
  }
  // Force three corner finder squares so it reads as a QR shape.
  const corners: [number, number][] = [
    [0, 0],
    [0, SIZE - 1],
    [SIZE - 1, 0],
  ];
  corners.forEach(([cx, cy]) => {
    for (let dy = 0; dy < 3; dy++) {
      for (let dx = 0; dx < 3; dx++) {
        const x = cx === 0 ? dx : cx - 2 + dx;
        const y = cy === 0 ? dy : cy - 2 + dy;
        const edge = dx === 0 || dy === 0 || dx === 2 || dy === 2;
        cells[y * SIZE + x] = edge;
      }
    }
  });

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full h-full" shapeRendering="crispEdges">
      {cells.map((on, i) => {
        if (!on) return null;
        const x = i % SIZE;
        const y = Math.floor(i / SIZE);
        return <rect key={i} x={x} y={y} width="1" height="1" fill="#0f172a" />;
      })}
    </svg>
  );
}
