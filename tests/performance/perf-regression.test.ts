import { describe, expect, it } from "vitest";
import { createEngine, strictPreset } from "../../src";

describe("performance regression", () => {
  it("incremental rerun uses cache on unchanged inputs", async () => {
    const engine = createEngine(strictPreset);
    const html =
      "<html><main>" +
      Array.from(
        { length: 200 },
        (_, i) => `<button id='b${i}'></button>`,
      ).join("") +
      "</main></html>";

    const request = {
      changes: [{ kind: "html" as const, source: { path: "big.html" }, html }],
    };

    const first = await engine.runIncremental(request);
    const second = await engine.runIncremental(request);

    expect(first[0]?.metadata.cacheHit).toBe(false);
    expect(second[0]?.metadata.cacheHit).toBe(true);
  });
});
