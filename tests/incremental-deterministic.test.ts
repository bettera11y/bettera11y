import { describe, expect, it } from "vitest";
import { auditIncremental, strictPreset } from "../src";

describe("deterministic incremental output", () => {
  it("produces stable diagnostic fingerprints across repeated runs", async () => {
    const input = {
      content: "<html><main><button></button><img src='/x.png' /></main></html>",
      filepath: "deterministic.html",
    };

    const first = await auditIncremental(
      { changes: [input] },
      { rules: strictPreset },
    );
    const second = await auditIncremental(
      { changes: [input] },
      { rules: strictPreset },
    );

    expect(first[0]?.diagnostics.map((d) => d.id)).toEqual(
      second[0]?.diagnostics.map((d) => d.id),
    );
  });
});
