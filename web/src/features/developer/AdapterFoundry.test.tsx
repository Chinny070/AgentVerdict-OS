import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AdapterFoundry from "./AdapterFoundry";

/**
 * Regression test for the confirmed mobile-overflow bug (375px viewport:
 * scrollWidth 757 vs clientWidth 375) documented in
 * docs/SUBMISSION_READINESS_REPORT.md section 10. The contract method
 * manifest table has no intrinsic way to shrink below its content width
 * (table-layout: auto), so it must sit inside a `.table-scroll` container
 * (overflow-x: auto; see web/src/design/global.css) rather than escaping
 * page containment. This asserts the structural fix is in place, not just
 * that the table renders.
 */
describe("AdapterFoundry", () => {
  it("wraps the contract method manifest table in a horizontal scroll container", () => {
    render(<AdapterFoundry />);

    const manifestTable = screen.getByText("Method").closest("table");
    expect(manifestTable).not.toBeNull();
    expect(manifestTable!.closest(".table-scroll")).not.toBeNull();
  });

  it("renders the contract method manifest heading and at least one method row", () => {
    render(<AdapterFoundry />);
    expect(screen.getByText("Contract method manifest")).toBeInTheDocument();
    expect(screen.getAllByRole("row").length).toBeGreaterThan(1);
  });
});
