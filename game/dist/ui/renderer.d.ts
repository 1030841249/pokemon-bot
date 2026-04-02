import { BattleState, PokemonInstance } from '../core/types';
export declare class Renderer {
    private static readonly WIDTH;
    private static readonly BOX_CHAR;
    static clear(): void;
    static drawBox(title: string, content: string[]): void;
    private static formatLine;
    private static getDisplayWidth;
    static drawMenu(title: string, options: string[]): void;
    static drawBattle(state: BattleState): void;
    static drawBattleMenu(pokemon: PokemonInstance): void;
    static drawMoveMenu(pokemon: PokemonInstance): void;
    static drawPokemonStatus(pokemon: PokemonInstance): void;
    static drawParty(pokemons: PokemonInstance[]): void;
    static showMessage(message: string): void;
    static showBattleLog(log: {
        turn: number;
        message: string;
    }[]): void;
    static drawTitle(): void;
    static drawStarterSelection(): void;
    static drawLocation(name: string, description: string): void;
    static drawWildBattleStart(pokemon: PokemonInstance): void;
    static drawCatchAttempt(shakes: number, success: boolean): void;
}
//# sourceMappingURL=renderer.d.ts.map