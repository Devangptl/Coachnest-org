/**
 * Navbar — Server Component wrapper.
 * Reads session on the server, passes it to the interactive client component.
 */
import { getSession } from "@/lib/auth";
import NavbarClient from "./NavbarClient";

export default async function Navbar() {
  const session = await getSession();
  return <NavbarClient session={session} />;
}
