import { JSDOM } from "jsdom";
import { parse } from "@babel/parser";
import type {
    CallExpression,
    JSXAttribute,
    JSXElement,
    JSXFragment,
    JSXIdentifier,
    JSXMemberExpression,
    JSXNamespacedName,
    JSXSpreadChild,
    JSXSpreadAttribute,
    JSXText,
    JSXExpressionContainer,
    ObjectExpression,
    ObjectProperty,
    Node,
    Program
} from "@babel/types";
import { marked } from "marked";
import type { AuditFormat, DiagnosticLocation, NormalizedAuditInput } from "./contracts";
import { createRangeLocation, selectorToSourceLocation } from "./utils";

/**
 * Builds a DOM document from HTML markup.
 *
 * @param html HTML text to parse.
 * @returns DOM document.
 */
export function createDocumentFromHtml(html: string): Document {
    return new JSDOM(html).window.document;
}

export interface RuntimeAdapter {
    toHtml: (input: NormalizedAuditInput, normalizers?: Partial<Record<AuditFormat, Normalizer>>) => string | null;
    createDocument: (html: string) => Document;
    createSelector: (element: Element) => string;
    locateElement: (source: string, element: Element, selector: string, sourcePath?: string) => DiagnosticLocation;
}

export type Normalizer = (content: string) => string | null;

/**
 * Escapes user content before embedding as HTML text.
 *
 * @param value Untrusted text content.
 * @returns HTML-escaped text.
 */
function escapeHtml(value: string): string {
    return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

/**
 * Converts markdown content into HTML using `marked`.
 *
 * @param content Markdown source text.
 * @returns Rendered HTML or null when conversion fails.
 */
export const markdownToHtml: Normalizer = (content) => {
    const rendered = marked.parse(content, { async: false, gfm: true });
    return typeof rendered === "string" ? rendered : null;
};

/**
 * Converts a JSX name node into tag/property text.
 *
 * @param name JSX name node.
 * @returns Text form used in serialized HTML-like output.
 */
function jsxNameToTag(name: JSXIdentifier | JSXMemberExpression | JSXNamespacedName): string {
    if (name.type === "JSXIdentifier") {
        return name.name;
    }
    if (name.type === "JSXNamespacedName") {
        return `${name.namespace.name}:${name.name.name}`;
    }
    return `${jsxNameToTag(name.object)}.${jsxNameToTag(name.property)}`;
}

/**
 * Serializes JSX attributes into HTML attribute syntax.
 *
 * @param attribute JSX attribute node.
 * @returns Serialized attribute text.
 */
function serializeJsxAttribute(attribute: JSXAttribute | JSXSpreadAttribute): string {
    if (attribute.type === "JSXSpreadAttribute") {
        return "";
    }

    const name = jsxNameToTag(attribute.name);
    const mappedName = name === "className" ? "class" : name === "htmlFor" ? "for" : name;

    if (!attribute.value) {
        return mappedName;
    }

    if (attribute.value.type === "StringLiteral") {
        return `${mappedName}="${escapeHtml(attribute.value.value)}"`;
    }

    if (attribute.value.type === "JSXExpressionContainer") {
        const expression = attribute.value.expression;
        if (expression.type === "StringLiteral" || expression.type === "NumericLiteral") {
            return `${mappedName}="${escapeHtml(String(expression.value))}"`;
        }
        if (expression.type === "BooleanLiteral") {
            return expression.value ? mappedName : "";
        }
        if (mappedName === "style" && expression.type === "ObjectExpression") {
            const styleValue = serializeStyleObjectExpression(expression);
            return styleValue ? `style="${escapeHtml(styleValue)}"` : "";
        }
    }

    return "";
}

/**
 * Serializes a JSX style object expression into inline CSS declaration text.
 *
 * @param expression JSX object literal used in style prop.
 * @returns Semicolon-separated CSS declaration string.
 */
function serializeStyleObjectExpression(expression: ObjectExpression): string {
    const declarations: string[] = [];
    for (const property of expression.properties) {
        if (property.type !== "ObjectProperty") {
            continue;
        }
        const key = extractObjectPropertyKey(property);
        if (!key) {
            continue;
        }
        const cssProperty = key.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
        const value = property.value;
        if (value.type === "StringLiteral" || value.type === "NumericLiteral") {
            declarations.push(`${cssProperty}:${String(value.value)}`);
        }
    }
    return declarations.join(";");
}

/**
 * Extracts an object property key for style serialization.
 *
 * @param property Object property node.
 * @returns Key name or null when key type is unsupported.
 */
function extractObjectPropertyKey(property: ObjectProperty): string | null {
    if (property.key.type === "Identifier") {
        return property.key.name;
    }
    if (property.key.type === "StringLiteral") {
        return property.key.value;
    }
    return null;
}

type JsxChildNode = JSXText | JSXExpressionContainer | JSXElement | JSXFragment | JSXSpreadChild;

/**
 * Serializes a JSX child node into HTML-like text.
 *
 * @param child JSX child node.
 * @returns Serialized content fragment.
 */
function serializeJsxChild(child: JsxChildNode): string {
    if (child.type === "JSXText") {
        return escapeHtml(child.value);
    }

    if (child.type === "JSXExpressionContainer") {
        const expression = child.expression;
        if (expression.type === "StringLiteral" || expression.type === "NumericLiteral") {
            return escapeHtml(String(expression.value));
        }
        return "";
    }

    if (child.type === "JSXElement") {
        return serializeJsxElement(child);
    }

    if (child.type === "JSXFragment") {
        return child.children.map(serializeJsxChild).join("");
    }

    return "";
}

/**
 * Serializes a JSX element subtree to HTML-like output.
 *
 * @param element JSX element node.
 * @returns Serialized HTML-like text.
 */
function serializeJsxElement(element: JSXElement): string {
    const tag = jsxNameToTag(element.openingElement.name);
    const attributes = element.openingElement.attributes.map(serializeJsxAttribute).filter(Boolean).join(" ");
    const attributePrefix = attributes.length > 0 ? ` ${attributes}` : "";
    const childrenHtml = element.children.map(serializeJsxChild).join("");
    const isComponentLike = /^[A-Z]/.test(tag);

    if (isComponentLike) {
        return childrenHtml;
    }

    if (element.openingElement.selfClosing) {
        return `<${tag}${attributePrefix} />`;
    }

    return `<${tag}${attributePrefix}>${childrenHtml}</${tag}>`;
}

/**
 * Strips redundant parentheses from an expression (e.g. `return (<div />)`).
 *
 * @param node AST expression or statement node.
 * @returns Inner expression after unwrapping.
 */
function unwrapParentheses(node: Node | null | undefined): Node | null | undefined {
    if (!node) {
        return node;
    }
    let current: Node = node;
    while (current.type === "ParenthesizedExpression") {
        current = current.expression;
    }
    return current;
}

/**
 * Pushes JSX passed to `.render(...)` (React 18 root API) into the collector.
 *
 * @param call Parsed call expression.
 * @param tryPushNode Nested visitor for JSX roots.
 */
function tryPushRenderCallArgument(call: CallExpression, tryPushNode: (node: Node | null | undefined) => void): void {
    const callee = call.callee;
    if (callee.type !== "MemberExpression" || callee.computed) {
        return;
    }
    const prop = callee.property;
    if (prop.type !== "Identifier" || prop.name !== "render") {
        return;
    }
    const first = call.arguments[0];
    if (!first || first.type === "SpreadElement") {
        return;
    }
    const inner = unwrapParentheses(first);
    tryPushNode(inner);
}

/**
 * Collects JSX output candidates from top-level program statements.
 *
 * @param program Parsed Babel program.
 * @returns Joined serialized HTML-like output.
 */
function collectProgramJsx(program: Program): string {
    /** Accumulates serialized JSX fragments discovered in program traversal. */
    const pieces: string[] = [];

    /**
     * Pushes JSX-like nodes into output when they can be serialized.
     *
     * @param node Candidate AST node.
     */
    const tryPushNode = (node: Node | null | undefined): void => {
        if (!node) {
            return;
        }

        if (node.type === "JSXElement") {
            pieces.push(serializeJsxElement(node));
            return;
        }

        if (node.type === "JSXFragment") {
            pieces.push(node.children.map(serializeJsxChild).join(""));
            return;
        }

        if (node.type === "ExpressionStatement") {
            const expr = unwrapParentheses(node.expression);
            if (!expr) {
                return;
            }
            if (expr.type === "JSXElement" || expr.type === "JSXFragment") {
                tryPushNode(expr);
                return;
            }
            if (expr.type === "CallExpression") {
                tryPushRenderCallArgument(expr, tryPushNode);
            }
            return;
        }

        if (node.type === "ReturnStatement") {
            const argument = unwrapParentheses(node.argument);
            if (argument?.type === "JSXElement" || argument?.type === "JSXFragment") {
                tryPushNode(argument);
            }
        }
    };

    for (const statement of program.body) {
        tryPushNode(statement);
        if (statement.type === "ExportDefaultDeclaration") {
            const decl = statement.declaration;
            if (decl.type === "FunctionDeclaration" && decl.body?.body) {
                for (const fnStatement of decl.body.body) {
                    tryPushNode(fnStatement);
                }
            } else if (decl.type === "ArrowFunctionExpression") {
                if (decl.body.type === "BlockStatement") {
                    for (const fnStatement of decl.body.body) {
                        tryPushNode(fnStatement);
                    }
                } else {
                    const body = unwrapParentheses(decl.body);
                    if (body?.type === "JSXElement" || body?.type === "JSXFragment") {
                        tryPushNode(body);
                    }
                }
            }
        }
        if (statement.type === "FunctionDeclaration" && statement.id?.name && statement.body?.body) {
            for (const fnStatement of statement.body.body) {
                tryPushNode(fnStatement);
            }
        }
    }

    return pieces.join("\n");
}

/**
 * Parses JSX/TSX and converts discovered JSX structures to HTML-like text.
 *
 * @param content Source code.
 * @param tsx Whether TypeScript syntax support is enabled.
 * @returns Serialized HTML-like output, fallback text wrapper, or null on parse failure.
 */
function jsxLikeToHtml(content: string, tsx: boolean): string | null {
    try {
        const ast = parse(content, {
            sourceType: "module",
            plugins: tsx ? ["jsx", "typescript"] : ["jsx"]
        });
        const html = collectProgramJsx(ast.program);
        return html.length > 0 ? html : `<pre>${escapeHtml(content)}</pre>`;
    } catch {
        return null;
    }
}

/**
 * Converts JSX source to HTML-like text.
 *
 * @param content JSX source code.
 * @returns HTML-like representation or null on parse failure.
 */
export const jsxToHtml: Normalizer = (content) => {
    return jsxLikeToHtml(content, false);
};

/**
 * Converts TSX source to HTML-like text.
 *
 * @param content TSX source code.
 * @returns HTML-like representation or null on parse failure.
 */
export const tsxToHtml: Normalizer = (content) => {
    return jsxLikeToHtml(content, true);
};

/** Wraps plain text in a preformatted block for DOM-based rule analysis. */
export const textToHtml: Normalizer = (content) => `<pre>${escapeHtml(content)}</pre>`;
/** Wraps raw CSS content in a style element to preserve embedded styles for analysis. */
export const cssToHtml: Normalizer = (content) => `<style>${content}</style>`;

export const builtinNormalizers: Record<AuditFormat, Normalizer> = {
    html: (content) => content,
    markdown: markdownToHtml,
    jsx: jsxToHtml,
    tsx: tsxToHtml,
    text: textToHtml,
    css: cssToHtml
};

/**
 * Normalizes canonical audit input to analyzable HTML via format normalizers.
 *
 * @param input Canonical normalized input.
 * @param normalizers Optional normalizer overrides by format.
 * @returns HTML output or null when no normalizer can handle the format.
 */
export function normalizeInputToHtml(
    input: NormalizedAuditInput,
    normalizers: Partial<Record<AuditFormat, Normalizer>> = {}
): string | null {
    const normalizer = normalizers[input.format] ?? builtinNormalizers[input.format];
    if (!normalizer) {
        return null;
    }
    return normalizer(input.content);
}

/**
 * Builds a deterministic selector for the provided element.
 *
 * @param element DOM element.
 * @returns CSS-like selector used in diagnostics.
 */
export function createElementSelector(element: Element): string {
    const id = element.getAttribute("id");
    if (id) {
        return `#${id}`;
    }

    const parts: string[] = [];
    let current: Element | null = element;

    while (current && current.tagName.toLowerCase() !== "html") {
        const tag = current.tagName.toLowerCase();
        const parent: Element | null = current.parentElement;
        if (!parent) {
            parts.unshift(tag);
            break;
        }

        const siblings = Array.from(parent.children).filter((child: Element) => child.tagName === current?.tagName);
        const index = siblings.indexOf(current) + 1;
        parts.unshift(`${tag}:nth-of-type(${index})`);
        current = parent;
    }

    return parts.join(" > ");
}

/**
 * Locates element tag offsets in source to generate a source location range.
 *
 * @param source Original source text.
 * @param element Element being located.
 * @param selector Element selector.
 * @param sourcePath Optional source path metadata.
 * @returns Best-effort source location.
 */
export function locateElementInSource(source: string, element: Element, selector: string, sourcePath?: string) {
    const tag = element.tagName.toLowerCase();
    const pattern = new RegExp(`<${tag}\\b`, "g");
    const allMatches = Array.from(source.matchAll(pattern));
    if (allMatches.length === 0) {
        return selectorToSourceLocation(source, selector, sourcePath);
    }

    const nthMatch = selector.match(/:nth-of-type\((\d+)\)$/);
    const index = nthMatch ? Number(nthMatch[1]) - 1 : 0;
    const chosen = allMatches[Math.max(0, Math.min(index, allMatches.length - 1))];
    const offset = chosen?.index ?? source.indexOf(`<${tag}`);
    const openTag = `<${tag}`;

    return createRangeLocation(source, offset, offset + openTag.length, selector, sourcePath);
}

export const defaultRuntimeAdapter: RuntimeAdapter = {
    toHtml: normalizeInputToHtml,
    createDocument: createDocumentFromHtml,
    createSelector: createElementSelector,
    locateElement: locateElementInSource
};
