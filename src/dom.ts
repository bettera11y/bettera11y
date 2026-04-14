import { JSDOM } from "jsdom";
import { parse } from "@babel/parser";
import type {
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
  Node,
  Program,
} from "@babel/types";
import { marked } from "marked";
import type {
  AuditFormat,
  DiagnosticLocation,
  NormalizedAuditInput,
} from "./contracts";
import { createRangeLocation, selectorToSourceLocation } from "./utils";

export function createDocumentFromHtml(html: string): Document {
  return new JSDOM(html).window.document;
}

export interface RuntimeAdapter {
  toHtml: (
    input: NormalizedAuditInput,
    normalizers?: Partial<Record<AuditFormat, Normalizer>>,
  ) => string | null;
  createDocument: (html: string) => Document;
  createSelector: (element: Element) => string;
  locateElement: (
    source: string,
    element: Element,
    selector: string,
    sourcePath?: string,
  ) => DiagnosticLocation;
}

export type Normalizer = (content: string) => string | null;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export const markdownToHtml: Normalizer = (content) => {
  const rendered = marked.parse(content, { async: false, gfm: true });
  return typeof rendered === "string" ? rendered : null;
};

function jsxNameToTag(
  name: JSXIdentifier | JSXMemberExpression | JSXNamespacedName,
): string {
  if (name.type === "JSXIdentifier") {
    return name.name;
  }
  if (name.type === "JSXNamespacedName") {
    return `${name.namespace.name}:${name.name.name}`;
  }
  return `${jsxNameToTag(name.object)}.${jsxNameToTag(name.property)}`;
}

function serializeJsxAttribute(attribute: JSXAttribute | JSXSpreadAttribute): string {
  if (attribute.type === "JSXSpreadAttribute") {
    return "";
  }

  const name = jsxNameToTag(attribute.name);
  const mappedName =
    name === "className" ? "class" : name === "htmlFor" ? "for" : name;

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
  }

  return "";
}

type JsxChildNode =
  | JSXText
  | JSXExpressionContainer
  | JSXElement
  | JSXFragment
  | JSXSpreadChild;

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

function serializeJsxElement(element: JSXElement): string {
  const tag = jsxNameToTag(element.openingElement.name);
  const attributes = element.openingElement.attributes
    .map(serializeJsxAttribute)
    .filter(Boolean)
    .join(" ");
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

function collectProgramJsx(program: Program): string {
  const pieces: string[] = [];

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

    if (
      node.type === "ExpressionStatement" &&
      (node.expression.type === "JSXElement" || node.expression.type === "JSXFragment")
    ) {
      tryPushNode(node.expression);
      return;
    }

    if (
      node.type === "ReturnStatement" &&
      (node.argument?.type === "JSXElement" || node.argument?.type === "JSXFragment")
    ) {
      tryPushNode(node.argument);
    }
  };

  for (const statement of program.body) {
    tryPushNode(statement);
    if (
      statement.type === "ExportDefaultDeclaration" &&
      statement.declaration.type === "FunctionDeclaration"
    ) {
      for (const fnStatement of statement.declaration.body.body) {
        tryPushNode(fnStatement);
      }
    }
    if (
      statement.type === "FunctionDeclaration" &&
      statement.id?.name &&
      statement.body?.body
    ) {
      for (const fnStatement of statement.body.body) {
        tryPushNode(fnStatement);
      }
    }
  }

  return pieces.join("\n");
}

function jsxLikeToHtml(content: string, tsx: boolean): string | null {
  try {
    const ast = parse(content, {
      sourceType: "module",
      plugins: tsx ? ["jsx", "typescript"] : ["jsx"],
    });
    const html = collectProgramJsx(ast.program);
    return html.length > 0 ? html : `<pre>${escapeHtml(content)}</pre>`;
  } catch {
    return null;
  }
}

export const jsxToHtml: Normalizer = (content) => {
  return jsxLikeToHtml(content, false);
};

export const tsxToHtml: Normalizer = (content) => {
  return jsxLikeToHtml(content, true);
};

export const textToHtml: Normalizer = (content) => `<pre>${escapeHtml(content)}</pre>`;

export const builtinNormalizers: Record<AuditFormat, Normalizer> = {
  html: (content) => content,
  markdown: markdownToHtml,
  jsx: jsxToHtml,
  tsx: tsxToHtml,
  text: textToHtml,
};

export function normalizeInputToHtml(
  input: NormalizedAuditInput,
  normalizers: Partial<Record<AuditFormat, Normalizer>> = {},
): string | null {
  const normalizer = normalizers[input.format] ?? builtinNormalizers[input.format];
  if (!normalizer) {
    return null;
  }
  return normalizer(input.content);
}

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

    const siblings = Array.from(parent.children).filter(
      (child: Element) => child.tagName === current?.tagName,
    );
    const index = siblings.indexOf(current) + 1;
    parts.unshift(`${tag}:nth-of-type(${index})`);
    current = parent;
  }

  return parts.join(" > ");
}

export function locateElementInSource(
  source: string,
  element: Element,
  selector: string,
  sourcePath?: string,
) {
  const tag = element.tagName.toLowerCase();
  const pattern = new RegExp(`<${tag}\\b`, "g");
  const allMatches = Array.from(source.matchAll(pattern));
  if (allMatches.length === 0) {
    return selectorToSourceLocation(source, selector, sourcePath);
  }

  const nthMatch = selector.match(/:nth-of-type\((\d+)\)$/);
  const index = nthMatch ? Number(nthMatch[1]) - 1 : 0;
  const chosen =
    allMatches[Math.max(0, Math.min(index, allMatches.length - 1))];
  const offset = chosen?.index ?? source.indexOf(`<${tag}`);
  const openTag = `<${tag}`;

  return createRangeLocation(
    source,
    offset,
    offset + openTag.length,
    selector,
    sourcePath,
  );
}

export const defaultRuntimeAdapter: RuntimeAdapter = {
  toHtml: normalizeInputToHtml,
  createDocument: createDocumentFromHtml,
  createSelector: createElementSelector,
  locateElement: locateElementInSource,
};
