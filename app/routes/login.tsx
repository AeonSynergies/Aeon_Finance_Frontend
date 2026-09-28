import { redirect, useNavigate, useSearchParams } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Building2, Info, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useLogin } from "@/hooks/useAuth";
import { apiError, apiStatus } from "@/services/client";
import { loginSchema, type LoginInput } from "@/schemas/auth";
import { hasValidSession } from "@/stores/auth";

export function clientLoader() {
  return hasValidSession() ? redirect("/dashboard") : null;
}

/** Only same-app paths are allowed as a post-login redirect (no open redirects). */
function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/login") ? next : "/dashboard";
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const expired = params.get("expired") === "1";

  const { register, handleSubmit, formState: { errors } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const login = useLogin(() => navigate(safeNext(params.get("next")), { replace: true }));
  const errorMessage = login.isError
    ? apiStatus(login.error) === 401
      ? "Invalid email or password"
      : apiError(login.error, "Could not sign in")
    : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-xl">Aeon Finance</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          {expired && !login.isError && (
            <p className="mb-4 flex items-start gap-2 rounded bg-warning/10 p-2 text-xs text-warning-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Your session has expired. Please sign in again.
            </p>
          )}
          <form onSubmit={handleSubmit((data) => login.mutate(data))} className="space-y-4" noValidate>
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" autoFocus placeholder="you@company.com" aria-invalid={!!errors.email} disabled={login.isPending} {...register("email")} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="current-password" placeholder="••••••••" aria-invalid={!!errors.password} disabled={login.isPending} {...register("password")} />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>
            {errorMessage && (
              <p role="alert" className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 p-2 rounded">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {errorMessage}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={login.isPending}>
              {login.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in…
                </>
              ) : (
                "Sign In"
              )}
            </Button>
            {import.meta.env.DEV && (
              <p className="text-center text-[11px] text-muted-foreground">
                Dev accounts: executive@aeon.dev · manager@aeon.dev · admin@aeon.dev — password123
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
