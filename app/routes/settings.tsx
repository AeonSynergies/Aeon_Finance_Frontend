import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { useSettings, useUpdateSettings } from "@/hooks/useSettings";
import { settingsSchema, type SettingsInput } from "@/schemas/admin";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader, PageTabs } from "@/components/shared/PageTabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const TABS = [
  { key: "general", label: "General" },
  { key: "thresholds", label: "Thresholds" },
];

const NUMERIC_FIELDS: { key: keyof SettingsInput; label: string }[] = [
  { key: "loginBuffer", label: "Login buffer (min)" },
  { key: "logoutBuffer", label: "Logout buffer (min)" },
  { key: "breakBuffer", label: "Break buffer (min)" },
  { key: "dailyOtThreshold", label: "Daily OT threshold (hrs)" },
  { key: "weeklyOtThreshold", label: "Weekly OT threshold (hrs)" },
  { key: "maxConsecutiveDays", label: "Max consecutive days" },
  { key: "minRestPeriod", label: "Min rest period (hrs)" },
  { key: "wstDisputeWindow", label: "WST dispute window (hrs)" },
  { key: "invoiceDisputeWindow", label: "Invoice dispute window (days)" },
  { key: "supportMaxHours", label: "Support max hours (hrs)" },
];

const Settings = () => {
  const [tab, setTab] = useState(TABS[0].key);
  const { data: settings, isLoading: loading, error } = useSettings();
  const updateSettings = useUpdateSettings();
  const saving = updateSettings.isPending;
  const is403 = (e: unknown) => e instanceof AxiosError && e.response?.status === 403;
  const forbidden = is403(error) || is403(updateSettings.error);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SettingsInput>({ resolver: zodResolver(settingsSchema) });

  useEffect(() => {
    if (settings) reset(settings);
  }, [settings, reset]);

  useEffect(() => {
    if (error && !is403(error)) toast.error("Failed to load settings");
  }, [error]);

  const save = handleSubmit(
    (values) =>
      updateSettings.mutate(values, {
        onSuccess: () => toast.success("Settings saved"),
        onError: (e) => {
          if (!is403(e)) toast.error("Failed to save settings");
        },
      }),
    () => toast.error("Failed to save settings"),
  );

  return (
    <AppLayout title="Settings">
      <div className="space-y-6">
        <PageHeader title="Settings" subtitle="Validation buffers, thresholds and workspace details" />

        {forbidden ? (
          <div className="aeon-card p-10 text-center">
            <p className="text-sm font-semibold">Admin access required</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Only administrators can view and manage workspace settings.
            </p>
          </div>
        ) : loading ? (
          <div className="aeon-card p-10 text-center text-sm text-muted-foreground">Loading settings…</div>
        ) : !settings ? (
          <div className="aeon-card p-10 text-center text-sm text-muted-foreground">
            Settings unavailable.
          </div>
        ) : (
          <>
            <PageTabs tabs={TABS} active={tab} onChange={setTab} />

            {tab === "general" && (
              <div className="aeon-card grid max-w-2xl gap-4 p-6">
                <div className="grid gap-2">
                  <Label className="text-xs font-semibold">Station name</Label>
                  <Input
                    {...register("stationName")}
                    className="rounded-xl"
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs font-semibold">DSP name</Label>
                  <Input
                    {...register("dspName")}
                    className="rounded-xl"
                  />
                </div>
                <Button
                  onClick={save}
                  disabled={saving}
                  className="mt-2 h-10 w-fit rounded-xl bg-gradient-brand font-semibold text-primary-foreground shadow-glow hover:opacity-95"
                >
                  {saving ? "Saving…" : "Save changes"}
                </Button>
              </div>
            )}

            {tab === "thresholds" && (
              <div className="aeon-card grid max-w-2xl gap-4 p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  {NUMERIC_FIELDS.map((f) => (
                    <div key={f.key} className="grid gap-2">
                      <Label className="text-xs font-semibold">{f.label}</Label>
                      <Input
                        type="number"
                        step="any"
                        {...register(f.key, { valueAsNumber: true })}
                        className="rounded-xl"
                      />
                      {errors[f.key] && (
                        <p className="text-xs text-destructive">{errors[f.key]?.message}</p>
                      )}
                    </div>
                  ))}
                </div>
                <Button
                  onClick={save}
                  disabled={saving}
                  className="mt-2 h-10 w-fit rounded-xl bg-gradient-brand font-semibold text-primary-foreground shadow-glow hover:opacity-95"
                >
                  {saving ? "Saving…" : "Save changes"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default Settings;
