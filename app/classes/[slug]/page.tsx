/**
 * Public class detail (student view).
 *
 * The page returns a layout shell immediately and streams the class content
 * through a Suspense boundary, so navigation feels instant.
 */
import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  GraduationCap,
  Users,
  BookOpen,
  Calendar,
  Video,
  MessageCircle,
  Globe,
  Lock,
  Sparkles,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Skeleton } from "@/components/ui/Skeleton";
import JoinClassPanel from "./JoinClassPanel";
import StudentClassTabs from "./StudentClassTabs";
import ClassCourseList from "./ClassCourseList";

export default async function PublicClassPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ invite?: string }>;
}) {
  const { slug } = await params;
  const { invite } = await searchParams;

  return (
    <Suspense fallback={<ClassDetailSkeleton />}>
      <ClassDetailContent slug={slug} invite={invite} />
    </Suspense>
  );
}

async function ClassDetailContent({ slug, invite }: { slug: string; invite?: string }) {
  const session = await getSession();

  const cls = await prisma.class.findUnique({
    where: { slug },
    include: {
      instructor: { select: { id: true, name: true, avatar: true, headline: true } },
      courses: {
        orderBy: { order: "asc" },
        include: {
          course: {
            select: {
              id: true, title: true, slug: true, thumbnail: true,
              totalLessons: true, totalDuration: true,
            },
          },
        },
      },
      _count: {
        select: {
          enrollments: { where: { status: "APPROVED" } },
          liveSessions: true,
        },
      },
    },
  });

  if (!cls) notFound();
  if (cls.status !== "PUBLISHED" && cls.instructorId !== session?.userId) notFound();

  const enrollment = session
    ? await prisma.classEnrollment.findUnique({
        where: { classId_userId: { classId: cls.id, userId: session.userId } },
      })
    : null;

  const isMember =
    enrollment?.status === "APPROVED" || cls.instructorId === session?.userId;

  return (
    <div>
      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="relative">
        {cls.banner ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cls.banner}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/30 via-orange-500/15 to-violet-500/20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/85 to-background" />

        <div className="relative max-w-6xl mx-auto px-4 pt-8 pb-12">
          {/* Pills */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <Pill tone="amber">
              <GraduationCap className="w-3 h-3" /> Class
            </Pill>
            <Pill tone="slate">
              {cls.visibility === "PUBLIC" ? (
                <><Globe className="w-3 h-3" /> Public</>
              ) : (
                <><Lock className="w-3 h-3" /> Private</>
              )}
            </Pill>
            {cls.isPaid ? (
              <Pill tone="violet">Paid</Pill>
            ) : (
              <Pill tone="emerald">
                <Sparkles className="w-3 h-3" /> Free
              </Pill>
            )}
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold leading-tight max-w-3xl">
            {cls.name}
          </h1>

          {/* Instructor */}
          <Link
            href={`/instructors/${cls.instructor.id}`}
            className="inline-flex items-center gap-2 mt-3 text-sm text-muted-foreground hover:text-foreground"
          >
            {cls.instructor.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cls.instructor.avatar}
                alt=""
                className="w-6 h-6 rounded-full object-cover"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-[10px] font-bold text-amber-400">
                {cls.instructor.name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <span>
              by <span className="font-medium text-foreground">{cls.instructor.name}</span>
              {cls.instructor.headline && (
                <span className="text-muted-foreground"> · {cls.instructor.headline}</span>
              )}
            </span>
          </Link>

          {/* Meta pills */}
          <div className="flex flex-wrap gap-2 mt-4">
            <MetaPill
              icon={Users}
              label={`${cls._count.enrollments} ${cls._count.enrollments === 1 ? "student" : "students"}`}
            />
            <MetaPill icon={BookOpen} label={`${cls.courses.length} courses`} />
            {cls.enableLiveClass && (
              <MetaPill
                icon={Video}
                label={`${cls._count.liveSessions} live sessions`}
              />
            )}
            {cls.startDate && (
              <MetaPill
                icon={Calendar}
                label={`Starts ${new Date(cls.startDate).toLocaleDateString()}`}
              />
            )}
            {cls.enableChat && <MetaPill icon={MessageCircle} label="Chat" />}
          </div>
        </div>
      </section>

      {/* ── Main grid ─────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 pb-12 -mt-2">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {cls.description && (
              <div className="glass p-5 rounded-xl">
                <h2 className="text-sm font-semibold mb-2 uppercase tracking-wide text-muted-foreground">
                  About this class
                </h2>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {cls.description}
                </p>
              </div>
            )}

            <ClassCourseList
              classId={cls.id}
              enableChat={cls.enableChat}
              isMember={isMember}
              courses={cls.courses.map((cc) => ({
                courseId: cc.course.id,
                title: cc.course.title,
                thumbnail: cc.course.thumbnail,
                totalLessons: cc.course.totalLessons,
                isRequired: cc.isRequired,
              }))}
            />

            {isMember && (
              <StudentClassTabs
                classId={cls.id}
                enableChat={cls.enableChat}
                enableDiscussion={cls.enableDiscussion}
                currentUserId={session?.userId}
              />
            )}
          </div>

          <aside className="lg:col-span-1">
            <div className="glass p-5 rounded-xl sticky top-20 border border-amber-400/10">
              <JoinClassPanel
                classId={cls.id}
                slug={cls.slug}
                joinMode={cls.joinMode}
                isLoggedIn={!!session}
                enrollmentStatus={enrollment?.status ?? null}
                inviteCodeHint={invite}
                price={cls.price ? Number(cls.price) : null}
                isPaid={cls.isPaid}
                included={{
                  courses: cls.courses.length,
                  liveSessions: cls._count.liveSessions,
                  enableCertificate: cls.enableCertificate,
                  enableChat: cls.enableChat,
                  maxStudents: cls.maxStudents,
                  enrolledCount: cls._count.enrollments,
                }}
              />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function ClassDetailSkeleton() {
  return (
    <div>
      <section className="relative bg-gradient-to-b from-amber-500/10 via-background to-background">
        <div className="max-w-6xl mx-auto px-4 pt-8 pb-12 space-y-3">
          <Skeleton h="h-5" w="w-20" className="rounded-full" />
          <Skeleton h="h-10" w="w-2/3" />
          <Skeleton h="h-4" w="w-48" />
        </div>
      </section>
      <div className="max-w-6xl mx-auto px-4 -mt-2 pb-12">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="glass p-5 rounded-xl space-y-2">
              <Skeleton h="h-4" w="w-40" />
              <Skeleton h="h-3" className="w-full" />
              <Skeleton h="h-3" w="w-5/6" />
            </div>
            <div className="glass p-5 rounded-xl space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-12 h-12 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton h="h-4" w="w-1/2" />
                    <Skeleton h="h-3" w="w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <aside className="lg:col-span-1">
            <div className="glass p-5 rounded-xl space-y-3">
              <Skeleton h="h-8" w="w-24" />
              <Skeleton h="h-10" className="w-full rounded-lg" />
              <Skeleton h="h-3" w="w-2/3" />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function MetaPill({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary border border-border text-xs">
      <Icon className="w-3.5 h-3.5 text-amber-400" /> {label}
    </span>
  );
}

function Pill({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "amber" | "emerald" | "slate" | "violet";
}) {
  const tones = {
    amber: "bg-amber-500/15 text-amber-400 border-amber-400/30",
    emerald: "bg-emerald-500/15 text-emerald-400 border-emerald-400/30",
    slate: "bg-secondary text-muted-foreground border-border",
    violet: "bg-violet-500/15 text-violet-400 border-violet-400/30",
  } as const;
  return (
    <span
      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
