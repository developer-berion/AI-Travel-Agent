import { afterEach, describe, expect, it } from "vitest";

import { useCompareStore } from "./compare-store";

describe("compare store", () => {
  afterEach(() => {
    useCompareStore.getState().clear();
  });

  it("keeps compare category-specific", () => {
    useCompareStore.getState().toggleOption("hotel-1", "hotel");
    useCompareStore.getState().toggleOption("hotel-2", "hotel");
    useCompareStore.getState().toggleOption("transfer-1", "transfer");

    expect(useCompareStore.getState().selectedServiceLine).toBe("transfer");
    expect(useCompareStore.getState().selectedOptionIds).toEqual([
      "transfer-1",
    ]);
  });

  it("caps compare selection at five options", () => {
    for (const optionId of ["1", "2", "3", "4", "5", "6"]) {
      useCompareStore.getState().toggleOption(optionId, "hotel");
    }

    expect(useCompareStore.getState().selectedOptionIds).toEqual([
      "2",
      "3",
      "4",
      "5",
      "6",
    ]);
  });

  it("lets the operator switch compare category and resets ephemeral selection", () => {
    useCompareStore.getState().toggleOption("hotel-1", "hotel");
    useCompareStore.getState().setSelectedServiceLine("transfer");

    expect(useCompareStore.getState().selectedServiceLine).toBe("transfer");
    expect(useCompareStore.getState().selectedOptionIds).toEqual([]);
  });
});
