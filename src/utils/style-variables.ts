export interface CssRuleBlock {
    selector: string;
    declarations: Record<string, string>;
    startIndex: number;
}

/**
 * Parses a CSS declaration block string into property/value pairs.
 *
 * @param input Declaration text such as `color:red; background:#fff`.
 * @returns Lower-cased declaration map.
 */
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

/**
 * Parses CSS text into flat selector/declaration rule blocks.
 *
 * @param cssText Raw CSS text.
 * @returns Parsed rule block collection with source offsets.
 */
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

/**
 * Extracts only CSS custom properties from a declaration map.
 *
 * @param declarations CSS declarations keyed by property name.
 * @returns Variable map containing entries whose name starts with `--`.
 */
export function extractVariableDeclarations(declarations: Record<string, string>): Record<string, string> {
    const variables: Record<string, string> = {};
    for (const [name, value] of Object.entries(declarations)) {
        if (name.startsWith("--")) {
            variables[name] = value;
        }
    }
    return variables;
}

/**
 * Merges multiple variable maps where later maps override earlier values.
 *
 * @param maps Variable maps ordered from lowest to highest precedence.
 * @returns Combined variable map.
 */
export function mergeVariableMaps(...maps: Array<Record<string, string>>): Record<string, string> {
    return maps.reduce<Record<string, string>>((accumulator, map) => {
        for (const [name, value] of Object.entries(map)) {
            accumulator[name] = value;
        }
        return accumulator;
    }, {});
}

/**
 * Resolves `var(--token, fallback)` expressions recursively.
 *
 * @param value CSS value that may contain `var(...)`.
 * @param variables Available variable definitions.
 * @param stack Internal recursion guard for cyclic references.
 * @returns Resolved value, or null when no value remains.
 */
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

/**
 * Parses inline style attribute text into declaration pairs.
 *
 * @param styleText Element style attribute value.
 * @returns Parsed declarations, or an empty map when style text is missing.
 */
export function extractInlineStyleDeclarations(styleText: string | null): Record<string, string> {
    if (!styleText) {
        return {};
    }
    return parseDeclarationBlock(styleText);
}
