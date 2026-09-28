import { useState } from "react";
import { useSearchParams } from "react-router";
import { ShieldCheck, Users } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { ErrorState } from "@/components/shared/ErrorState";
import { InviteDialog } from "@/components/team/InviteDialog";
import { MembersPanel } from "@/components/team/MembersPanel";
import { RolesPanel } from "@/components/team/RolesPanel";
import { usePermissionModules, useRoles, useTeamAbilities } from "@/hooks/useTeam";
import type { TeamInvitation } from "@/types/team";

type Tab = "roles" | "members";

export default function TeamPermissionsPage() {
  const ab = useTeamAbilities();
  const modules = usePermissionModules();
  const roles = useRoles(ab.canView);
  const [params, setParams] = useSearchParams();
  const [invite, setInvite] = useState<{ roleId?: string; email?: string; name?: string | null } | null>(null);

  // Tab and selected role live in the URL so refresh / links keep them.
  const tab: Tab = params.get("tab") === "members" ? "members" : "roles";
  const setParam = (key: string, value: string) =>
    setParams(
      (p) => {
        p.set(key, value);
        return p;
      },
      { replace: true }
    );

  const loading = modules.isPending || roles.isPending;
  const error = modules.error ?? roles.error;

  return (
    <AppLayout title="Team & Permissions" showAlert={false}>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Team &amp; Permissions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Control access levels and assign roles to your team
            {ab.user?.org?.name ? ` in ${ab.user.org.name}` : ""}.
          </p>
        </div>

        {!ab.canView ? (
          <AccessDenied what="team & permissions" />
        ) : (
          <Tabs value={tab} onValueChange={(v) => setParam("tab", v)}>
            <TabsList>
              <TabsTrigger value="roles" className="gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" /> Roles
              </TabsTrigger>
              <TabsTrigger value="members" className="gap-1.5">
                <Users className="h-3.5 w-3.5" /> Members
              </TabsTrigger>
            </TabsList>

            {loading ? (
              <div className="mt-4 grid gap-5 lg:grid-cols-[280px_1fr]" aria-busy="true">
                <Skeleton className="h-80 rounded-2xl" />
                <Skeleton className="h-[480px] rounded-2xl" />
              </div>
            ) : error ? (
              <ErrorState
                className="mt-4"
                error={error}
                title="Couldn’t load roles"
                onRetry={() => {
                  void modules.refetch();
                  void roles.refetch();
                }}
                retrying={modules.isFetching || roles.isFetching}
              />
            ) : (
              <>
                <TabsContent value="roles" className="mt-4">
                  <RolesPanel
                    roles={roles.data!}
                    modules={modules.data!}
                    selectedId={params.get("role")}
                    onSelect={(id) => setParam("role", id)}
                    onInvite={(roleId) => setInvite({ roleId })}
                  />
                </TabsContent>
                <TabsContent value="members" className="mt-4">
                  <MembersPanel
                    roles={roles.data!}
                    onInvite={(inv?: TeamInvitation) =>
                      setInvite(inv ? { roleId: inv.role.id, email: inv.email, name: inv.name } : {})
                    }
                  />
                </TabsContent>
              </>
            )}
          </Tabs>
        )}
      </div>

      {roles.data && (
        <InviteDialog
          open={!!invite}
          onOpenChange={(o) => !o && setInvite(null)}
          roles={roles.data}
          initial={invite ?? undefined}
        />
      )}
    </AppLayout>
  );
}
