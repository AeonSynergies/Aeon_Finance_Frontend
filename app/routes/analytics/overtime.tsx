import { redirect } from "react-router";

// OT analysis now lives in the Analytics → Payroll & Compliance tab.
export const clientLoader = () => redirect("/analytics");

export default function Redirect() {
  return null;
}
