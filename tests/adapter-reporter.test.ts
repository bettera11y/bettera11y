import { describe, expect, it } from "vitest";
import {
  MockAdapter,
  createEngine,
  createJsonReporter,
  createMachineReporter,
  createPrettyReporter,
  defaultRules,
} from "../src";

describe("adapter and reporters", () => {
  it("mock adapter captures realtime diagnostics", async () => {
    const engine = createEngine(defaultRules);
    const adapter = new MockAdapter({
      emit: (input) => engine.run(input),
    });

    adapter.start();
    await adapter.onInput({
      kind: "html",
      source: { path: "adapter.html" },
      html: "<img src='/missing-alt.png' />",
    });
    adapter.stop();

    expect(adapter.started).toBe(false);
    expect(adapter.receivedInputs).toHaveLength(1);
    expect(adapter.diagnostics).toHaveLength(1);
    expect(adapter.diagnostics[0]?.diagnostics.length).toBeGreaterThan(0);
  });

  it("formats diagnostics in json, machine, and pretty output", async () => {
    const result = await createEngine(defaultRules).run({
      kind: "html",
      source: { path: "reporter.html" },
      html: "<button><svg></svg></button>",
    });

    const jsonOut = createJsonReporter().format(result);
    const machineOut = createMachineReporter().format(result);
    const prettyOut = createPrettyReporter().format(result);

    expect(jsonOut).toContain('"diagnostics"');
    expect(machineOut).toContain('"metadata"');
    expect(prettyOut).toContain("button-accessible-name");
  });
});
