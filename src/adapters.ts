import type { AuditInput, AuditResult, DiagnosticsSink, InputProvider } from "./contracts";

export interface ToolIntegrationAdapter {
    start: () => Promise<void> | void;
    stop: () => Promise<void> | void;
    onInput: (input: AuditInput) => Promise<void> | void;
    onDiagnostics: (result: AuditResult) => Promise<void> | void;
}

export interface MockAdapterOptions {
    emit: (input: AuditInput) => Promise<AuditResult> | AuditResult;
    inputProvider?: InputProvider;
    diagnosticsSink?: DiagnosticsSink;
}

export class MockAdapter implements ToolIntegrationAdapter {
    private readonly emit: MockAdapterOptions["emit"];
    private readonly options: MockAdapterOptions;

    public readonly receivedInputs: AuditInput[] = [];
    public readonly diagnostics: AuditResult[] = [];
    public started = false;

    constructor(options: MockAdapterOptions) {
        this.options = options;
        this.emit = options.emit;
    }

    start(): void {
        this.started = true;
    }

    stop(): void {
        this.started = false;
    }

    async onInput(input: AuditInput): Promise<void> {
        this.receivedInputs.push(input);
        const result = await this.emit(input);
        await this.onDiagnostics(result);
    }

    async onDiagnostics(result: AuditResult): Promise<void> {
        this.diagnostics.push(result);
        await this.options.diagnosticsSink?.onResult(result);
    }

    async pump(): Promise<number> {
        if (!this.options.inputProvider) {
            return 0;
        }
        let processed = 0;
        while (this.started) {
            const input = await this.options.inputProvider.nextInput();
            if (!input) {
                break;
            }
            await this.onInput(input);
            processed += 1;
        }
        return processed;
    }
}
