import { describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import { PageBar } from "../../components/primitives";

describe("pagination contract", () => {
  it("describes an empty result as zero records and disables both directions", () => {
    const { getByText, getByRole } = render(<PageBar total={0} />);
    expect(getByText("0 - 0")).toBeTruthy();
    expect(getByRole("button", { name: "Previous page" })).toBeDisabled();
    expect(getByRole("button", { name: "Next page" })).toBeDisabled();
  });

  it("keeps single-page controls disabled and reports the actual range", () => {
    const { getByText, getByRole } = render(<PageBar total={2} pageSize={20} />);
    expect(getByText("1 - 2")).toBeTruthy();
    expect(getByRole("button", { name: "Previous page" })).toBeDisabled();
    expect(getByRole("button", { name: "Next page" })).toBeDisabled();
  });

  it("moves within server page boundaries and resets before changing page size", () => {
    const changed = vi.fn();
    const resized = vi.fn();
    const { getByRole } = render(<PageBar total={120} page={2} pageSize={20}
      onPageChange={changed} onPageSizeChange={resized} />);
    fireEvent.click(getByRole("button", { name: "Previous page" }));
    fireEvent.click(getByRole("button", { name: "Next page" }));
    fireEvent.click(getByRole("button", { name: /^100$/ }));
    expect(changed.mock.calls).toEqual([[1], [3], [1]]);
    expect(resized).toHaveBeenCalledWith(100);
  });
});
