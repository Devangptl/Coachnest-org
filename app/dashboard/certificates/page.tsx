/**
 * /dashboard/certificates — Student's earned certificates.
 */
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getUserCertificates } from "@/services/certificate.service";
import CertificateCard from "@/components/CertificateCard";
import { Award } from "lucide-react";
import GlassCard from "@/components/GlassCard";

export default async function CertificatesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const certs = await getUserCertificates(session.userId);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">My Certificates</h1>
        <p className="text-muted-foreground/70 text-sm mt-1">
          {certs.length} certificate{certs.length !== 1 ? "s" : ""} earned
        </p>
      </div>

      {certs.length === 0 ? (
        <GlassCard className="text-center py-20">
          <Award className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <p className="text-white font-semibold text-lg mb-2">No certificates yet</p>
          <p className="text-muted-foreground/70 text-sm">
            Complete a course to earn your first certificate.
          </p>
          <a href="/courses" className="btn-primary inline-flex mt-6">
            Browse Courses
          </a>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {certs.map((cert) => (
            <CertificateCard
              key={cert.id}
              cert={{
                ...cert,
                issuedAt: cert.issuedAt.toISOString(),
                course: {
                  ...cert.course,
                  thumbnail: cert.course.thumbnail ?? null,
                },
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
