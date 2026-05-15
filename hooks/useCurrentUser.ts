"use client";

import { useEffect, useState } from "react";

export interface CurrentUser {
  userId: string;
  name: string;
  email: string;
  role: "ADMIN" | "INSTRUCTOR" | "STUDENT";
}

interface State {
  user: CurrentUser | null;
  loading: boolean;
}

/**
 * Fetches the logged-in user's session info from /api/auth/me.
 * Returns { user, loading }. user is null if not logged in.
 */
export function useCurrentUser(): State {
  const [state, setState] = useState<State>({ user: null, loading: true });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((data) => {
        if (!cancelled) setState({ user: data.user ?? null, loading: false });
      })
      .catch(() => {
        if (!cancelled) setState({ user: null, loading: false });
      });
    return () => { cancelled = true; };
  }, []);

  return state;
}
