/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from "vitest";
import { audit, createBrowserRuntimeAdapter, recommendedPreset } from "../src/browser";

describe("bettera11y/browser", () => {
    it("audits HTML with an explicit browser runtime adapter", async () => {
        const html = `<!DOCTYPE html><html><body><img src="x.png" /></body></html>`;
        const result = await audit(
            { content: html, format: "html", filepath: "page.html" },
            { rules: recommendedPreset, runtimeAdapter: createBrowserRuntimeAdapter() }
        );
        expect(result.diagnostics.some((d) => d.ruleId === "image-alt")).toBe(true);
    });

    it("uses the bundled browser default adapter when none is passed", async () => {
        const html = `<!DOCTYPE html><html><body><img src="y.png" /></body></html>`;
        const result = await audit(
            { content: html, format: "html", filepath: "page.html" },
            { rules: recommendedPreset }
        );
        expect(result.diagnostics.some((d) => d.ruleId === "image-alt")).toBe(true);
    });
});
