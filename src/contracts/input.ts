export type AuditFormat = "html" | "markdown" | "jsx" | "tsx" | "text" | "css";
export type AuditSourceKind = "file" | "inline" | "virtual";

export interface SourceDescriptor {
    kind?: AuditSourceKind;
    path?: string;
    label?: string;
    language?: string;
    framework?: string;
    contentHash?: string;
}

export interface AuditInputObject {
    id?: string;
    content: string;
    format?: AuditFormat;
    filepath?: string;
    source?: SourceDescriptor;
}

export type AuditInput = string | AuditInputObject;

export interface NormalizedAuditInput {
    id?: string;
    content: string;
    format: AuditFormat;
    filepath?: string;
    source?: SourceDescriptor;
}

export interface AuditInputNormalizationOptions {
    id?: string;
    format?: AuditFormat;
    filepath?: string;
    source?: SourceDescriptor;
}

const extensionToFormat = new Map<string, AuditFormat>([
    [".html", "html"],
    [".htm", "html"],
    [".md", "markdown"],
    [".markdown", "markdown"],
    [".mdx", "markdown"],
    [".jsx", "jsx"],
    [".tsx", "tsx"],
    [".txt", "text"],
    [".css", "css"],
    [".scss", "css"],
    [".sass", "css"]
]);

export function inferFormatFromFilepath(filepath?: string): AuditFormat | undefined {
    if (!filepath) {
        return undefined;
    }
    const lastDot = filepath.lastIndexOf(".");
    if (lastDot < 0) {
        return undefined;
    }
    const extension = filepath.slice(lastDot).toLowerCase();
    return extensionToFormat.get(extension);
}

export function normalizeAuditInput(
    input: AuditInput,
    options: AuditInputNormalizationOptions = {}
): NormalizedAuditInput {
    if (typeof input === "string") {
        const inferredFormat = inferFormatFromFilepath(options.filepath ?? options.source?.path);
        return {
            id: options.id,
            content: input,
            filepath: options.filepath ?? options.source?.path,
            source: options.source,
            format: options.format ?? inferredFormat ?? "html"
        };
    }

    const inferredFormat = inferFormatFromFilepath(input.filepath ?? input.source?.path);
    return {
        id: input.id,
        content: input.content,
        filepath: input.filepath ?? input.source?.path,
        source: input.source,
        format: input.format ?? inferredFormat ?? "html"
    };
}

export function validateAuditInput(input: NormalizedAuditInput): string[] {
    const errors: string[] = [];

    if (!input || typeof input !== "object") {
        return ["Audit input must be an object."];
    }

    if (typeof input.content !== "string" || input.content.length === 0) {
        errors.push("Audit input must include a non-empty content string.");
    }

    if (!["html", "markdown", "jsx", "tsx", "text", "css"].includes(input.format)) {
        errors.push("Audit input format must be one of: html, markdown, jsx, tsx, text, css.");
    }

    if (typeof input.source !== "undefined") {
        if (!input.source || typeof input.source !== "object") {
            errors.push("Audit input source must be an object when provided.");
        } else if (
            typeof input.source.kind !== "undefined" &&
            !["file", "inline", "virtual"].includes(input.source.kind)
        ) {
            errors.push("Audit input source.kind must be one of: file, inline, virtual.");
        }
    }

    if (typeof input.filepath !== "undefined" && input.filepath.length === 0) {
        errors.push("Audit input filepath must not be empty when provided.");
    }

    return errors;
}
