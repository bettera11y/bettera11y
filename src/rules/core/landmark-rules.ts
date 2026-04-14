import type { RuleDefinition } from "../../contracts";

export const mainLandmarkRule: RuleDefinition = {
    meta: {
        id: "main-landmark",
        description: "Require exactly one main landmark.",
        category: "landmarks",
        defaultSeverity: "warn",
        tags: ["landmarks", "wcag-1.3.1"]
    },
    check({ document, locate }) {
        if (!document) return [];
        const mains = Array.from(document.querySelectorAll("main, [role='main']"));
        if (mains.length === 1) return [];
        if (mains.length === 0) {
            return [
                {
                    ruleId: "main-landmark",
                    message: "Document is missing a main landmark.",
                    severity: "warn",
                    category: "landmarks",
                    remediation: 'Add a <main> element (or role="main") around core page content.'
                }
            ];
        }

        return mains.map((main) => ({
            ruleId: "main-landmark",
            message: "Document has multiple main landmarks.",
            severity: "warn",
            category: "landmarks",
            remediation: "Keep only one top-level main landmark per page.",
            location: locate(main)
        }));
    }
};
