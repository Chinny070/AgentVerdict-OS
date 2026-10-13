import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("always teaches the first real action via title and description", () => {
    render(<EmptyState title="No bookmarked agreements yet" description="Create one in Agreement Forge." />);
    expect(screen.getByText("No bookmarked agreements yet")).toBeInTheDocument();
    expect(screen.getByText("Create one in Agreement Forge.")).toBeInTheDocument();
  });

  it("renders an optional action affordance when provided", () => {
    render(<EmptyState title="Nothing here" action={<button>Do the thing</button>} />);
    expect(screen.getByRole("button", { name: "Do the thing" })).toBeInTheDocument();
  });
});
