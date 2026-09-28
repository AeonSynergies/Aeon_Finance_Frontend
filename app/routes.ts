import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  route("login", "routes/login.tsx"),
  route("invite/:token", "routes/invite.tsx"),
  layout("routes/_protected.tsx", [
    index("routes/index.tsx"),
    route("dashboard", "routes/dashboard.tsx"),
    route("upload", "routes/upload.tsx"),
    route("calendar", "routes/calendar.tsx"),
    route("reports", "routes/reports.tsx"),
    route("rate-card", "routes/rate-card.tsx"),
    route("team", "routes/team.tsx"),
    route("settings", "routes/settings.tsx"),
    route("news", "routes/news.tsx"),
    route("help", "routes/help.tsx"),

    route("analytics", "routes/analytics/index.tsx"),
    route("analytics/overtime", "routes/analytics/overtime.tsx"),
    route("analytics/cap", "routes/analytics/cap.tsx"),
    route("analytics/payroll-review", "routes/analytics/payroll-review.tsx"),
    route("analytics/payroll-revenue", "routes/analytics/payroll-revenue.tsx"),

    route("validation", "routes/validation/index.tsx"),
    route("validation/timecard", "routes/validation/timecard.tsx"),
    route("validation/routes", "routes/validation/routes/index.tsx"),
    route("validation/routes/invoice", "routes/validation/routes/invoice.tsx"),
    route("validation/fleet/rfs-afs", "routes/validation/fleet/rfs-afs.tsx"),
    route("validation/fleet/revenue", "routes/validation/fleet/revenue.tsx"),
    route("validation/fleet/rental", "routes/validation/fleet/rental.tsx"),
    route("validation/fleet/repair", "routes/validation/fleet/repair.tsx"),
    route("validation/fleet/insurance", "routes/validation/fleet/insurance.tsx"),
  ]),
  route("*", "routes/not-found.tsx"),
] satisfies RouteConfig;
