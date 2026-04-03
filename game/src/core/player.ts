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

  static addPokemon(player: Player, pokemon: PokemonInstance): { success: boolean; toPC: boolean; message: string } {
    if (player.party.length < 6) {
      player.party.push(pokemon);
      return { success: true, toPC: false, message: `已加入队伍！(${player.party.length}/6)` };
    }
    
    for (let i = 0; i < player.pc.length; i++) {
      if (player.pc[i].length < 30) {
        player.pc[i].push(pokemon);
        const boxNum = i + 1;
        const count = player.pc[i].length;
        return { 
          success: true, 
          toPC: true, 
          message: `队伍已满！已存入电脑盒子${boxNum} (${count}/30)` 
        };
      }
    }
    
    return { success: false, toPC: false, message: '电脑也满了！无法存储更多宝可梦。' };
  }

  static getPcCount(player: Player): number {
    let total = 0;
    for (const box of player.pc) {
      total += box.length;
    }
    return total;
  }

  static viewPC(player: Player): string[] {
    const lines: string[] = [];
    lines.push('═══ 宝可梦电脑 ═══');
    
    let hasPokemon = false;
    for (let i = 0; i < player.pc.length; i++) {
      const box = player.pc[i];
      if (box.length > 0) {
        hasPokemon = true;
        lines.push(`\n[盒子 ${i + 1}] (${box.length}/30)`);
        for (let j = 0; j < box.length; j++) {
          const p = box[j];
          const name = PokemonManager.getPokemonName(p);
          const status = PokemonManager.isFainted(p) ? '(濒死)' : '';
          lines.push(`  ${j + 1}. ${name} Lv.${p.level} HP:${p.currentHp}/${p.stats.hp}${status}`);
        }
      }
    }
    
    if (!hasPokemon) {
      lines.push('\n  （空无一物）');
    }
    
    lines.push(`\n总计: ${PlayerManager.getPcCount(player)} 只 | 队伍: ${player.party.length}/6`);
    return lines;
  }

  static withdrawFromPC(player: Player, boxIndex: number, pokemonIndex: number): { success: boolean; pokemon?: PokemonInstance; message: string } {
    if (boxIndex < 0 || boxIndex >= player.pc.length) {
      return { success: false, message: '无效的盒子编号' };
    }
    
    const box = player.pc[boxIndex];
    if (pokemonIndex < 0 || pokemonIndex >= box.length) {
      return { success: false, message: '无效的宝可梦编号' };
    }
    
    if (player.party.length >= 6) {
      return { success: false, message: '队伍已满！请先存放一只宝可梦' };
    }
    
    const pokemon = box.splice(pokemonIndex, 1)[0];
    player.party.push(pokemon);
    
    return { 
      success: true, 
      pokemon,
      message: `${PokemonManager.getPokemonName(pokemon)} 已从盒子${boxIndex + 1}取出到队伍！` 
    };
  }

  static depositToPC(player: Player, partyIndex: number): { success: boolean; message: string } {
    if (partyIndex < 0 || partyIndex >= player.party.length) {
      return { success: false, message: '无效的队伍位置' };
    }
    
    if (player.party.length <= 1) {
      return { success: false, message: '至少保留一只宝可梦在队伍中！' };
    }
    
    const pokemon = player.party.splice(partyIndex, 1)[0];
    
    for (let i = 0; i < player.pc.length; i++) {
      if (player.pc[i].length < 30) {
        player.pc[i].push(pokemon);
        return { 
          success: true, 
          message: `${PokemonManager.getPokemonName(pokemon)} 已存入盒子${i + 1}！` 
        };
      }
    }
    
    player.party.splice(partyIndex, 0, pokemon);
    return { success: false, message: '电脑已满！' };
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
        PokemonManager.gainExp(pokemon, exp);
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
