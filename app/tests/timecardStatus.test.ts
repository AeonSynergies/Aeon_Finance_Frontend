import { describe, it, expect } from "vitest"
import { computeDateStatus, computeJobOverallStatus } from "@/lib/timecardStatus"

describe("computeDateStatus", () => {
  const base = { payrollUploaded: false, amazonUploaded: false, hasValidationRows: false, hasErrors: false, allApproved: false }
  it("pending when nothing uploaded", () => expect(computeDateStatus(base)).toBe("Pending"))
  it("awaiting amazon when only payroll", () => expect(computeDateStatus({ ...base, payrollUploaded: true })).toBe("Awaiting Amazon"))
  it("awaiting payroll when only amazon", () => expect(computeDateStatus({ ...base, amazonUploaded: true })).toBe("Awaiting Payroll"))
  it("ready when both files, no rows yet", () => expect(computeDateStatus({ ...base, payrollUploaded: true, amazonUploaded: true })).toBe("Ready"))
  it("in review when rows have errors", () => expect(computeDateStatus({ ...base, payrollUploaded: true, amazonUploaded: true, hasValidationRows: true, hasErrors: true })).toBe("In Review"))
  it("validated when rows clean", () => expect(computeDateStatus({ ...base, payrollUploaded: true, amazonUploaded: true, hasValidationRows: true })).toBe("Validated"))
  it("approved when all approved", () => expect(computeDateStatus({ ...base, hasValidationRows: true, allApproved: true })).toBe("Approved"))
})

describe("computeJobOverallStatus", () => {
  it("locked/submitted/approved from db status", () => {
    expect(computeJobOverallStatus([], "LOCKED")).toBe("Locked")
    expect(computeJobOverallStatus(["Validated"], "SENT_FOR_APPROVAL")).toBe("Submitted")
    expect(computeJobOverallStatus(["Validated"], "APPROVED")).toBe("Approved")
  })
  it("pending upload when all pending", () => expect(computeJobOverallStatus(["Pending", "Pending"], "INPROGRESS")).toBe("Pending Upload"))
  it("partial upload when some awaiting", () => expect(computeJobOverallStatus(["Pending", "Awaiting Amazon"], "INPROGRESS")).toBe("Partial Upload"))
  it("needs attention when any in review", () => expect(computeJobOverallStatus(["Validated", "In Review"], "INPROGRESS")).toBe("Needs Attention"))
  it("validated when all validated/approved", () => expect(computeJobOverallStatus(["Validated", "Approved"], "INPROGRESS")).toBe("Validated"))
  it("in progress on mix", () => expect(computeJobOverallStatus(["Validated", "Pending"], "INPROGRESS")).toBe("In Progress"))
})
