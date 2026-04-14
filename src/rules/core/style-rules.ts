import type { DiagnosticLocation, RuleDefinition, RuleDiagnostic } from "../../contracts";
import {
    collectInlineStyleSnapshot,
    contrastRatio,
    extractInlineStyleDeclarations,
    formatColor,
    mergeVariableMaps,
    parseCssColor,
    parseCssRuleBlocks,
    resolveCssValueWithVariables,
    selectorToSourceLocation
} from "../../utils";
import { extractVariableDeclarations } from "../../utils/style-variables";

/** Default WCAG AA threshold for normal text. */
const DEFAULT_NORMAL_TEXT_THRESHOLD = 4.5;
/** Default WCAG AA threshold for large text. */
const DEFAULT_LARGE_TEXT_THRESHOLD = 3;
/** Large text threshold in pixels for regular weight text. */
const DEFAULT_LARGE_TEXT_PX = 24;
/** Large text threshold in pixels for bold text. */
const DEFAULT_LARGE_BOLD_TEXT_PX = 18.66;
/** Minimum recommended font size used by readability heuristic. */
const DEFAULT_MIN_FONT_SIZE_PX = 12;
/** Minimum recommended line-height ratio used by readability heuristic. */
const DEFAULT_MIN_LINE_HEIGHT_RATIO = 1.3;

/**
 * Reads a numeric option with graceful fallback parsing.
 *
 * @param options Rule options payload.
 * @param key Target option key.
 * @param fallback Fallback value.
 * @returns Parsed numeric option.
 */
function getNumberOption(
    options: Record<string, boolean | number | string> | undefined,
    key: string,
    fallback: number
): number {
    const value = options?.[key];
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === "string") {
        const numeric = Number(value);
        if (Number.isFinite(numeric)) {
            return numeric;
        }
    }
    return fallback;
}

/**
 * Resolves and parses a CSS color value with variable substitution.
 *
 * @param value Raw color expression.
 * @param variables Available CSS variables.
 * @returns Parsed color or null when unresolved.
 */
function resolveContextColor(
    value: string | undefined,
    variables: Record<string, string>
): ReturnType<typeof parseCssColor> {
    const resolved = resolveCssValueWithVariables(value, variables);
    return parseCssColor(resolved ?? undefined);
}

/**
 * Determines whether text should use the large-text contrast threshold.
 *
 * @param fontSizePx Font size in pixels.
 * @param fontWeight Numeric font weight.
 * @param options Rule option overrides.
 * @returns True when text qualifies as large text.
 */
function isLargeText(
    fontSizePx: number | undefined,
    fontWeight: number | undefined,
    options?: Record<string, boolean | number | string>
): boolean {
    if (!fontSizePx) {
        return false;
    }
    const largeTextPx = getNumberOption(options, "largeTextPx", DEFAULT_LARGE_TEXT_PX);
    const largeBoldTextPx = getNumberOption(options, "largeBoldTextPx", DEFAULT_LARGE_BOLD_TEXT_PX);
    const weight = fontWeight ?? 400;
    return fontSizePx >= largeTextPx || (weight >= 700 && fontSizePx >= largeBoldTextPx);
}

/**
 * Builds a standardized contrast diagnostic payload.
 *
 * @param ruleId Rule identifier.
 * @param contrast Measured contrast ratio.
 * @param threshold Required threshold.
 * @param foreground Resolved foreground color string.
 * @param background Resolved background color string.
 * @param location Diagnostic source location.
 * @param sourceType Inline style or CSS rule origin.
 * @param messagePrefix Prefix for diagnostic message.
 * @returns Rule diagnostic object.
 */
function createContrastDiagnostic(
    ruleId: string,
    contrast: number,
    threshold: number,
    foreground: string,
    background: string,
    location: DiagnosticLocation | undefined,
    sourceType: "inline-style" | "css-rule",
    messagePrefix = "Text contrast does not meet the configured threshold."
): RuleDiagnostic {
    return {
        ruleId,
        severity: "warn",
        category: "style",
        message: `${messagePrefix} Found ${contrast}:1 but expected at least ${threshold}:1.`,
        remediation:
            "Increase foreground/background contrast, adjust color tokens, or revise typography for readability.",
        location,
        metadata: {
            contrastRatio: contrast,
            contrastThreshold: threshold,
            foregroundColor: foreground,
            backgroundColor: background,
            sourceType
        }
    };
}

/**
 * Runs contrast analysis on text elements using inline/inherited style context.
 *
 * @param document DOM document.
 * @param locate Source locator helper.
 * @param options Rule options.
 * @returns Contrast diagnostics for inline style context.
 */
function runInlineContrastChecks(
    document: Document,
    locate: (element: Element) => DiagnosticLocation,
    options?: Record<string, boolean | number | string>
): RuleDiagnostic[] {
    const diagnostics: RuleDiagnostic[] = [];
    const styleVariableMaps = Array.from(document.querySelectorAll("style")).map((styleTag) => {
        const blocks = parseCssRuleBlocks(styleTag.textContent ?? "");
        return blocks.reduce<Record<string, string>>((acc, block) => {
            return mergeVariableMaps(acc, extractVariableDeclarations(block.declarations));
        }, {});
    });
    const globalVariables = mergeVariableMaps(...styleVariableMaps);
    const textElements = Array.from(document.querySelectorAll("*")).filter((element) =>
        Boolean(element.textContent?.trim())
    );

    for (const element of textElements) {
        const snapshot = collectInlineStyleSnapshot(element);
        const localDeclarations = extractInlineStyleDeclarations(element.getAttribute("style"));
        const variableContext = mergeVariableMaps(
            globalVariables,
            snapshot.variables,
            extractVariableDeclarations(localDeclarations)
        );
        const foreground = resolveContextColor(snapshot.color ?? localDeclarations.color, variableContext);
        const background = resolveContextColor(
            snapshot.backgroundColor ?? localDeclarations["background-color"] ?? localDeclarations.background,
            variableContext
        );
        if (!foreground) {
            continue;
        }
        const fallbackBackground = parseCssColor("white");
        const computedBackground = background ?? fallbackBackground;
        if (!computedBackground) {
            continue;
        }
        const ratio = contrastRatio(foreground, computedBackground);
        const large = isLargeText(snapshot.fontSizePx, snapshot.fontWeight, options);
        const threshold = large
            ? getNumberOption(options, "minContrastLarge", DEFAULT_LARGE_TEXT_THRESHOLD)
            : getNumberOption(options, "minContrastNormal", DEFAULT_NORMAL_TEXT_THRESHOLD);
        if (ratio < threshold) {
            diagnostics.push(
                createContrastDiagnostic(
                    "color-contrast",
                    ratio,
                    threshold,
                    formatColor(foreground),
                    formatColor(computedBackground),
                    locate(element),
                    "inline-style"
                )
            );
        }
    }
    return diagnostics;
}

/**
 * Runs contrast analysis on raw CSS declaration blocks.
 *
 * @param cssText Raw CSS content.
 * @param sourcePath Optional CSS source path.
 * @param options Rule options.
 * @returns Contrast diagnostics derived from CSS rules.
 */
function runCssContrastChecks(
    cssText: string,
    sourcePath: string | undefined,
    options?: Record<string, boolean | number | string>
): RuleDiagnostic[] {
    const diagnostics: RuleDiagnostic[] = [];
    const blocks = parseCssRuleBlocks(cssText);
    const globalVars = blocks.reduce<Record<string, string>>((acc, block) => {
        return mergeVariableMaps(acc, extractVariableDeclarations(block.declarations));
    }, {});

    for (const block of blocks) {
        const vars = mergeVariableMaps(globalVars, extractVariableDeclarations(block.declarations));
        const foreground = resolveContextColor(block.declarations.color, vars);
        const background = resolveContextColor(
            block.declarations["background-color"] ?? block.declarations.background,
            vars
        );
        if (!foreground || !background) {
            continue;
        }
        const ratio = contrastRatio(foreground, background);
        const threshold = getNumberOption(options, "minContrastNormal", DEFAULT_NORMAL_TEXT_THRESHOLD);
        if (ratio < threshold) {
            diagnostics.push(
                createContrastDiagnostic(
                    "color-contrast",
                    ratio,
                    threshold,
                    formatColor(foreground),
                    formatColor(background),
                    selectorToSourceLocation(cssText, block.selector, sourcePath),
                    "css-rule",
                    `Selector "${block.selector}" has insufficient contrast.`
                )
            );
        }
    }

    return diagnostics;
}

/**
 * Applies typography readability heuristics on text-bearing elements.
 *
 * @param document DOM document.
 * @param locate Source locator helper.
 * @param options Rule options.
 * @returns Readability diagnostics.
 */
function runReadabilityChecks(
    document: Document,
    locate: (element: Element) => DiagnosticLocation,
    options?: Record<string, boolean | number | string>
): RuleDiagnostic[] {
    const minFontSizePx = getNumberOption(options, "minFontSizePx", DEFAULT_MIN_FONT_SIZE_PX);
    const minLineHeightRatio = getNumberOption(options, "minLineHeightRatio", DEFAULT_MIN_LINE_HEIGHT_RATIO);
    const diagnostics: RuleDiagnostic[] = [];

    const textElements = Array.from(document.querySelectorAll("*")).filter((element) =>
        Boolean(element.textContent?.trim())
    );

    for (const element of textElements) {
        const snapshot = collectInlineStyleSnapshot(element);
        if (snapshot.fontSizePx && snapshot.fontSizePx < minFontSizePx) {
            diagnostics.push({
                ruleId: "text-readability",
                severity: "warn",
                category: "style",
                message: `Text appears too small (${snapshot.fontSizePx}px). Minimum configured size is ${minFontSizePx}px.`,
                remediation: "Use larger base font sizes for body copy and interactive content.",
                location: locate(element),
                metadata: { sourceType: "inline-style" }
            });
        }

        if (snapshot.fontSizePx && snapshot.lineHeightPx) {
            const ratio = snapshot.lineHeightPx / snapshot.fontSizePx;
            if (ratio < minLineHeightRatio) {
                diagnostics.push({
                    ruleId: "text-readability",
                    severity: "warn",
                    category: "style",
                    message: `Line-height ratio (${Number(ratio.toFixed(2))}) is below the configured minimum (${minLineHeightRatio}).`,
                    remediation: "Increase line-height to improve readability.",
                    location: locate(element),
                    metadata: { sourceType: "inline-style" }
                });
            }
        }
    }

    return diagnostics;
}

/** Rule that reports low color contrast issues for inline and raw CSS inputs. */
export const colorContrastRule: RuleDefinition = {
    meta: {
        id: "color-contrast",
        description: "Detect low-contrast text against background colors in inline styles and CSS.",
        category: "style",
        defaultSeverity: "warn",
        tags: ["wcag-1.4.3", "style", "contrast", "heuristic"],
        wcagAlignment: "heuristic",
        wcagCriteria: ["1.4.3"],
        wcagNotes:
            "Contrast checks are WCAG-informed but computed from static style context and may miss dynamic cascade/layout effects.",
        optionsSchema: {
            minContrastNormal: {
                type: "number",
                defaultValue: DEFAULT_NORMAL_TEXT_THRESHOLD,
                description: "Minimum contrast ratio for normal-size text."
            },
            minContrastLarge: {
                type: "number",
                defaultValue: DEFAULT_LARGE_TEXT_THRESHOLD,
                description: "Minimum contrast ratio for large-size text."
            },
            largeTextPx: {
                type: "number",
                defaultValue: DEFAULT_LARGE_TEXT_PX,
                description: "Font size threshold for large text."
            },
            largeBoldTextPx: {
                type: "number",
                defaultValue: DEFAULT_LARGE_BOLD_TEXT_PX,
                description: "Bold font size threshold for large text."
            }
        }
    },
    check({ document, input, locate, options }) {
        if (input.format === "css") {
            return runCssContrastChecks(input.content, input.filepath ?? input.source?.path, options);
        }
        if (!document) {
            return [];
        }
        return runInlineContrastChecks(document, locate, options);
    }
};

/** Rule that reports basic text readability heuristics for inline style context. */
export const textReadabilityRule: RuleDefinition = {
    meta: {
        id: "text-readability",
        description: "Detect small text and compressed line-height that can reduce readability.",
        category: "style",
        defaultSeverity: "warn",
        tags: ["readability", "typography", "heuristic"],
        wcagAlignment: "heuristic",
        wcagNotes: "Readability thresholds are best-practice heuristics and are not direct WCAG pass/fail criteria.",
        optionsSchema: {
            minFontSizePx: {
                type: "number",
                defaultValue: DEFAULT_MIN_FONT_SIZE_PX,
                description: "Minimum recommended font size in pixels."
            },
            minLineHeightRatio: {
                type: "number",
                defaultValue: DEFAULT_MIN_LINE_HEIGHT_RATIO,
                description: "Minimum recommended line-height ratio."
            }
        }
    },
    check({ document, input, locate, options }) {
        if (input.format === "css") {
            return [];
        }
        if (!document) {
            return [];
        }
        return runReadabilityChecks(document, locate, options);
    }
};
