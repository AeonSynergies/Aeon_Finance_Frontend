import { ArrowRight, Newspaper } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/shared/PageTabs";

const POSTS = [
  { title: "DOL updates overtime threshold for 2026", tag: "Compliance", date: "Apr 24, 2026" },
  { title: "Amazon DSP rate card revisions effective May 1", tag: "Rates", date: "Apr 22, 2026" },
  { title: "Best practices for payroll cycle close", tag: "Operations", date: "Apr 20, 2026" },
  { title: "How top DSPs reduce CAP violations", tag: "Insights", date: "Apr 18, 2026" },
];

const News = () => (
  <AppLayout title="News & Insights">
    <div className="space-y-6">
      <PageHeader title="News & Insights" subtitle="Industry updates curated for DSP operations" />
      <div className="grid gap-4 md:grid-cols-2">
        {POSTS.map((p) => (
          <article key={p.title} className="aeon-card flex flex-col gap-3 p-5 transition-all hover:-translate-y-0.5 hover:shadow-glow">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                <Newspaper className="h-3 w-3" /> {p.tag}
              </span>
              <span className="text-[11px] text-muted-foreground">{p.date}</span>
            </div>
            <h3 className="text-base font-extrabold leading-snug">{p.title}</h3>
            <p className="text-xs text-muted-foreground">
              Stay ahead of the curve with curated industry insights and operational guidance from the Aeon Finance team.
            </p>
            <a href="#" className="mt-auto inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
              Read more <ArrowRight className="h-3 w-3" />
            </a>
          </article>
        ))}
      </div>
    </div>
  </AppLayout>
);

export default News;
