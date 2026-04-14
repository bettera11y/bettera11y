import { describe, expect, it } from "vitest";
import {
    MockAdapter,
    audit,
    createJsonReporter,
    createMachineReporter,
    createPrettyReporter,
    defaultRules
} from "../src";

describe("adapter and reporters", () => {
    it("mock adapter captures realtime diagnostics", async () => {
        const adapter = new MockAdapter({
            emit: (input) => audit(input, { rules: defaultRules })
        });

        adapter.start();
        await adapter.onInput({
            content: "<img src='/missing-alt.png' />",
            source: { kind: "file", path: "adapter.html" }
        });
        adapter.stop();

        expect(adapter.started).toBe(false);
        expect(adapter.receivedInputs).toHaveLength(1);
        expect(adapter.diagnostics).toHaveLength(1);
        expect(adapter.diagnostics[0]?.diagnostics.length).toBeGreaterThan(0);
    });

    it("formats diagnostics in json, machine, and pretty output", async () => {
        const result = await audit("<button><svg></svg></button>", {
            rules: defaultRules,
            filepath: "reporter.html"
        });

        const jsonOut = createJsonReporter().format(result);
        const machineOut = createMachineReporter().format(result);
        const prettyOut = createPrettyReporter().format(result);

        expect(jsonOut).toContain('"diagnostics"');
        expect(machineOut).toContain('"metadata"');
        expect(prettyOut).toContain("button-accessible-name");
    });
});
