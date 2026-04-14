import { describe, expect, it } from "vitest";
import {
    audit,
    contrastRatio,
    defaultRules,
    parseCssColor,
    parseCssRuleBlocks,
    resolveCssValueWithVariables
} from "../src";

describe("style utility helpers", () => {
    it("parses common css color formats", () => {
        expect(parseCssColor("#fff")).toEqual({ r: 255, g: 255, b: 255, a: 1 });
        expect(parseCssColor("rgb(0, 0, 0)")).toEqual({ r: 0, g: 0, b: 0, a: 1 });
        expect(parseCssColor("hsl(0, 100%, 50%)")).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    });

    it("calculates contrast ratio between black and white", () => {
        const black = parseCssColor("black");
        const white = parseCssColor("white");
        expect(black).not.toBeNull();
        expect(white).not.toBeNull();
        expect(contrastRatio(black!, white!)).toBe(21);
    });

    it("resolves css variables with fallbacks", () => {
        const resolved = resolveCssValueWithVariables("var(--fg, #000)", { "--fg": "var(--tone, #333)" });
        expect(resolved).toBe("#333");
        expect(resolveCssValueWithVariables("var(--missing, #111)", {})).toBe("#111");
    });

    it("parses css rule blocks and declarations", () => {
        const blocks = parseCssRuleBlocks(":root{--fg:#222}.title{color:var(--fg);background:#fff}");
        expect(blocks).toHaveLength(2);
        expect(blocks[1]?.selector).toBe(".title");
        expect(blocks[1]?.declarations.color).toBe("var(--fg)");
    });

    it("audits inline HTML styles with inherited variable-driven colors", async () => {
        const html = `
        <style>
            :root { --fg: #7a7a7a; --bg: #8a8a8a; }
        </style>
        <main style="color: var(--fg); background-color: var(--bg);">
            <p>Inherited contrast sample</p>
        </main>
        `;

        const result = await audit(html, {
            rules: defaultRules,
            format: "html",
            filepath: "inline-style.html"
        });

        expect(result.diagnostics.some((item) => item.ruleId === "color-contrast")).toBe(true);
    });

    it("audits JSX inline style objects for contrast issues", async () => {
        const jsx = `
        export default function Card() {
            return (
                <section style={{ color: "#7a7a7a", backgroundColor: "#8a8a8a" }}>
                    <p>Low contrast JSX text</p>
                </section>
            );
        }
        `;

        const result = await audit(jsx, {
            rules: defaultRules,
            format: "jsx",
            filepath: "Card.jsx"
        });

        expect(result.diagnostics.some((item) => item.ruleId === "color-contrast")).toBe(true);
    });
});
