import { describe, expect, it } from "vitest";

import { selectLatestMigrationHead } from "./runtime-sync";

describe("selectLatestMigrationHead", () => {
  it("returns the latest sql migration filename", () => {
    expect(
      selectLatestMigrationHead([
        "20260309150000_initial_quote_os_schema.sql",
        "README.md",
        "20260310163000_quote_exports_storage.sql",
        "20260310111500_selected_quote_items_bundle_review.sql",
      ]),
    ).toBe("20260310163000_quote_exports_storage.sql");
  });

  it("returns null when no sql migrations exist", () => {
    expect(selectLatestMigrationHead(["README.md", "notes.txt"])).toBeNull();
  });
});
