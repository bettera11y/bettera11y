import { JSDOM } from "jsdom";
import type { AuditInput } from "./contracts";
import { createRangeLocation } from "./utils";

export function createDocumentFromHtml(html: string): Document {
  return new JSDOM(html).window.document;
}

export function normalizeInputToHtml(input: AuditInput): string | null {
  if (input.kind === "html" || input.kind === "dom-snapshot") {
    return input.html;
  }

  if (input.kind === "virtual-file") {
    return input.content;
  }

  return input.fallbackHtml ?? null;
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
  const openTag = `<${tag}`;
  const offset = source.indexOf(openTag);
  if (offset === -1) {
    return { selector, sourcePath };
  }

  return createRangeLocation(
    source,
    offset,
    offset + openTag.length,
    selector,
    sourcePath,
  );
}
