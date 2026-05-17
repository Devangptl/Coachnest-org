/**
 * Public class detail (student view).
 *
 * The page returns a layout shell immediately and streams the class content
 * through a Suspense boundary, so navigation feels instant.
 */
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { GraduationCap, Users, BookOpen, Calendar, Video, MessageCircle } from "lucide-react";
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
    <div className="px-4 max-w-6xl mx-auto py-6">
      <Suspense fallback={<ClassDetailSkeleton />}>
        <ClassDetailContent slug={slug} invite={invite} />
      </Suspense>
    </div>
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

  const isMember = enrollment?.status === "APPROVED" || cls.instructorId === session?.userId;

  return (
    <>
      {/* Banner */}
      <div className="rounded-xl overflow-hidden mb-6">
        {cls.banner ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cls.banner} alt="" className="w-full h-48 object-cover" />
        ) : (
          <div className="w-full h-32 bg-gradient-to-r from-amber-500/20 via-orange-500/10 to-amber-500/20" />
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <GraduationCap className="w-7 h-7 text-amber-400" /> {cls.name}
            </h1>
            <p className="text-sm text-muted-foreground">by {cls.instructor.name}</p>
          </div>

          {cls.description && (
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{cls.description}</p>
          )}

          <div className="flex flex-wrap gap-3 text-sm">
            <Pill icon={Users} label={`${cls._count.enrollments} students`} />
            <Pill icon={BookOpen} label={`${cls.courses.length} courses`} />
            {cls.enableLiveClass && <Pill icon={Video} label={`${cls._count.liveSessions} live sessions`} />}
            {cls.startDate && <Pill icon={Calendar} label={`Starts ${new Date(cls.startDate).toLocaleDateString()}`} />}
            {cls.enableChat && <Pill icon={MessageCircle} label="Chat" />}
          </div>

          {/* Course list — click to read in a side panel */}
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

          {isMember && <StudentClassTabs classId={cls.id} enableChat={cls.enableChat} enableDiscussion={cls.enableDiscussion} />}
        </div>

        <aside className="lg:col-span-1">
          <div className="glass p-5 rounded-xl sticky top-20">
            <JoinClassPanel
              classId={cls.id}
              slug={cls.slug}
              joinMode={cls.joinMode}
              isLoggedIn={!!session}
              enrollmentStatus={enrollment?.status ?? null}
              inviteCodeHint={invite}
            />
          </div>
        </aside>
      </div>
    </>
  );
}

function ClassDetailSkeleton() {
  return (
    <div className="animate-pulse">
      <Skeleton className="w-full h-48 rounded-xl mb-6" />
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton h="h-8" w="w-2/3" />
          <Skeleton h="h-3" w="w-32" />
          <div className="space-y-2 pt-2">
            <Skeleton h="h-3" className="w-full" />
            <Skeleton h="h-3" w="w-5/6" />
          </div>
          <div className="flex gap-3 pt-1">
            <Skeleton h="h-7" w="w-28" className="rounded-full" />
            <Skeleton h="h-7" w="w-24" className="rounded-full" />
            <Skeleton h="h-7" w="w-28" className="rounded-full" />
          </div>
          <div className="glass p-5 rounded-xl space-y-3">
            <Skeleton h="h-5" w="w-40" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-1">
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
            <Skeleton h="h-5" w="w-32" />
            <Skeleton h="h-3" className="w-full" />
            <Skeleton h="h-10" className="w-full rounded-lg" />
          </div>
        </aside>
      </div>
    </div>
  );
}

function Pill({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary text-xs">
      <Icon className="w-3.5 h-3.5 text-amber-400" /> {label}
    </span>
  );
}
