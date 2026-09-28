import { Bell, ChevronDown, MessageSquare, LayoutGrid, Search, Upload, History, LogOut } from "lucide-react";
import { useNavigate } from "react-router";
import { useSession, signOut } from "@/stores/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface TopHeaderProps {
  title?: string;
  subtitle?: string;
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function TopHeader({}: TopHeaderProps) {
  const navigate = useNavigate();
  const { data: session } = useSession();
  const name = session?.user?.name ?? "User";
  const role = session?.user?.role;
  const orgName = session?.user?.org?.name;
  const subtitle = [role, orgName].filter(Boolean).join(" · ");
  const initials = initialsFromName(name);
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-gradient-header/80 px-4 backdrop-blur-md md:px-6">
      <SidebarTrigger className="text-muted-foreground hover:text-foreground" />


      <div className="mx-4 flex flex-1 justify-center md:mx-6">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search drivers, jobs, reports..."
            className="h-9 w-full rounded-xl border-border/70 bg-card pl-9 text-sm shadow-soft"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-2.5">

        <Button
          onClick={() => navigate("/upload")}
          className="h-9 gap-2 rounded-xl bg-gradient-brand font-semibold text-primary-foreground shadow-glow hover:opacity-95"
        >
          <Upload className="h-4 w-4" />
          <span className="hidden sm:inline">Upload Excel</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="h-9 gap-1.5 rounded-xl border-border/70 bg-card text-xs font-semibold shadow-soft"
            >
              <History className="h-3.5 w-3.5" />
              <span className="hidden md:inline">View Logs</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Activity logs</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Upload history</DropdownMenuItem>
            <DropdownMenuItem>Validation logs</DropdownMenuItem>
            <DropdownMenuItem>Approval audit</DropdownMenuItem>
            <DropdownMenuItem>System events</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground">
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground">
          <MessageSquare className="h-[18px] w-[18px]" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground">
          <LayoutGrid className="h-[18px] w-[18px]" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-xl border border-border/70 bg-card p-1 pr-3 shadow-soft transition-colors hover:bg-muted">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-gradient-brand text-xs font-bold text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-left leading-tight md:block">
                <div className="text-xs font-semibold">{name}</div>
                {subtitle && (
                  <div className="text-[10px] text-muted-foreground">{subtitle}</div>
                )}
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Preferences</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
