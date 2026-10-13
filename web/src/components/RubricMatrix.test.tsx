import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RubricMatrix } from "./RubricMatrix";

describe("RubricMatrix", () => {
  it("renders a read-only table of criteria when not editable", () => {
    render(<RubricMatrix criteria={[{ id: "auth", description: "Authentication behaves correctly" }]} />);
    expect(screen.getByText("auth")).toBeInTheDocument();
    expect(screen.getByText("Authentication behaves correctly")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add criterion/i })).not.toBeInTheDocument();
  });

  it("shows an honest empty message instead of a blank table when there are no criteria", () => {
    render(<RubricMatrix criteria={[]} />);
    expect(screen.getByText(/no rubric criteria recorded/i)).toBeInTheDocument();
  });

  it("lets an editable matrix add a new criterion row via onChange", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RubricMatrix criteria={[{ id: "c1", description: "" }]} editable onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: /add criterion/i }));

    expect(onChange).toHaveBeenCalledWith([
      { id: "c1", description: "" },
      { id: "criterion-2", description: "" },
    ]);
  });

  it("lets an editable matrix remove a criterion row", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <RubricMatrix
        criteria={[
          { id: "c1", description: "first" },
          { id: "c2", description: "second" },
        ]}
        editable
        onChange={onChange}
      />
    );

    await user.click(screen.getAllByRole("button", { name: /remove/i })[0]);

    expect(onChange).toHaveBeenCalledWith([{ id: "c2", description: "second" }]);
  });
});
