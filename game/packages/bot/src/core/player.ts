import { Player, PokemonInstance, InventoryItem } from '../core/types';
import { PokemonManager } from '../core/pokemon';

const STARTER_POKEMON = [1, 4, 7];

export class PlayerManager {
  static createPlayer(name: string, starterIndex: number): Player {
    const starterId = STARTER_POKEMON[starterIndex] || STARTER_POKEMON[0];
    const starter = PokemonManager.createPokemon(starterId, 5);
    
    return {
      name,
      party: starter ? [starter] : [],
      pc: Array(30).fill(null).map(() => []),
      inventory: [
        { itemId: 1, quantity: 5 },
        { itemId: 10, quantity: 3 }
      ],
      badges: 0,
      money: 3000,
      currentLocation: 'pallet-town',
      playTime: 0
    };
  }

  static addPokemon(player: Player, pokemon: PokemonInstance): boolean {
    if (player.party.length < 6) {
      player.party.push(pokemon);
      return true;
    }
    
    for (let i = 0; i < player.pc.length; i++) {
      if (player.pc[i].length < 30) {
        player.pc[i].push(pokemon);
        return true;
      }
    }
    
    return false;
  }

  static removePokemon(player: Player, index: number): PokemonInstance | null {
    if (index >= 0 && index < player.party.length) {
      return player.party.splice(index, 1)[0];
    }
    return null;
  }

  static swapPokemon(player: Player, index1: number, index2: number): boolean {
    if (index1 >= 0 && index1 < player.party.length && 
        index2 >= 0 && index2 < player.party.length) {
      const temp = player.party[index1];
      player.party[index1] = player.party[index2];
      player.party[index2] = temp;
      return true;
    }
    return false;
  }

  static getFirstHealthyPokemon(player: Player): PokemonInstance | null {
    for (const pokemon of player.party) {
      if (!PokemonManager.isFainted(pokemon)) {
        return pokemon;
      }
    }
    return null;
  }

  static hasHealthyPokemon(player: Player): boolean {
    return player.party.some(p => !PokemonManager.isFainted(p));
  }

  static addItem(player: Player, itemId: number, quantity: number = 1): void {
    const existing = player.inventory.find(i => i.itemId === itemId);
    if (existing) {
      existing.quantity += quantity;
    } else {
      player.inventory.push({ itemId, quantity });
    }
  }

  static removeItem(player: Player, itemId: number, quantity: number = 1): boolean {
    const existing = player.inventory.find(i => i.itemId === itemId);
    if (!existing || existing.quantity < quantity) {
      return false;
    }
    
    existing.quantity -= quantity;
    if (existing.quantity <= 0) {
      player.inventory = player.inventory.filter(i => i.itemId !== itemId);
    }
    return true;
  }

  static hasItem(player: Player, itemId: number, quantity: number = 1): boolean {
    const existing = player.inventory.find(i => i.itemId === itemId);
    return existing !== undefined && existing.quantity >= quantity;
  }

  static getItemQuantity(player: Player, itemId: number): number {
    const existing = player.inventory.find(i => i.itemId === itemId);
    return existing?.quantity || 0;
  }

  static addMoney(player: Player, amount: number): void {
    player.money += amount;
  }

  static removeMoney(player: Player, amount: number): boolean {
    if (player.money >= amount) {
      player.money -= amount;
      return true;
    }
    return false;
  }

  static addBadge(player: Player): void {
    player.badges++;
  }

  static healAllPokemon(player: Player): void {
    for (const pokemon of player.party) {
      PokemonManager.healFully(pokemon);
    }
  }

  static gainExpToParty(player: Player, exp: number, participants: number[]): void {
    for (const index of participants) {
      if (index >= 0 && index < player.party.length) {
        const pokemon = player.party[index];
        const canEvolve = PokemonManager.gainExp(pokemon, exp);
        
        if (canEvolve) {
          const base = PokemonManager.getPokemonBase(pokemon.baseId);
          if (base?.evolution) {
            PokemonManager.evolve(pokemon);
          }
        }
      }
    }
  }

  static getPartyStatus(player: Player): string[] {
    return player.party.map((pokemon, index) => {
      const name = PokemonManager.getPokemonName(pokemon);
      const hp = `${pokemon.currentHp}/${pokemon.stats.hp}`;
      const status = PokemonManager.isFainted(pokemon) ? ' [濒死]' : '';
      return `${index + 1}. ${name} Lv.${pokemon.level} HP:${hp}${status}`;
    });
  }
}
