import { describe, expect, it } from "vitest";
import { audit, defaultRules } from "../src";

describe("diagnostics snapshots", () => {
  it("keeps diagnostics shape and remediation stable", async () => {
    const result = await audit(
      `
        <html>
        <main>
          <h1>Page</h1>
          <h3>Skipped heading</h3>
          <button><svg /></button>
          <img src="/missing.png" />
          <div id="dup"></div>
          <section id="dup"></section>
          <input id="name" />
          <div role="button"></div>
          <button aria-hidden="maybe">Save</button>
        </main>
        </html>
      `,
      { rules: defaultRules, filepath: "snapshot.html" },
    );

    expect(result.diagnostics).toMatchSnapshot();
  });
});
