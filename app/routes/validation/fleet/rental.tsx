import { FleetSubModule, type FleetColumn } from "@/components/validation/FleetSubModule";

const dash = (v: unknown): string =>
  v === null || v === undefined || v === "" ? "—" : String(v);
const num = (v: unknown): string =>
  v === null || v === undefined || v === "" ? "0" : String(v);

/* Columns for RENTAL rows. SOURCE fields keyed by master label; DERIVED fields
   (dayDiff, expectedAmount, variance) are camelCase from rentalEngine. */
const COLUMNS: FleetColumn[] = [
  { key: "vin", label: "VIN", accessor: (d) => dash(d["VIN"]) },
  { key: "vendor", label: "Vendor", accessor: (d) => dash(d["Vendor"]) },
  { key: "invoiceNo", label: "Invoice No", accessor: (d) => dash(d["Invoice No"]) },
  { key: "daysBilled", label: "Days Billed", accessor: (d) => num(d["Days Billed"]), align: "right" },
  { key: "daysUsed", label: "Days Used", accessor: (d) => num(d["Days Used"]), align: "right" },
  { key: "rate", label: "Rate", accessor: (d) => num(d["Rate"]), align: "right" },
  { key: "amount", label: "Amount", accessor: (d) => num(d["Amount"]), align: "right" },
  { key: "dayDiff", label: "Day Diff", accessor: (d) => num(d.dayDiff), align: "right" },
  { key: "expectedAmount", label: "Expected Amt", accessor: (d) => num(d.expectedAmount), align: "right" },
  { key: "variance", label: "Variance", accessor: (d) => num(d.variance), align: "right" },
];

export default function RentalPage() {
  return (
    <FleetSubModule
      module="RENTAL"
      rowType="rental"
      title="Rental Validation"
      description="Validate monthly rental vendor invoices against fleet roster and rented-day usage."
      jobIdPrefix="FL-RNT"
      docTypes={["Rental Vendor Invoice", "Fleet Roster", "Day-Usage Report"]}
      columns={COLUMNS}
      emptyRowsMessage="No rows yet — upload the Rental Vendor Invoice and Fleet Roster to begin validation"
    />
  );
}
