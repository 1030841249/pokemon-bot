import { Player, PokemonInstance } from '../core/types';
export declare class PlayerManager {
    static createPlayer(name: string, starterIndex: number): Player;
    static addPokemon(player: Player, pokemon: PokemonInstance): boolean;
    static removePokemon(player: Player, index: number): PokemonInstance | null;
    static swapPokemon(player: Player, index1: number, index2: number): boolean;
    static getFirstHealthyPokemon(player: Player): PokemonInstance | null;
    static hasHealthyPokemon(player: Player): boolean;
    static addItem(player: Player, itemId: number, quantity?: number): void;
    static removeItem(player: Player, itemId: number, quantity?: number): boolean;
    static hasItem(player: Player, itemId: number, quantity?: number): boolean;
    static getItemQuantity(player: Player, itemId: number): number;
    static addMoney(player: Player, amount: number): void;
    static removeMoney(player: Player, amount: number): boolean;
    static addBadge(player: Player): void;
    static healAllPokemon(player: Player): void;
    static gainExpToParty(player: Player, exp: number, participants: number[]): void;
    static getPartyStatus(player: Player): string[];
}
