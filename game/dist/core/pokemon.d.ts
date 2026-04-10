import { PokemonInstance, Stats, LearnedMove, Nature } from './types';
export declare const NATURES: Record<string, Nature>;
export declare class PokemonManager {
    static getPokemonBase(id: number): any;
    static getAllPokemon(): any[];
    static getPokemonByTier(tier: number): any[];
    static getRandomNature(): string;
    static getNatureInfo(natureKey: string): Nature;
    static createPokemon(baseId: number, level: number, options?: {
        forceNature?: string;
    }): PokemonInstance | null;
    static generateIvs(): Stats;
    static generateEmptyStats(): Stats;
    static calculateStats(base: any, level: number, ivs: Stats, evs: Stats): Stats;
    static applyNatureToDisplay(stats: Stats, nature: string): Stats;
    static getLearnedMoves(base: any, level: number): LearnedMove[];
    static getNewMovesForLevel(baseId: number, level: number): number[];
    static tryLearnMove(pokemon: PokemonInstance, moveId: number): {
        learned: boolean;
        replaced: boolean;
        message: string;
    };
    static getExpForLevel(level: number): number;
    static getExpForNextLevel(currentLevel: number): number;
    static getExpToNextLevel(pokemon: PokemonInstance): {
        current: number;
        needed: number;
        progress: number;
    };
    static gainExp(pokemon: PokemonInstance, exp: number): {
        leveledUp: boolean;
        evolved: boolean;
        messages: string[];
    };
    static checkEvolution(pokemon: PokemonInstance): {
        evolved: boolean;
        messages: string[];
    };
    static canEvolve(pokemon: PokemonInstance): {
        can: boolean;
        method?: string;
        requirement?: string;
    };
    static getEvolutionChain(baseId: number): string[];
    static getPokemonName(pokemon: PokemonInstance): string;
    static getHpBar(current: number, max: number, width?: number): string;
    static isFainted(pokemon: PokemonInstance): boolean;
    static heal(pokemon: PokemonInstance, amount: number): number;
    static healFully(pokemon: PokemonInstance): void;
    static getRandomWildPokemon(minTier: number, maxTier: number): PokemonInstance | null;
    static isLegendary(id: number): boolean;
    static getRareEncounter(locationMinLevel: number): PokemonInstance | null;
    static getIVRating(ivs: Stats): string;
    static getStatusEffectiveness(status: string): {
        damagePerTurn: number;
        canAttack: boolean;
    };
    static addStatusEffect(pokemon: PokemonInstance, effect: string): boolean;
}
//# sourceMappingURL=pokemon.d.ts.map