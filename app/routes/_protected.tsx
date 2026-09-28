import { Outlet, redirect } from "react-router";
import type { Route } from "./+types/_protected";
import { hasValidSession, useAuthStore } from "@/stores/auth";
import { useSyncCurrentUser } from "@/hooks/useAuth";

// Replaces the old next-auth middleware: must be signed in with an unexpired token.
// Per-page access is enforced by the API; pages render <AccessDenied> when the
// role lacks read access (see components/shared/AccessDenied).
export function clientLoader({ request }: Route.ClientLoaderArgs) {
  const { token, user, logout } = useAuthStore.getState();
  const { pathname, search } = new URL(request.url);
  const next = encodeURIComponent(pathname + search);
  if (!token || !user) return redirect(`/login?next=${next}`);
  if (!hasValidSession()) {
    logout();
    return redirect(`/login?next=${next}&expired=1`);
  }
  return null;
}

export default function Protected() {
  useSyncCurrentUser(); // role / permission changes apply without signing in again
  return <Outlet />;
}
