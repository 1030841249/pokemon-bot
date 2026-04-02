interface BotConfig {
    qq: number;
    password: string;
    admins?: number[];
    groups?: number[];
    triggerPrefix?: string;
}
declare class PokemonBot {
    private client;
    private sessionManager;
    private config;
    private isReady;
    private rl;
    constructor(config: BotConfig);
    private setupEventHandlers;
    private handleMessage;
    private processGameInput;
    private getHelpMessage;
    private getStatusMessage;
    start(): Promise<void>;
    stop(): Promise<void>;
}
export { PokemonBot };
export type { BotConfig };
