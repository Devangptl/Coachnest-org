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
          <h1 className="text-3xl font-bold text-foreground">Certificates</h1>
          <p className="text-muted-foreground/70 text-sm mt-1">
            {certs.length} certificate{certs.length !== 1 ? "s" : ""} issued
          </p>
        </div>
      </div>

      {/* Search */}
      <form method="GET" className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
          <input
            name="search"
            type="text"
            defaultValue={search ?? ""}
            placeholder="Search by student or course..."
            className="w-full pl-9 pr-4 py-2.5 rounded-md bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-orange-400/25 focus:ring-1 focus:ring-orange-400/30 transition-all"
          />
        </div>
      </form>

      {certs.length === 0 ? (
        <GlassCard className="text-center py-20">
          <Award className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-foreground font-semibold text-lg mb-2">No certificates found</p>
          <p className="text-muted-foreground/70 text-sm">
            {search ? "No certificates match your search." : "No certificates have been issued yet."}
          </p>
        </GlassCard>
      ) : (
        <GlassCard padding="sm">
          {/* Table header */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 border-b border-border text-muted-foreground/70 text-xs font-semibold uppercase tracking-wider">
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
          <div className="divide-y divide-border/50">
            {certs.map((cert) => (
              <div
                key={cert.id}
                className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 items-center px-5 py-4  transition-colors"
              >
                {/* Student */}
                <div className="col-span-4 flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-orange-500/15 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {cert.user.avatar ? (
                      <Image
                        src={cert.user.avatar}
                        alt={cert.user.name}
                        width={36}
                        height={36}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <span className="text-orange-400 font-bold text-sm">
                        {cert.user.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-foreground text-sm font-medium truncate">
                      {cert.user.name}
                    </p>
                    <p className="text-muted-foreground/50 text-xs truncate">
                      {cert.user.email}
                    </p>
                  </div>
                </div>

                {/* Course */}
                <div className="col-span-4 flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {cert.course.thumbnail ? (
                      <Image
                        src={cert.course.thumbnail}
                        alt={cert.course.title}
                        width={36}
                        height={36}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <BookOpen className="w-4 h-4 text-muted-foreground/40" />
                    )}
                  </div>
                  <p className="text-muted-foreground text-sm truncate">
                    {cert.course.title}
                  </p>
                </div>

                {/* Date */}
                <div className="col-span-2">
                  <p className="text-muted-foreground text-sm">
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
