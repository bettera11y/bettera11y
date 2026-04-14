export type AuditInputKind = "html" | "virtual-file" | "dom-snapshot" | "ast";

export interface SourceDescriptor {
  path?: string;
  language?: string;
  framework?: string;
  contentHash?: string;
}

interface AuditInputBase {
  id?: string;
  source: SourceDescriptor;
}

export interface HtmlAuditInput extends AuditInputBase {
  kind: "html";
  html: string;
}

export interface VirtualFileAuditInput extends AuditInputBase {
  kind: "virtual-file";
  content: string;
}

export interface DomSnapshotAuditInput extends AuditInputBase {
  kind: "dom-snapshot";
  html: string;
}

export interface AstAuditInput extends AuditInputBase {
  kind: "ast";
  ast: unknown;
  fallbackHtml?: string;
}

export type AuditInput =
  | HtmlAuditInput
  | VirtualFileAuditInput
  | DomSnapshotAuditInput
  | AstAuditInput;
