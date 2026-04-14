import { extractInlineStyleDeclarations, extractVariableDeclarations, mergeVariableMaps } from "./style-variables";

/**
 * Parses a CSS font-size value into pixels.
 *
 * @param value CSS font-size value.
 * @returns Pixel size or null when unsupported.
 */
function parseFontSizePx(value: string | undefined): number | null {
    if (!value) {
        return null;
    }
    const normalized = value.trim().toLowerCase();
    if (normalized.endsWith("px")) {
        const numeric = Number(normalized.slice(0, -2));
        return Number.isFinite(numeric) ? numeric : null;
    }
    if (normalized.endsWith("rem") || normalized.endsWith("em")) {
        const numeric = Number(normalized.slice(0, -3));
        return Number.isFinite(numeric) ? numeric * 16 : null;
    }
    const numeric = Number(normalized);
    return Number.isFinite(numeric) ? numeric : null;
}

/**
 * Parses line-height into pixels when possible.
 *
 * @param lineHeight CSS line-height value.
 * @param fontSizePx Resolved font size used for ratio-based line-height.
 * @returns Line-height in pixels, or null when unsupported.
 */
function parseLineHeight(lineHeight: string | undefined, fontSizePx: number | null): number | null {
    if (!lineHeight) {
        return null;
    }
    const normalized = lineHeight.trim().toLowerCase();
    if (normalized === "normal") {
        return fontSizePx ? fontSizePx * 1.2 : null;
    }
    if (normalized.endsWith("px")) {
        const numeric = Number(normalized.slice(0, -2));
        return Number.isFinite(numeric) ? numeric : null;
    }
    const numeric = Number(normalized);
    if (!Number.isFinite(numeric) || !fontSizePx) {
        return null;
    }
    return numeric * fontSizePx;
}

/**
 * Parses CSS font-weight into numeric weight.
 *
 * @param weight CSS font-weight value.
 * @returns Numeric font weight with defaults for normal/bold values.
 */
function parseFontWeight(weight: string | undefined): number {
    if (!weight) {
        return 400;
    }
    const normalized = weight.trim().toLowerCase();
    if (normalized === "bold") {
        return 700;
    }
    if (normalized === "normal") {
        return 400;
    }
    const numeric = Number(normalized);
    return Number.isFinite(numeric) ? numeric : 400;
}

export interface InlineStyleSnapshot {
    color?: string;
    backgroundColor?: string;
    fontSizePx?: number;
    lineHeightPx?: number;
    fontWeight?: number;
    variables: Record<string, string>;
}

/**
 * Traverses ancestor inline styles to collect inheritable style context.
 *
 * @param element Element whose style context should be computed.
 * @returns Snapshot of inherited/inline style values and resolved variables.
 */
export function collectInlineStyleSnapshot(element: Element): InlineStyleSnapshot {
    /** Tracks the current node while traversing ancestor chain for inheritance. */
    let current: Element | null = element;
    let color: string | undefined;
    let backgroundColor: string | undefined;
    let fontSizePx: number | undefined;
    let lineHeightPx: number | undefined;
    let fontWeight: number | undefined;
    /** Variable map merged from root ancestor to current element. */
    let variables: Record<string, string> = {};

    while (current) {
        const declarations = extractInlineStyleDeclarations(current.getAttribute("style"));
        variables = mergeVariableMaps(extractVariableDeclarations(declarations), variables);

        if (!color && declarations.color) {
            color = declarations.color;
        }
        if (!backgroundColor) {
            backgroundColor = declarations["background-color"] ?? declarations.background ?? backgroundColor;
        }
        if (typeof fontSizePx === "undefined") {
            const size = parseFontSizePx(declarations["font-size"]);
            if (size) {
                fontSizePx = size;
            }
        }
        if (typeof fontWeight === "undefined" && declarations["font-weight"]) {
            fontWeight = parseFontWeight(declarations["font-weight"]);
        }
        if (typeof lineHeightPx === "undefined") {
            const lineHeight = parseLineHeight(declarations["line-height"], fontSizePx ?? null);
            if (lineHeight) {
                lineHeightPx = lineHeight;
            }
        }

        current = current.parentElement;
    }

    return {
        color,
        backgroundColor,
        fontSizePx,
        lineHeightPx,
        fontWeight,
        variables
    };
}
