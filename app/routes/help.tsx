import { BookOpen, LifeBuoy, MessageSquare, PlayCircle } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/shared/PageTabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const RESOURCES = [
  { icon: BookOpen, title: "Documentation", desc: "Step-by-step guides for every workflow" },
  { icon: PlayCircle, title: "Video Tutorials", desc: "Watch short walkthroughs of core features" },
  { icon: MessageSquare, title: "Contact Support", desc: "Reach our team in under 2 business hours" },
  { icon: LifeBuoy, title: "Status & Incidents", desc: "Live system status and recent incidents" },
];

const Help = () => (
  <AppLayout title="Help & Support">
    <div className="space-y-6">
      <PageHeader title="Help & Support" subtitle="Documentation, tutorials and direct support" />

      <div className="aeon-card flex flex-col gap-4 p-6">
        <h3 className="text-lg font-extrabold">How can we help?</h3>
        <div className="flex gap-2">
          <Input placeholder="Search documentation, FAQs..." className="h-11 rounded-xl border-border/70 bg-card text-sm shadow-soft" />
          <Button className="h-11 rounded-xl bg-gradient-brand font-semibold text-primary-foreground shadow-glow hover:opacity-95">
            Search
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {RESOURCES.map((r) => (
          <div key={r.title} className="aeon-card flex flex-col gap-3 p-5 transition-all hover:-translate-y-0.5 hover:shadow-glow">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <r.icon className="h-5 w-5" />
            </div>
            <div className="text-sm font-extrabold">{r.title}</div>
            <p className="text-xs text-muted-foreground">{r.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </AppLayout>
);

export default Help;
