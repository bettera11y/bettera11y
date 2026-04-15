import { JSDOM } from "jsdom";
import type { RuntimeAdapter } from "./dom-shared";
import { createElementSelector, locateElementInSource, normalizeInputToHtml } from "./dom-shared";

/**
 * Builds a DOM document from HTML markup (Node / JSDOM).
 *
 * @param html HTML text to parse.
 * @returns DOM document.
 */
export function createDocumentFromHtml(html: string): Document {
    return new JSDOM(html).window.document;
}

/**
 * Runtime adapter that parses HTML with JSDOM (default for Node integrations).
 */
export function createNodeRuntimeAdapter(): RuntimeAdapter {
    return {
        toHtml: normalizeInputToHtml,
        createDocument: createDocumentFromHtml,
        createSelector: createElementSelector,
        locateElement: locateElementInSource
    };
}

export const defaultRuntimeAdapter: RuntimeAdapter = createNodeRuntimeAdapter();
