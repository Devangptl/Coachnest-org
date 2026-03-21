/**
 * Certificate Service — issue and retrieve course completion certificates.
 */
import { prisma } from "@/lib/prisma";
import { generateCertificatePDF } from "@/lib/pdf";
import { sendCertificateEmail } from "@/lib/email";

/** Check if a student has completed all lessons in a course. */
async function isCourseCompleted(userId: string, courseId: string): Promise<boolean> {
  const [totalLessons, completedLessons] = await Promise.all([
    prisma.lesson.count({ where: { courseId } }),
    prisma.lessonProgress.count({
      where: { userId, completed: true, lesson: { courseId } },
    }),
  ]);
  return totalLessons > 0 && completedLessons >= totalLessons;
}

/** Issue a certificate if not already issued and course is completed. */
export async function issueCertificate(userId: string, courseId: string) {
  // Check if already issued
  const existing = await prisma.certificate.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (existing) return existing;

  const completed = await isCourseCompleted(userId, courseId);
  if (!completed) throw new Error("Course not yet completed");

  const [user, course] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } }),
    prisma.course.findUnique({
      where: { id: courseId },
      select: { title: true, createdBy: { select: { name: true } } },
    }),
  ]);
  if (!user || !course) throw new Error("User or course not found");

  // Create DB record first (get the ID for the cert)
  const cert = await prisma.certificate.create({
    data: { userId, courseId },
  });

  // Generate PDF
  const pdfBuffer = await generateCertificatePDF({
    recipientName:  user.name,
    courseTitle:    course.title,
    instructorName: course.createdBy.name,
    issuedAt:       new Date(),
    certificateId:  cert.id,
  });

  // In production you'd upload pdfBuffer to S3/Cloudinary and save the URL.
  // For now we just return the buffer; the route handler streams it.
  sendCertificateEmail(
    user.email,
    user.name,
    course.title,
    `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/certificates`
  ).catch(console.error);

  return { cert, pdfBuffer };
}

/** List all certificates for a user. */
export async function getUserCertificates(userId: string) {
  return prisma.certificate.findMany({
    where: { userId },
    include: { course: { select: { id: true, title: true, thumbnail: true } } },
    orderBy: { issuedAt: "desc" },
  });
}
