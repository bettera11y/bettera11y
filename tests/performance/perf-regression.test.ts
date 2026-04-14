import { describe, expect, it } from "vitest";
import { auditIncremental, startAuditSession, strictPreset } from "../../src";

describe("performance regression", () => {
    it("session incremental rerun uses cache on unchanged inputs", async () => {
        const html =
            "<html><main>" +
            Array.from({ length: 200 }, (_, i) => `<button id='b${i}'></button>`).join("") +
            "</main></html>";

        const request = {
            changes: [{ content: html, filepath: "big.html" }]
        };

        const session = startAuditSession({ rules: strictPreset });
        await session.start();
        const first = await session.auditIncremental(request);
        const second = await session.auditIncremental(request);
        await session.stop();

        expect(first[0]?.metadata.cacheHit).toBe(false);
        expect(second[0]?.metadata.cacheHit).toBe(true);
    });

    it("stateless incremental calls do not share cache between invocations", async () => {
        const request = {
            changes: [
                {
                    content: "<main></main>",
                    filepath: "a.html"
                }
            ]
        };
        const first = await auditIncremental(request, { rules: strictPreset });
        const second = await auditIncremental(request, { rules: strictPreset });
        expect(first[0]?.metadata.cacheHit).toBe(false);
        expect(second[0]?.metadata.cacheHit).toBe(false);
    });
});
