import { redirect } from "react-router";

// CAP compliance now lives in the Analytics → Payroll & Compliance tab.
export const clientLoader = () => redirect("/analytics");

export default function Redirect() {
  return null;
}
