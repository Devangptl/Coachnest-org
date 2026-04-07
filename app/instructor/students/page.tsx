/**
 * Instructor → My Students
 */
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import GlassCard from "@/components/GlassCard";
import { Users } from "lucide-react";
import { formatDate } from "@/lib/utils";

async function getEnrollments(userId: string) {
  return prisma.enrollment.findMany({
    where:   { course: { createdById: userId } },
    include: {
      user:   { select: { id: true, name: true, email: true, avatar: true } },
      course: { select: { id: true, title: true } },
    },
    orderBy: { course: { createdAt: "desc" } },
  });
}

export default async function InstructorStudentsPage() {
  const session     = await getSession();
  const enrollments = await getEnrollments(session!.userId);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">My Students</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {enrollments.length} enrollment{enrollments.length !== 1 ? "s" : ""} across your courses
        </p>
      </div>

      {enrollments.length === 0 ? (
        <GlassCard className="text-center py-16">
          <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No students enrolled yet. Publish your courses to attract learners!</p>
        </GlassCard>
      ) : (
        <GlassCard padding="sm">
          <div className="grid grid-cols-12 gap-3 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 border-b border-border">
            <div className="col-span-4">Student</div>
            <div className="col-span-5">Course</div>
            <div className="col-span-3 text-right">Enrolled</div>
          </div>
          <div className="divide-y divide-border/50">
            {enrollments.map((e) => (
              <div key={`${e.userId}-${e.courseId}`} className="grid grid-cols-12 gap-3 px-4 py-3.5 items-center  transition-colors">
                <div className="col-span-4 flex items-center gap-3 min-w-0">
                  {e.user.avatar ? (
                    <img src={e.user.avatar} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {e.user.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{e.user.name}</p>
                    <p className="text-xs text-muted-foreground/60 truncate">{e.user.email}</p>
                  </div>
                </div>
                <div className="col-span-5">
                  <p className="text-sm text-muted-foreground truncate">{e.course.title}</p>
                </div>
                <div className="col-span-3 text-right text-xs text-muted-foreground/60">
                  {formatDate(e.enrolledAt)}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
