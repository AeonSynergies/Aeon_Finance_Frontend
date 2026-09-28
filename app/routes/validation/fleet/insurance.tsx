import { FleetSubModule, type FleetColumn } from "@/components/validation/FleetSubModule";

const dash = (v: unknown): string =>
  v === null || v === undefined || v === "" ? "—" : String(v);
const num = (v: unknown): string =>
  v === null || v === undefined || v === "" ? "0" : String(v);

/* Columns for INSURANCE rows. SOURCE fields keyed by master label; DERIVED
   fields (premiumExpected [pro-rated], variance) are camelCase from
   insuranceEngine. */
const COLUMNS: FleetColumn[] = [
  { key: "vin", label: "VIN", accessor: (d) => dash(d["VIN"]) },
  { key: "policyNo", label: "Policy No", accessor: (d) => dash(d["Policy No"]) },
  { key: "period", label: "Period", accessor: (d) => dash(d["Period"]) },
  { key: "premiumBilled", label: "Premium Billed", accessor: (d) => num(d["Premium Billed"]), align: "right" },
  { key: "premiumExpectedSrc", label: "Premium Expected", accessor: (d) => num(d["Premium Expected"]), align: "right" },
  { key: "premiumExpected", label: "Expected (calc)", accessor: (d) => num(d.premiumExpected), align: "right" },
  { key: "variance", label: "Variance", accessor: (d) => num(d.variance), align: "right" },
];

export default function InsurancePage() {
  return (
    <FleetSubModule
      module="INSURANCE"
      rowType="insurance"
      title="Insurance Validation"
      description="Validate carrier statements and vehicle schedules against expected premiums."
      jobIdPrefix="FL-INS"
      docTypes={["Carrier Statement", "Vehicle Schedule", "Claims Log"]}
      columns={COLUMNS}
      emptyRowsMessage="No rows yet — upload the Carrier Statement and Vehicle Schedule to begin validation"
    />
  );
}
