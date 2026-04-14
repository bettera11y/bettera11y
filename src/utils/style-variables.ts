export interface CssRuleBlock {
    selector: string;
    declarations: Record<string, string>;
    startIndex: number;
}

export function parseDeclarationBlock(input: string): Record<string, string> {
    const declarations: Record<string, string> = {};
    const parts = input.split(";");
    for (const part of parts) {
        const [rawName, ...rawValue] = part.split(":");
        if (!rawName || rawValue.length === 0) {
            continue;
        }
        const name = rawName.trim().toLowerCase();
        const value = rawValue.join(":").trim();
        if (!name || !value) {
            continue;
        }
        declarations[name] = value;
    }
    return declarations;
}

export function parseCssRuleBlocks(cssText: string): CssRuleBlock[] {
    const cleaned = cssText.replace(/\/\*[\s\S]*?\*\//g, "");
    const blocks: CssRuleBlock[] = [];
    const rulePattern = /([^{}]+)\{([^{}]+)\}/g;
    let match: RegExpExecArray | null = rulePattern.exec(cleaned);
    while (match) {
        const selector = match[1]?.trim();
        const declarationText = match[2]?.trim();
        if (selector && declarationText) {
            blocks.push({
                selector,
                declarations: parseDeclarationBlock(declarationText),
                startIndex: match.index
            });
        }
        match = rulePattern.exec(cleaned);
    }
    return blocks;
}

export function extractVariableDeclarations(declarations: Record<string, string>): Record<string, string> {
    const variables: Record<string, string> = {};
    for (const [name, value] of Object.entries(declarations)) {
        if (name.startsWith("--")) {
            variables[name] = value;
        }
    }
    return variables;
}

export function mergeVariableMaps(...maps: Array<Record<string, string>>): Record<string, string> {
    return maps.reduce<Record<string, string>>((accumulator, map) => {
        for (const [name, value] of Object.entries(map)) {
            accumulator[name] = value;
        }
        return accumulator;
    }, {});
}

export function resolveCssValueWithVariables(
    value: string | undefined,
    variables: Record<string, string>,
    stack: string[] = []
): string | null {
    if (!value) {
        return null;
    }
    const variablePattern = /var\((--[\w-]+)(?:,\s*([^)]+))?\)/g;
    let resolved = value;
    let iterations = 0;

    while (resolved.includes("var(") && iterations < 16) {
        iterations += 1;
        const next = resolved.replace(variablePattern, (_, variableName: string, fallback: string | undefined) => {
            if (stack.includes(variableName)) {
                return fallback?.trim() ?? "";
            }
            const candidate = variables[variableName];
            if (candidate) {
                return (
                    resolveCssValueWithVariables(candidate, variables, [...stack, variableName]) ??
                    fallback?.trim() ??
                    ""
                );
            }
            return fallback?.trim() ?? "";
        });
        if (next === resolved) {
            break;
        }
        resolved = next;
    }

    const normalized = resolved.trim();
    return normalized.length > 0 ? normalized : null;
}

export function extractInlineStyleDeclarations(styleText: string | null): Record<string, string> {
    if (!styleText) {
        return {};
    }
    return parseDeclarationBlock(styleText);
}
