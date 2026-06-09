import { getSession } from "@/lib/auth";
import BottomNav from "./BottomNav";

export default async function BottomNavWrapper() {
  const session = await getSession();
  return <BottomNav session={session} />;
}
