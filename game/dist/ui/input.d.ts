export declare class InputHandler {
    private rl;
    constructor();
    getInput(prompt: string): Promise<string>;
    getMenuChoice(max: number, prompt?: string): Promise<number>;
    getYesNo(prompt: string): Promise<boolean>;
    getText(prompt: string): Promise<string>;
    waitForKey(prompt?: string): Promise<void>;
    close(): void;
}
//# sourceMappingURL=input.d.ts.map