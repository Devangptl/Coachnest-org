/**
 * Admin → Students list.
 */
import { prisma } from "@/lib/prisma";
import GlassCard from "@/components/GlassCard";
import { Users, User } from "lucide-react";
import { formatDate } from "@/lib/utils";

async function getStudents() {
  return prisma.user.findMany({
    where: { role: "STUDENT" },
    include: { _count: { select: { enrollments: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export default async function AdminStudentsPage() {
  const students = await getStudents();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Students</h1>
        <p className="text-white/50 mt-1">
          {students.length} registered student{students.length !== 1 ? "s" : ""}
        </p>
      </div>

      {students.length === 0 ? (
        <GlassCard className="text-center py-16">
          <Users className="w-12 h-12 text-white/20 mx-auto mb-3" />
          <p className="text-white/50">No students have signed up yet.</p>
        </GlassCard>
      ) : (
        <GlassCard padding="sm">
          {/* Header */}
          <div className="grid grid-cols-12 gap-4 px-4 py-2 text-white/40 text-xs font-semibold uppercase tracking-wider border-b border-white/10">
            <div className="col-span-6">Student</div>
            <div className="col-span-3 text-center">Enrollments</div>
            <div className="col-span-3 text-right">Joined</div>
          </div>

          <div className="divide-y divide-white/5">
            {students.map((student) => (
              <div
                key={student.id}
                className="grid grid-cols-12 gap-4 px-4 py-3.5 items-center hover:bg-white/5 transition-colors"
              >
                {/* Avatar + name */}
                <div className="col-span-6 flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500/40 to-purple-600/40 border border-white/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-white/60" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {student.name}
                    </p>
                    <p className="text-white/40 text-xs truncate">{student.email}</p>
                  </div>
                </div>

                {/* Enrollments */}
                <div className="col-span-3 text-center">
                  <span className="text-white/70 text-sm">
                    {student._count.enrollments}
                  </span>
                </div>

                {/* Joined date */}
                <div className="col-span-3 text-right">
                  <span className="text-white/40 text-xs">
                    {formatDate(student.createdAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
