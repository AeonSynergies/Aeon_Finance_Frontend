import { Link } from "react-router";

export default function NotFound() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <h1 className="text-lg font-semibold">404</h1>
      <p className="text-sm text-muted-foreground">The requested page could not be found.</p>
      <Link to="/dashboard" className="rounded-md border px-3 py-1.5 text-sm">Go to dashboard</Link>
    </main>
  );
}
