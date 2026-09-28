import { redirect } from "react-router";

// Payroll review is consolidated into the Analytics → Payroll & Compliance tab.
export const clientLoader = () => redirect("/analytics");

export default function Redirect() {
  return null;
}
