/**
 * /dashboard/certificates — Student's earned certificates.
 *
 * Renders each certificate as a full on-screen preview matching the printable
 * design, with a Download PDF action.
 */
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getUserCertificates } from "@/services/certificate.service";
import CertificatePreview from "@/components/CertificatePreview";
import CertificateDownloadButton from "@/components/CertificateDownloadButton";
import { format } from "date-fns";
import { Award } from "lucide-react";
import GlassCard from "@/components/GlassCard";

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
        <div className="space-y-8">
          {certs.map((cert) => (
            <div key={cert.id} className="space-y-3">
              <CertificatePreview
                recipientName={session.name}
                courseTitle={cert.course.title}
                issuedAt={cert.issuedAt}
                certificateId={cert.id}
                instructorName={cert.course.createdBy?.name ?? "Course Instructor"}
              />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
                <div className="text-xs text-muted-foreground/70">
                  Issued {format(new Date(cert.issuedAt), "d MMM yyyy")}
                  <span className="mx-2">·</span>
                  ID {cert.id.slice(0, 12).toUpperCase()}
                </div>
                <CertificateDownloadButton
                  courseId={cert.course.id}
                  courseTitle={cert.course.title}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
