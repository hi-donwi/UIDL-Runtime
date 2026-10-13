import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { UIDocumentRenderer } from "../UIDocumentRenderer";
import { compileDashboardPage } from "../../compiler/dashboard";
import { createDocumentState } from "../../state/createDocumentState";

describe("a dashboard KPI bound to a query result, rendered", () => {
  it("shows what the data source returned, formatted as the KPI says", () => {
    const doc = compileDashboardPage(
      {
        name: "ops",
        label: { id: "Ops", en: "Ops" },
        kpis: [{ label: { id: "Terbuka", en: "Open tickets" }, value: { $bind: "state.$data.open.total" }, format: "integer" }],
      },
      { hostCapabilities: { collections: [], commands: [] }, uiPolicy: { lang: "en" } },
    );
    // What the query runner writes once `open` resolves (state.md: the $data envelope).
    const stateStore = createDocumentState({ $data: { open: { status: "success", rows: [], total: 1234 } } }).getState();
    render(<UIDocumentRenderer document={doc} stateStore={stateStore} />);
    expect(screen.getByText("Open tickets")).toBeTruthy();
    expect(screen.getByText(/1[.,]?234/)).toBeTruthy();
  });
});
