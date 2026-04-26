/**
 * /dashboard/certificates — Student's earned certificates listed as a table.
 */
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getUserCertificates } from "@/services/certificate.service";
import CertificateDownloadButton from "@/components/CertificateDownloadButton";
import GlassCard from "@/components/GlassCard";
import Image from "next/image";
import { Award, BookOpen, Calendar, Hash } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default async function CertificatesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const certs = await getUserCertificates(session.userId);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">My Certificates</h1>
        <p className="text-muted-foreground/70 text-sm mt-1">
          {certs.length} certificate{certs.length !== 1 ? "s" : ""} earned
        </p>
      </div>

      {certs.length === 0 ? (
        <GlassCard className="text-center py-20">
          <Award className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-foreground font-semibold text-lg mb-2">No certificates yet</p>
          <p className="text-muted-foreground/70 text-sm">
            Complete a course to earn your first certificate.
          </p>
          <a href="/courses" className="btn-primary inline-flex mt-6">
            Browse Courses
          </a>
        </GlassCard>
      ) : (
        <GlassCard padding="sm">
          {/* Table header */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 border-b border-border text-muted-foreground/70 text-xs font-semibold uppercase tracking-wider">
            <div className="col-span-6 flex items-center gap-2">
              <BookOpen className="w-3 h-3" /> Course
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <Calendar className="w-3 h-3" /> Issued
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <Hash className="w-3 h-3" /> Certificate ID
            </div>
            <div className="col-span-2 text-right">Action</div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-border/50">
            {certs.map((cert) => (
              <div
                key={cert.id}
                className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 items-center px-5 py-4 transition-colors"
              >
                {/* Course */}
                <div className="col-span-6 flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {cert.course.thumbnail ? (
                      <Image
                        src={cert.course.thumbnail}
                        alt={cert.course.title}
                        width={40}
                        height={40}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <BookOpen className="w-4 h-4 text-muted-foreground/40" />
                    )}
                  </div>
                  <p className="text-foreground text-sm font-medium truncate">
                    {cert.course.title}
                  </p>
                </div>

                {/* Date */}
                <div className="col-span-2">
                  <p className="text-muted-foreground text-sm">
                    {formatDate(cert.issuedAt)}
                  </p>
                </div>

                {/* Certificate ID */}
                <div className="col-span-2">
                  <p className="text-muted-foreground/80 text-xs font-mono tracking-wider truncate">
                    {cert.id.slice(0, 12).toUpperCase()}
                  </p>
                </div>

                {/* Action */}
                <div className="col-span-2 flex justify-end">
                  <CertificateDownloadButton
                    courseId={cert.course.id}
                    courseTitle={cert.course.title}
                  />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
