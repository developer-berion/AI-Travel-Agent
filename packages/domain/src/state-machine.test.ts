import { describe, expect, it } from "vitest";

import { assertCommandAllowed, canTransitionSessionState } from "./index";

describe("quote state machine", () => {
  it("allows draft to move into clarifying", () => {
    expect(canTransitionSessionState("draft", "clarifying")).toBe(true);
  });

  it("prevents draft from jumping directly to export_ready", () => {
    expect(canTransitionSessionState("draft", "export_ready")).toBe(false);
  });

  it("allows clarifying to move into reviewing when partial results become actionable", () => {
    expect(canTransitionSessionState("clarifying", "reviewing")).toBe(true);
  });

  it("allows archive only from allowed states", () => {
    expect(assertCommandAllowed("draft", "archive_quote_session")).toBe(true);
    expect(assertCommandAllowed("archived", "archive_quote_session")).toBe(
      false,
    );
  });

  it("allows cart commands from clarifying when a partial shortlist already exists", () => {
    expect(assertCommandAllowed("clarifying", "select_option_for_cart")).toBe(
      true,
    );
  });
});
