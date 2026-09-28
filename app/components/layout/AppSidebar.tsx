import { Link } from "react-router";
import { useLocation } from "react-router";
import {
  LayoutDashboard,
  BarChart3,
  FileText,
  ShieldCheck,
  CalendarDays,
  Newspaper,
  Settings,
  Sparkles,
  Receipt,
  Users,
  LifeBuoy,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useJobs } from "@/hooks/useJobs";
import { usePermissions } from "@/hooks/useAuth";

const workspaceItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Validation", url: "/validation", icon: ShieldCheck },
  { title: "Reports", url: "/reports", icon: FileText },
  { title: "Rate Card", url: "/rate-card", icon: Receipt },
  { title: "Calendar", url: "/calendar", icon: CalendarDays },
];

const platformItems = [
  { title: "Team & Permissions", url: "/team", icon: Users, permission: "TEAM" as const },
  { title: "News & Insights", url: "/news", icon: Newspaper },
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "Help & Support", url: "/help", icon: LifeBuoy },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { can } = usePermissions();
  const { data: pendingJobs } = useJobs({ status: "SENT_FOR_APPROVAL" });
  const pendingCount = pendingJobs?.length ?? 0;
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const isActive = (path: string) => {
    if (path === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(path);
  };

  const renderItem = (item: {
    title: string;
    url: string;
    icon: typeof LayoutDashboard;
    children?: { title: string; url: string }[];
  }) => {
    const active = isActive(item.url);
    const showChildren = !collapsed && !!item.children?.length && active;
    return (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton
          asChild
          isActive={active}
          className={cn(
            "group relative h-10 rounded-xl transition-all",
            active &&
              "bg-gradient-to-r from-primary/10 to-secondary/5 text-primary font-semibold shadow-soft"
          )}
        >
          <Link to={item.url} className="flex items-center gap-3">
            {active && (
              <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-primary" />
            )}
            <item.icon
              className={cn(
                "h-[18px] w-[18px] shrink-0",
                active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
              )}
            />
            {!collapsed && <span>{item.title}</span>}
            {!collapsed && active && (
              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary animate-pulse-glow" />
            )}
          </Link>
        </SidebarMenuButton>
        {showChildren && (
          <SidebarMenuSub>
            {item.children!.map((sub) => {
              const subActive = pathname.startsWith(sub.url);
              return (
                <SidebarMenuSubItem key={sub.url}>
                  <SidebarMenuSubButton asChild isActive={subActive}>
                    <Link to={sub.url}>
                      <span>{sub.title}</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              );
            })}
          </SidebarMenuSub>
        )}
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="px-4 py-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand shadow-glow">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <div className="text-base font-extrabold tracking-tight">
                Aeon <span className="aeon-gradient-text">Finance</span>
              </div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Finance &amp; Planning
              </div>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Workspace</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>{workspaceItems.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Platform</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {platformItems.filter((i) => !i.permission || can(i.permission, "read")).map(renderItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-2 pb-3">
        {!collapsed && (
          <div className="rounded-2xl border bg-gradient-brand p-3 text-primary-foreground shadow-glow">
            <div className="text-xs font-semibold">Payroll week ends Sun</div>
            <div className="mt-0.5 text-[11px] opacity-90">{`${pendingCount} job${pendingCount !== 1 ? "s" : ""} awaiting approval`}</div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
