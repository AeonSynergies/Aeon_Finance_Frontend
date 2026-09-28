import { Link, useNavigate, useParams } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Building2, Clock, Loader2, MailX } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import { FormField } from "@/components/timecard/FormField";
import { useAcceptInvitation, useInvitationPreview } from "@/hooks/useTeam";
import { formatDateTime } from "@/lib/timecard";
import { apiError, apiStatus } from "@/services/client";
import { acceptInviteSchema, type AcceptInviteValues } from "@/schemas/team";
import { useSession } from "@/stores/auth";

export default function AcceptInvitePage() {
  const { token = "" } = useParams();
  const preview = useInvitationPreview(token);
  const status = apiStatus(preview.error);

  let body: React.ReactNode;
  if (preview.isPending) {
    body = (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    );
  } else if (status === 404 || status === 410) {
    const Icon = status === 410 ? Clock : MailX;
    body = (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <Icon className="h-9 w-9 text-muted-foreground" />
        <p className="text-sm font-semibold">{status === 410 ? "This invitation has expired" : "This invitation link isn’t valid"}</p>
        <p className="max-w-xs text-xs text-muted-foreground">
          {status === 410
            ? "Ask the person who invited you to send a new one."
            : "It may have been used already, replaced by a newer invite, or revoked."}
        </p>
        <Button asChild size="sm" variant="outline">
          <Link to="/login">Go to sign in</Link>
        </Button>
      </div>
    );
  } else if (preview.isError) {
    body = <ErrorState compact error={preview.error} onRetry={() => preview.refetch()} retrying={preview.isFetching} />;
  } else {
    body = <AcceptForm token={token} preview={preview.data} />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mb-2 flex justify-center">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-xl">
            {preview.data ? `Join ${preview.data.org.name}` : "Aeon Finance invitation"}
          </CardTitle>
          {preview.data && (
            <CardDescription>
              You’ve been invited as <strong>{preview.data.role.name}</strong>. Link expires{" "}
              {formatDateTime(preview.data.expiresAt)}.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>{body}</CardContent>
      </Card>
    </div>
  );
}

function AcceptForm({ token, preview }: { token: string; preview: NonNullable<ReturnType<typeof useInvitationPreview>["data"]> }) {
  const navigate = useNavigate();
  const signedIn = useSession().data?.user;
  const accept = useAcceptInvitation(token);
  const { register, handleSubmit, formState: { errors } } = useForm<AcceptInviteValues>({
    resolver: zodResolver(acceptInviteSchema),
    defaultValues: { name: preview.name ?? "", password: "", confirm: "" },
  });

  const onSubmit = handleSubmit(async ({ name, password }) => {
    try {
      const { user } = await accept.mutateAsync({ name, password });
      toast.success(`Welcome to ${user.org.name}, ${user.name}!`);
      navigate("/dashboard", { replace: true });
    } catch {
      /* shown below */
    }
  });

  const conflict = apiStatus(accept.error) === 409;

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {signedIn && signedIn.email !== preview.email && (
        <p className="rounded bg-warning/10 p-2 text-xs">
          You’re signed in as {signedIn.email}. Accepting signs you in as {preview.email} instead.
        </p>
      )}
      <FormField id="inv-email" label="Email">
        <Input id="inv-email" value={preview.email} readOnly disabled />
      </FormField>
      <FormField id="inv-name" label="Your name" error={errors.name?.message}>
        <Input id="inv-name" autoFocus autoComplete="name" aria-invalid={!!errors.name} {...register("name")} />
      </FormField>
      <FormField id="inv-password" label="Choose a password" error={errors.password?.message} hint="At least 8 characters.">
        <Input id="inv-password" type="password" autoComplete="new-password" aria-invalid={!!errors.password} {...register("password")} />
      </FormField>
      <FormField id="inv-confirm" label="Confirm password" error={errors.confirm?.message}>
        <Input id="inv-confirm" type="password" autoComplete="new-password" aria-invalid={!!errors.confirm} {...register("confirm")} />
      </FormField>
      {accept.isError && (
        <p role="alert" className="flex items-start gap-2 rounded bg-destructive/10 p-2 text-xs text-destructive">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            {apiError(accept.error, "Could not accept the invitation")}
            {conflict && (
              <>
                {" "}
                <Link to="/login" className="font-semibold underline">
                  Sign in
                </Link>
              </>
            )}
          </span>
        </p>
      )}
      <Button type="submit" className="w-full" disabled={accept.isPending}>
        {accept.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Join {preview.org.name}
      </Button>
    </form>
  );
}
