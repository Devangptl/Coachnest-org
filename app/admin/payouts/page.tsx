/**
 * /admin/payouts — Admin payout management page
 * Lists all instructor payout requests; allows APPROVE, REJECT, PROCESS.
 */
import { Wallet } from "lucide-react";
import PayoutsAdminClient from "./PayoutsAdminClient";

export const metadata = { title: "Payout Requests · Admin" };

export default function AdminPayoutsPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-md bg-orange-500/10 flex items-center justify-center flex-shrink-0">
          <Wallet className="w-5 h-5 text-orange-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Payout Requests</h1>
          <p className="text-muted-foreground/70 text-sm mt-0.5">
            Review and process instructor payout requests.
          </p>
        </div>
      </div>

      <PayoutsAdminClient />
    </div>
  );
}
