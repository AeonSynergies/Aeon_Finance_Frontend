import { Upload, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useNavigate } from "react-router";

interface AlertBannerProps {
  message?: string;
  ctaLabel?: string;
  onCta?: () => void;
}

export function AlertBanner({
  message = "Update your data. Begin by uploading new excel.",
  ctaLabel = "Upload Excel",
  onCta,
}: AlertBannerProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);
  const handleCta = onCta ?? (() => navigate("/upload"));
  if (!open) return null;
  return (
    <div className="mx-4 mt-4 flex items-center gap-3 rounded-2xl border border-primary/15 bg-primary/[0.06] px-4 py-2.5 md:mx-6">
      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
        <Info className="h-4 w-4" />
      </div>
      <div className="flex-1 text-sm text-foreground">
        <span className="font-semibold">Heads up — </span>
        <span className="text-muted-foreground">{message}</span>
      </div>
      <Button
        onClick={handleCta}
        size="sm"
        className="h-8 gap-1.5 rounded-lg bg-gradient-brand text-xs font-semibold text-primary-foreground shadow-glow hover:opacity-95"
      >
        <Upload className="h-3.5 w-3.5" />
        {ctaLabel}
      </Button>
      <button
        onClick={() => setOpen(false)}
        className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
