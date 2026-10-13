import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBadge, ExperimentalBadge } from "./StatusBadge";

describe("StatusBadge", () => {
  it("renders the known FINALIZED state with readable text, not color-only", () => {
    render(<StatusBadge state="FINALIZED" />);
    expect(screen.getByText(/finalized/i)).toBeInTheDocument();
  });

  it("falls back gracefully for an unrecognized state string instead of crashing", () => {
    render(<StatusBadge state="SOME_UNKNOWN_STATE" />);
    expect(screen.getByText(/some unknown state/i)).toBeInTheDocument();
  });

  it("underscore-separated states are rendered with spaces for readability", () => {
    render(<StatusBadge state="CHALLENGE_WINDOW" />);
    expect(screen.getByText("CHALLENGE WINDOW")).toBeInTheDocument();
  });
});

describe("ExperimentalBadge", () => {
  it("defaults to the label 'Experimental'", () => {
    render(<ExperimentalBadge />);
    expect(screen.getByText("Experimental")).toBeInTheDocument();
  });

  it("accepts a custom honesty label such as advisory/non-binding", () => {
    render(<ExperimentalBadge label="Advisory · non-binding" />);
    expect(screen.getByText("Advisory · non-binding")).toBeInTheDocument();
  });
});
