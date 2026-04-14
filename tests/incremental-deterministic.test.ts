import { describe, expect, it } from "vitest";
import { createEngine, strictPreset } from "../src";

describe("deterministic incremental output", () => {
  it("produces stable diagnostic fingerprints across repeated runs", async () => {
    const engine = createEngine(strictPreset);
    const input = {
      kind: "html" as const,
      source: { path: "deterministic.html" },
      html: "<html><main><button></button><img src='/x.png' /></main></html>",
    };

    const first = await engine.runIncremental({ changes: [input] });
    const second = await engine.runIncremental({ changes: [input] });

    expect(first[0]?.diagnostics.map((d) => d.id)).toEqual(
      second[0]?.diagnostics.map((d) => d.id),
    );
  });
});
