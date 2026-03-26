/**
 * Admin → Students list with search, stats, and links to detail view.
 */
import { prisma } from "@/lib/prisma";
import GlassCard from "@/components/GlassCard";
import { Users, GraduationCap, Award, Star } from "lucide-react";
import StudentTable from "./StudentTable";
import StudentSearch from "./StudentSearch";

async function getStudentsData() {
  const [students, totalStudents, totalEnrollments, totalCertificates] =
    await Promise.all([
      prisma.user.findMany({
        where: { role: "STUDENT" },
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          headline: true,
          createdAt: true,
          _count: {
            select: {
              enrollments: true,
              certificates: true,
              orders: true,
              reviews: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count({ where: { role: "STUDENT" } }),
      prisma.enrollment.count(),
      prisma.certificate.count(),
    ]);

  const activeThreshold = new Date();
  activeThreshold.setDate(activeThreshold.getDate() - 30);
  const activeStudents = await prisma.enrollment.groupBy({
    by: ["userId"],
    where: { enrolledAt: { gte: activeThreshold } },
  });

  return {
    students,
    stats: {
      total: totalStudents,
      active: activeStudents.length,
      totalEnrollments,
      totalCertificates,
    },
  };
}

export default async function AdminStudentsPage() {
  const { students, stats } = await getStudentsData();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Students</h1>
        <p className="text-white/50 mt-1">
          Manage student accounts, view profiles, and track activity.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Students", value: stats.total, icon: Users, color: "text-blue-400" },
          { label: "Active (30d)", value: stats.active, icon: Star, color: "text-emerald-400" },
          { label: "Total Enrollments", value: stats.totalEnrollments, icon: GraduationCap, color: "text-violet-400" },
          { label: "Certificates Issued", value: stats.totalCertificates, icon: Award, color: "text-yellow-400" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <GlassCard key={stat.label} className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                <Icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div>
                <div className="text-3xl font-bold text-white">{stat.value}</div>
                <div className="text-white/50 text-sm">{stat.label}</div>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Search */}
      <div className="mb-6">
        <StudentSearch />
      </div>

      {/* Table */}
      {students.length === 0 ? (
        <GlassCard className="text-center py-16">
          <Users className="w-12 h-12 text-white/20 mx-auto mb-3" />
          <p className="text-white/50">No students have signed up yet.</p>
        </GlassCard>
      ) : (
        <GlassCard padding="sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <h2 className="text-white font-semibold">All Students</h2>
            <span className="text-white/40 text-sm">{students.length} total</span>
          </div>
          <StudentTable students={students.map(s => ({ ...s, createdAt: s.createdAt.toISOString() }))} />
        </GlassCard>
      )}
    </div>
  );
}
