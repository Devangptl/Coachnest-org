/**
 * Instructor: Class details with sidebar tabs.
 *
 * Renders a skeleton instantly and fetches the class data client-side from
 * /api/classes/:id/manage, so navigation never blocks on the DB.
 */
import InstructorClassClient from "./InstructorClassClient";

export default async function InstructorClassDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;

  return <InstructorClassClient id={id} initialTab={tab ?? "overview"} />;
}
