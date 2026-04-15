import type { RuntimeAdapter } from "./dom-shared";
import { createElementSelector, locateElementInSource, normalizeInputToHtml } from "./dom-shared";

/**
 * Builds a DOM document from HTML markup using the browser `DOMParser`.
 *
 * @param html HTML text to parse.
 * @returns DOM document.
 */
export function createDocumentFromHtmlBrowser(html: string): Document {
    return new DOMParser().parseFromString(html, "text/html");
}

/**
 * Runtime adapter for in-browser audits (no JSDOM dependency).
 */
export function createBrowserRuntimeAdapter(): RuntimeAdapter {
    return {
        toHtml: normalizeInputToHtml,
        createDocument: createDocumentFromHtmlBrowser,
        createSelector: createElementSelector,
        locateElement: locateElementInSource
    };
}
