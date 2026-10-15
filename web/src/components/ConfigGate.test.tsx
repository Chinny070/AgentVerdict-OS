import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { ConfigGate } from "./ConfigGate";
import { ContractAddressProvider } from "../state/ContractAddressContext";

function renderGate() {
  return render(
    <MemoryRouter>
      <ContractAddressProvider>
        <ConfigGate>
          <div>Protected content</div>
        </ConfigGate>
      </ContractAddressProvider>
    </MemoryRouter>
  );
}

describe("ConfigGate", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders protected content by default, using the app's built-in Stage 12 address, when nothing is configured", () => {
    renderGate();
    expect(screen.getByText("Protected content")).toBeInTheDocument();
    expect(screen.queryByText(/no contract configured/i)).not.toBeInTheDocument();
  });

  it("renders protected content once a valid address is explicitly configured in localStorage", () => {
    window.localStorage.setItem("agentverdict:contractAddress", "0x1234567890123456789012345678901234567890");
    renderGate();
    expect(screen.getByText("Protected content")).toBeInTheDocument();
    expect(screen.queryByText(/no contract configured/i)).not.toBeInTheDocument();
  });

  it("shows an honest 'no contract configured' empty state and never renders protected content after an explicit disconnect", () => {
    window.localStorage.setItem("agentverdict:contractAddress", "__none__");
    renderGate();
    expect(screen.getByText(/no contract configured/i)).toBeInTheDocument();
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /go to settings/i })).toBeInTheDocument();
  });
});
