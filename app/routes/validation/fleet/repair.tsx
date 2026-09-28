import { FleetSubModule, type FleetColumn } from "@/components/validation/FleetSubModule";

const dash = (v: unknown): string =>
  v === null || v === undefined || v === "" ? "—" : String(v);
const num = (v: unknown): string =>
  v === null || v === undefined || v === "" ? "0" : String(v);
const yesNo = (v: unknown): string => (v === true ? "Yes" : "No");

/* Columns for REPAIR_MAINTENANCE rows. SOURCE fields keyed by master label;
   DERIVED fields (computedTotal, unauthorized, duplicate) are camelCase from
   repairEngine. */
const COLUMNS: FleetColumn[] = [
  { key: "invoiceNo", label: "Invoice No", accessor: (d) => dash(d["Invoice No"]) },
  { key: "vin", label: "VIN", accessor: (d) => dash(d["VIN"]) },
  { key: "workOrder", label: "Work Order", accessor: (d) => dash(d["Work Order"]) },
  { key: "vendor", label: "Vendor", accessor: (d) => dash(d["Vendor"]) },
  { key: "date", label: "Date", accessor: (d) => dash(d["Date"]) },
  { key: "totalInvoiced", label: "Total Invoiced", accessor: (d) => num(d["Total Invoiced"]), align: "right" },
  { key: "computedTotal", label: "Computed Total", accessor: (d) => num(d.computedTotal), align: "right" },
  { key: "unauthorized", label: "Unauthorized", accessor: (d) => yesNo(d.unauthorized) },
  { key: "duplicate", label: "Duplicate", accessor: (d) => yesNo(d.duplicate) },
];

export default function RepairPage() {
  return (
    <FleetSubModule
      module="REPAIR_MAINTENANCE"
      rowType="repair"
      title="Repair & Maintenance Validation"
      description="Reconcile shop invoices and work orders against vehicle service history."
      jobIdPrefix="FL-RM"
      docTypes={["Shop Invoice", "Work Orders", "Parts Receipts"]}
      columns={COLUMNS}
      emptyRowsMessage="No rows yet — upload the Shop Invoice to begin validation"
    />
  );
}
