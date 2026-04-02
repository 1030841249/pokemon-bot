import { PokemonBase, PokemonInstance, Stats, LearnedMove } from './types';
export declare class PokemonManager {
    static getPokemonBase(id: number): PokemonBase | undefined;
    static getAllPokemon(): PokemonBase[];
    static createPokemon(baseId: number, level: number): PokemonInstance | null;
    static generateIvs(): Stats;
    static generateEmptyStats(): Stats;
    static calculateStats(base: PokemonBase, level: number, ivs: Stats, evs: Stats): Stats;
    static getLearnedMoves(base: PokemonBase, level: number): LearnedMove[];
    static getExpForLevel(level: number): number;
    static getExpForNextLevel(level: number): number;
    static gainExp(pokemon: PokemonInstance, exp: number): boolean;
    static levelUp(pokemon: PokemonInstance): boolean;
    static evolve(pokemon: PokemonInstance): boolean;
    static getPokemonName(pokemon: PokemonInstance): string;
    static getHpBar(current: number, max: number, width?: number): string;
    static isFainted(pokemon: PokemonInstance): boolean;
    static heal(pokemon: PokemonInstance, amount: number): number;
    static healFully(pokemon: PokemonInstance): void;
}
//# sourceMappingURL=pokemon.d.ts.map