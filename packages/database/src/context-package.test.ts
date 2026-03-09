import { describe, expect, it } from "vitest";

import { buildContextPackage } from "./context-package";
import { createMockQuoteRepository } from "./mock-repository";

describe("database context package", () => {
  it("builds a compact context package from the quote record", async () => {
    const repository = createMockQuoteRepository();
    const record = await repository.createSession({
      agencyName: "Alana Tours",
      operatorId: "7c4af133-ffca-4c8d-bfd3-b34c7a7df1f0",
      title: "Madrid case",
    });

    const contextPackage = buildContextPackage(record);

    expect(contextPackage.metadata.title).toBe("Madrid case");
    expect(contextPackage.pendingQuestion).toContain("Comparte el pedido");
    expect(contextPackage.shortlists).toHaveLength(0);
  });
});
