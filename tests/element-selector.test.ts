import { describe, expect, it } from "vitest";
import { createDocumentFromHtml } from "../src/dom-node";
import { createElementSelector } from "../src/dom-shared";

describe("createElementSelector", () => {
    it("uses a path selector when multiple elements share the same id", () => {
        const doc = createDocumentFromHtml("<body><div id='root'><p id='x'>a</p><p id='x'>b</p></div></body>");
        const ps = Array.from(doc.querySelectorAll("p"));
        expect(ps).toHaveLength(2);
        const sel0 = createElementSelector(ps[0]!);
        const sel1 = createElementSelector(ps[1]!);
        expect(sel0).not.toBe(sel1);
        expect(doc.querySelector(sel0)).toBe(ps[0]);
        expect(doc.querySelector(sel1)).toBe(ps[1]);
    });

    it("uses an attribute id selector when the id is unique", () => {
        const doc = createDocumentFromHtml("<body><p id='only'>hi</p></body>");
        const p = doc.querySelector("p");
        expect(p).toBeTruthy();
        const sel = createElementSelector(p!);
        expect(sel).toBe('[id="only"]');
        expect(doc.querySelector(sel)).toBe(p);
    });

    it("escapes quotes and backslashes in unique id attribute selectors", () => {
        const doc = createDocumentFromHtml("<body><p>x</p></body>");
        const p = doc.querySelector("p")!;
        p.setAttribute("id", 'a"b\\c');
        const sel = createElementSelector(p);
        expect(doc.querySelector(sel)).toBe(p);
    });
});
