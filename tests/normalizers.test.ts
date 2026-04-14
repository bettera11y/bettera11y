import { describe, expect, it } from "vitest";
import {
  jsxToHtml,
  markdownToHtml,
  normalizeInputToHtml,
  tsxToHtml,
} from "../src/dom";
import type { NormalizedAuditInput } from "../src/contracts";

describe("built-in normalizers", () => {
  it("converts markdown headings and images using marked", () => {
    const html = markdownToHtml("# Title\n\n![Alt text](/a.png)");
    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain('alt="Alt text"');
  });

  it("converts jsx element trees to html-like output", () => {
    const html = jsxToHtml(
      `export default function App() { return <main><button aria-label="Save" /></main>; }`,
    );
    expect(html).toContain("<main>");
    expect(html).toContain('aria-label="Save"');
  });

  it("converts tsx with basic TypeScript syntax", () => {
    const html = tsxToHtml(
      `type Props = { label: string };
      export default function App(props: Props) {
        return <button aria-label={props.label}>Save</button>;
      }`,
    );
    expect(html).toContain("<button");
    expect(html).toContain("Save");
  });

  it("supports custom normalizer overrides before built-ins", () => {
    const input: NormalizedAuditInput = {
      content: "ignored",
      format: "markdown",
      source: { kind: "inline", label: "override" },
    };
    const html = normalizeInputToHtml(input, {
      markdown: () => "<main><h1>Custom</h1></main>",
    });
    expect(html).toBe("<main><h1>Custom</h1></main>");
  });
});
