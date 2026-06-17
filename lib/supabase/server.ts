/**
 * Creates a Supabase server client that reads/writes cookies via next/headers.
 * Use this in Route Handlers and Server Components.
 */
import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { cookieDomainForHost } from "@/lib/domains";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const cookieDomain = cookieDomainForHost((await headers()).get("host"));
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: cookieDomain ? { domain: cookieDomain } : undefined,
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — cookies are read-only, safe to ignore
          }
        },
      },
    }
  );
}
