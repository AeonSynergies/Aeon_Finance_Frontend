/** Shared display formatters (Aeon Finance). */
export const fmt = {
  hours: (val: number | string | null | undefined): string => {
    if (val == null || val === "") return "—"
    const n = typeof val === "string" ? parseFloat(val) : val
    if (isNaN(n)) return "—"
    return n.toFixed(2)
  },
  currency: (val: number | string | null | undefined): string => {
    if (val == null || val === "") return "—"
    const n = typeof val === "string" ? parseFloat(val) : val
    if (isNaN(n)) return "—"
    return `$${n.toFixed(2)}`
  },
  percent: (val: number | null | undefined): string => {
    if (val == null) return "—"
    return `${val.toFixed(1)}%`
  },
  diff: (mins: number | null | undefined): string => {
    if (mins == null) return "—"
    const sign = mins >= 0 ? "+" : ""
    return `${sign}${mins}m`
  },
}

/** Excel serial date → readable date string; passes through non-serials. */
export function convertExcelDate(value: unknown): string {
  if (typeof value === "number" && value > 40000 && value < 50000) {
    const base = new Date(1899, 11, 30)
    base.setDate(base.getDate() + value)
    return base.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }
  return String(value ?? "")
}
