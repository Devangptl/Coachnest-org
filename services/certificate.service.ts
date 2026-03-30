/**
 * Certificate Service — issue and retrieve course completion certificates.
 */
import { prisma } from "@/lib/prisma";
import { generateCertificatePDF } from "@/lib/pdf";
import { sendCertificateEmail } from "@/lib/email";

/** Check if a student has completed all lessons in a course. */
export async function isCourseCompleted(userId: string, courseId: string): Promise<boolean> {
  const [totalLessons, completedLessons] = await Promise.all([
    prisma.lesson.count({ where: { courseId } }),
    prisma.lessonProgress.count({
      where: { userId, completed: true, lesson: { courseId } },
    }),
  ]);
  return totalLessons > 0 && completedLessons >= totalLessons;
}

/** Generate a PDF buffer for a certificate (works for both new and existing certs). */
async function buildPDF(certId: string, userId: string, courseId: string) {
  const [user, course] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } }),
    prisma.course.findUnique({
      where: { id: courseId },
      select: { title: true, createdBy: { select: { name: true } } },
    }),
  ]);
  if (!user || !course) throw new Error("User or course not found");

  const pdfBuffer = await generateCertificatePDF({
    recipientName:  user.name,
    courseTitle:    course.title,
    instructorName: course.createdBy.name,
    issuedAt:       new Date(),
    certificateId:  certId,
  });

  return { pdfBuffer, user, course };
}

/** Issue a certificate if not already issued and course is completed. */
export async function issueCertificate(userId: string, courseId: string) {
  // Check if already issued — regenerate PDF for re-download
  const existing = await prisma.certificate.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (existing) {
    const { pdfBuffer } = await buildPDF(existing.id, userId, courseId);
    return { cert: existing, pdfBuffer };
  }

  const completed = await isCourseCompleted(userId, courseId);
  if (!completed) throw new Error("Course not yet completed");

  // Create DB record first (get the ID for the cert)
  const cert = await prisma.certificate.create({
    data: { userId, courseId },
  });

  const { pdfBuffer, user, course } = await buildPDF(cert.id, userId, courseId);

  // Send email notification (fire-and-forget)
  sendCertificateEmail(
    user.email,
    user.name,
    course.title,
    `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/certificates`
  ).catch(console.error);

  return { cert, pdfBuffer };
}

/** Generate PDF for any certificate (admin use — no ownership check). */
export async function generateCertificatePDFForAdmin(certId: string) {
  const cert = await prisma.certificate.findUnique({
    where: { id: certId },
  });
  if (!cert) throw new Error("Certificate not found");

  const { pdfBuffer } = await buildPDF(cert.id, cert.userId, cert.courseId);
  return pdfBuffer;
}

/** List all certificates for a user. */
export async function getUserCertificates(userId: string) {
  return prisma.certificate.findMany({
    where: { userId },
    include: { course: { select: { id: true, title: true, thumbnail: true } } },
    orderBy: { issuedAt: "desc" },
  });
}

/** List all certificates (admin). */
export async function getAllCertificates(search?: string) {
  return prisma.certificate.findMany({
    where: search
      ? {
          OR: [
            { user: { name: { contains: search, mode: "insensitive" } } },
            { user: { email: { contains: search, mode: "insensitive" } } },
            { course: { title: { contains: search, mode: "insensitive" } } },
          ],
        }
      : undefined,
    include: {
      user: { select: { id: true, name: true, email: true, avatar: true } },
      course: { select: { id: true, title: true, thumbnail: true } },
    },
    orderBy: { issuedAt: "desc" },
  });
}
