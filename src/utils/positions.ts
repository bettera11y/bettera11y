import type { DiagnosticLocation, Position, Severity } from "../contracts";
import type { AuditDiagnostic } from "../contracts";

export interface AdapterDiagnostic {
  id: string;
  ruleId: string;
  message: string;
  level: string | number;
  location?: DiagnosticLocation;
}

export function positionFromOffset(source: string, offset: number): Position {
  const safeOffset = Math.max(0, Math.min(offset, source.length));
  let line = 1;
  let column = 1;

  for (let i = 0; i < safeOffset; i += 1) {
    if (source[i] === "\n") {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }

  return { line, column, offset: safeOffset };
}

export function createRangeLocation(
  source: string,
  startOffset: number,
  endOffset: number,
  selector?: string,
  sourcePath?: string,
): DiagnosticLocation {
  return {
    sourcePath,
    selector,
    start: positionFromOffset(source, startOffset),
    end: positionFromOffset(source, endOffset),
  };
}

export function selectorToSourceLocation(
  source: string,
  selector: string | undefined,
  sourcePath?: string,
): DiagnosticLocation {
  if (!selector) {
    return { sourcePath };
  }

  const tag = selector.split(/[.#:\s>]/).find(Boolean);
  if (!tag) {
    return { sourcePath, selector };
  }

  const openTag = `<${tag}`;
  const startOffset = source.indexOf(openTag);
  if (startOffset === -1) {
    return { sourcePath, selector };
  }

  const endOffset = startOffset + openTag.length;
  return createRangeLocation(
    source,
    startOffset,
    endOffset,
    selector,
    sourcePath,
  );
}

export function translateSeverity(
  severity: Severity,
  target: "eslint" | "vite" | "terminal",
): number | string {
  if (target === "eslint") {
    if (severity === "error") return 2;
    if (severity === "warn") return 1;
    return 0;
  }

  if (target === "vite") {
    if (severity === "error") return "error";
    if (severity === "warn") return "warning";
    return "info";
  }

  return severity.toUpperCase();
}

export function toAdapterDiagnostic(
  diagnostic: AuditDiagnostic,
  target: "eslint" | "vite" | "terminal",
): AdapterDiagnostic {
  return {
    id: diagnostic.id,
    ruleId: diagnostic.ruleId,
    message: diagnostic.message,
    level: translateSeverity(diagnostic.severity, target),
    location: diagnostic.location,
  };
}
