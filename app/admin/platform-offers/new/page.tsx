import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { canAccessAdminPath } from "@/lib/admin-permissions";
import OfferForm from "../OfferForm";

export default async function NewPlatformOfferPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");
  if (!canAccessAdminPath(session.adminSubRole, "/admin/platform-offers")) {
    redirect("/admin");
  }

  return (
    <div>
      <div className="mb-8">
        <Link
          href="/admin/platform-offers"
          className="text-muted-foreground hover:text-foreground text-sm flex items-center gap-1 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Offers
        </Link>
        <h1 className="text-3xl font-bold text-foreground">Create Platform Offer</h1>
        <p className="text-muted-foreground mt-1">
          Set up a site-wide discount auto-applied at checkout, plus an optional landing-page banner.
        </p>
      </div>
      <OfferForm />
    </div>
  );
}
