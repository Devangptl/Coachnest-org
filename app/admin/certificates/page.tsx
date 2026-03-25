/**
 * /admin/certificates — Admin view of all issued certificates.
 */
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getAllCertificates } from "@/services/certificate.service";
import GlassCard from "@/components/GlassCard";
import { Award, Search, User, BookOpen, Calendar, Download } from "lucide-react";
import { formatDate } from "@/lib/utils";
import Image from "next/image";
import CertificateDownloadBtn from "./CertificateDownloadBtn";

export default async function AdminCertificatesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "INSTRUCTOR")) {
    redirect("/login");
  }

  const { search } = await searchParams;
  const certs = await getAllCertificates(search);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Certificates</h1>
          <p className="text-white/40 text-sm mt-1">
            {certs.length} certificate{certs.length !== 1 ? "s" : ""} issued
          </p>
        </div>
      </div>

      {/* Search */}
      <form method="GET" className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            name="search"
            type="text"
            defaultValue={search ?? ""}
            placeholder="Search by student or course..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-purple-400/50 focus:ring-1 focus:ring-purple-400/30 transition-all"
          />
        </div>
      </form>

      {certs.length === 0 ? (
        <GlassCard className="text-center py-20">
          <Award className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <p className="text-white font-semibold text-lg mb-2">No certificates found</p>
          <p className="text-white/40 text-sm">
            {search ? "No certificates match your search." : "No certificates have been issued yet."}
          </p>
        </GlassCard>
      ) : (
        <GlassCard padding="sm">
          {/* Table header */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 border-b border-white/10 text-white/40 text-xs font-semibold uppercase tracking-wider">
            <div className="col-span-4 flex items-center gap-2">
              <User className="w-3 h-3" /> Student
            </div>
            <div className="col-span-4 flex items-center gap-2">
              <BookOpen className="w-3 h-3" /> Course
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <Calendar className="w-3 h-3" /> Issued
            </div>
            <div className="col-span-2 text-right">Action</div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-white/[0.04]">
            {certs.map((cert) => (
              <div
                key={cert.id}
                className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 items-center px-5 py-4 hover:bg-white/[0.03] transition-colors"
              >
                {/* Student */}
                <div className="col-span-4 flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {cert.user.avatar ? (
                      <Image
                        src={cert.user.avatar}
                        alt={cert.user.name}
                        width={36}
                        height={36}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <span className="text-purple-400 font-bold text-sm">
                        {cert.user.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {cert.user.name}
                    </p>
                    <p className="text-white/30 text-xs truncate">
                      {cert.user.email}
                    </p>
                  </div>
                </div>

                {/* Course */}
                <div className="col-span-4 flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-white/[0.06] flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {cert.course.thumbnail ? (
                      <Image
                        src={cert.course.thumbnail}
                        alt={cert.course.title}
                        width={36}
                        height={36}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <BookOpen className="w-4 h-4 text-white/30" />
                    )}
                  </div>
                  <p className="text-white/70 text-sm truncate">
                    {cert.course.title}
                  </p>
                </div>

                {/* Date */}
                <div className="col-span-2">
                  <p className="text-white/50 text-sm">
                    {formatDate(cert.issuedAt)}
                  </p>
                </div>

                {/* Actions */}
                <div className="col-span-2 flex justify-end">
                  <CertificateDownloadBtn courseId={cert.course.id} userId={cert.user.id} />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
