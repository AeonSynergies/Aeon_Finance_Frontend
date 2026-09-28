import { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { TopHeader } from "./TopHeader";
import { AlertBanner } from "./AlertBanner";

interface AppLayoutProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  showAlert?: boolean;
}

export function AppLayout({ title, subtitle, children, showAlert = true }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopHeader title={title} subtitle={subtitle} />
          {showAlert && <AlertBanner />}
          <main className="flex-1 px-4 py-6 md:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
