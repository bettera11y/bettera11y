import { describe, expect, it } from "vitest";
import { audit, defaultRules } from "../src";

async function run(html: string) {
    const result = await audit(html, {
        rules: defaultRules,
        filepath: "fixture.html"
    });
    return result.diagnostics;
}

function hasRule(diagnostics: Awaited<ReturnType<typeof run>>, ruleId: string): boolean {
    return diagnostics.some((diagnostic) => diagnostic.ruleId === ruleId);
}

describe("default rules", () => {
    it("flags missing image alt text", async () => {
        expect(hasRule(await run("<img src='/x.png' />"), "image-alt")).toBe(true);
        expect(hasRule(await run("<img src='/x.png' alt='x' />"), "image-alt")).toBe(false);
    });

    it("flags duplicate ids", async () => {
        expect(hasRule(await run("<div id='a'></div><p id='a'></p>"), "duplicate-id")).toBe(true);
        expect(hasRule(await run("<div id='a'></div><p id='b'></p>"), "duplicate-id")).toBe(false);
    });

    it("flags form controls without labels", async () => {
        expect(hasRule(await run("<input id='email' />"), "form-control-label")).toBe(true);
        expect(hasRule(await run("<label for='email'>Email</label><input id='email' />"), "form-control-label")).toBe(
            false
        );
    });

    it("flags duplicate h1 tags", async () => {
        expect(hasRule(await run("<h1>A</h1><h1>B</h1>"), "duplicate-h1")).toBe(true);
        expect(hasRule(await run("<h1>A</h1><h2>B</h2>"), "duplicate-h1")).toBe(false);
    });

    it("flags heading level jumps", async () => {
        expect(hasRule(await run("<h1>A</h1><h3>B</h3>"), "heading-order")).toBe(true);
        expect(hasRule(await run("<h1>A</h1><h2>B</h2><h3>C</h3>"), "heading-order")).toBe(false);
    });

    it("flags invalid aria attributes and boolean values", async () => {
        expect(hasRule(await run("<button aria-labl='x'>Save</button>"), "invalid-aria")).toBe(true);
        expect(hasRule(await run("<button aria-hidden='maybe'>Save</button>"), "invalid-aria")).toBe(true);
        expect(hasRule(await run("<button aria-hidden='true'>Save</button>"), "invalid-aria")).toBe(false);
    });

    it("flags missing aria semantics on interactive controls", async () => {
        expect(hasRule(await run("<button><svg></svg></button>"), "button-accessible-name")).toBe(true);
        expect(hasRule(await run("<button aria-label='Close'><svg></svg></button>"), "button-accessible-name")).toBe(
            false
        );
        expect(hasRule(await run("<div role='button'></div>"), "interactive-role-name")).toBe(true);
        expect(hasRule(await run("<div role='button' aria-label='Open menu'></div>"), "interactive-role-name")).toBe(
            false
        );
    });
});
