import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { canAccessAdminPath } from "@/lib/admin-permissions";
import { getPlatformOfferById } from "@/services/platform-offer.service";
import OfferForm from "../../OfferForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPlatformOfferPage({ params }: PageProps) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");
  if (!canAccessAdminPath(session.adminSubRole, "/admin/platform-offers")) {
    redirect("/admin");
  }

  const { id } = await params;
  const offer = await getPlatformOfferById(id);
  if (!offer) notFound();

  return (
    <div>
      <div className="mb-8">
        <Link
          href="/admin/platform-offers"
          className="text-muted-foreground hover:text-foreground text-sm flex items-center gap-1 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Offers
        </Link>
        <h1 className="text-3xl font-bold text-foreground">Edit Offer</h1>
        <p className="text-muted-foreground mt-1">Update discount value, schedule, or banner styling.</p>
      </div>
      <OfferForm initial={offer} />
    </div>
  );
}
