/**
 * Auth route group layout.
 * Auth pages are full-viewport centered — they don't need the pt-24
 * from the root layout because they show their own centered card.
 * The Navbar is still rendered by the root layout.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
