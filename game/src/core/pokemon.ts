import { PokemonBase, PokemonInstance, Stats, LearnedMove, Nature, Ability } from './types';
import pokemonData from '../data/pokemon_full.json';
import movesData from '../data/moves.json';

const pokemonList = pokemonData as any[];

export const NATURES: Record<string, Nature> = {
  'hardy': { name: '固执', plus: 'attack', minus: 'spAttack', mod: 1.1 },
  'lonely': { name: '寂寞', plus: 'attack', minus: 'defense', mod: 1.1 },
  'brave': { name: '勇敢', plus: 'attack', minus: 'speed', mod: 1.1 },
  'adamant': { name: '顽皮', plus: 'attack', minus: 'spDefense', mod: 1.1 },
  'bold': { name: '大胆', plus: 'defense', minus: 'attack', mod: 1.1 },
  'impish': { name: '淘气', plus: 'defense', minus: 'spDefense', mod: 1.1 },
  'relaxed': { name: '悠闲', plus: 'defense', minus: 'speed', mod: 1.1 },
  'modest': { name: '马虎', plus: 'spAttack', minus: 'attack', mod: 1.1 },
  'mild': { name: '温和', plus: 'spAttack', minus: 'defense', mod: 1.1 },
  'quiet': { name: '冷静', plus: 'spAttack', minus: 'speed', mod: 1.1 },
  'rash': { name: '急躁', plus: 'spAttack', minus: 'spDefense', mod: 1.1 },
  'calm': { name: '稳重', plus: 'spDefense', minus: 'attack', mod: 1.1 },
  'gentle': { name: '慎重', plus: 'spDefense', minus: 'spAttack', mod: 1.1 },
  'careful': { name: '认真', plus: 'spDefense', minus: 'speed', mod: 1.1 },
  'timid': { name: '胆小', plus: 'speed', minus: 'attack', mod: 1.1 },
  'hasty': { name: '爽朗', plus: 'speed', minus: 'defense', mod: 1.1 },
  'jolly': { name: '开朗', plus: 'speed', minus: 'spAttack', mod: 1.1 },
  'naive': { name: '天真', plus: 'speed', minus: 'spDefense', mod: 1.1 },
  'serious': { name: '实干', plus: '', minus: '', mod: 1.0 },
  'bashful': { name: '害羞', plus: '', minus: '', mod: 1.0 },
  'docile': { name: '坦率', plus: '', minus: '', mod: 1.0 },
  'quirky': { name: '浮躁', plus: '', minus: '', mod: 1.0 }
};

export class PokemonManager {
  static getPokemonBase(id: number): any {
    return pokemonList.find(p => p.id === id);
  }

  static getAllPokemon(): any[] {
    return pokemonList;
  }

  static getPokemonByTier(tier: number): any[] {
    return pokemonList.filter((p: any) => p.tier === tier);
  }

  static getRandomNature(): string {
    const natureKeys = Object.keys(NATURES);
    return natureKeys[Math.floor(Math.random() * natureKeys.length)];
  }

  static getNatureInfo(natureKey: string): Nature {
    return NATURES[natureKey] || NATURES['hardy'];
  }

  static createPokemon(baseId: number, level: number, options?: { forceNature?: string }): PokemonInstance | null {
    const base = this.getPokemonBase(baseId);
    if (!base) return null;

    const ivs = this.generateIvs();
    const evs = this.generateEmptyStats();
    const stats = this.calculateStats(base, level, ivs, evs);
    const moves = this.getLearnedMoves(base, level);
    const nature = options?.forceNature || this.getRandomNature();

    return {
      baseId,
      level,
      exp: this.getExpForLevel(level),
      currentHp: stats.hp,
      stats,
      moves,
      ivs,
      evs,
      nature,
      ability: Array.isArray(base.abilities) ? base.abilities[0] : (base.abilities || '无'),
      statusEffects: []
    };
  }

  static generateIvs(): Stats {
    return {
      hp: Math.floor(Math.random() * 32),
      attack: Math.floor(Math.random() * 32),
      defense: Math.floor(Math.random() * 32),
      spAttack: Math.floor(Math.random() * 32),
      spDefense: Math.floor(Math.random() * 32),
      speed: Math.floor(Math.random() * 32)
    };
  }

  static generateEmptyStats(): Stats {
    return { hp: 0, attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0 };
  }

  static calculateStats(base: any, level: number, ivs: Stats, evs: Stats): Stats {
    const hp = Math.floor(((2 * base.baseStats.hp + ivs.hp + Math.floor(evs.hp / 4)) * level) / 100) + level + 10;
    
    const calcStat = (baseStat: number, iv: number, ev: number): number => {
      return Math.floor(((2 * baseStat + iv + Math.floor(ev / 4)) * level) / 100) + 5;
    };

    let rawStats = {
      hp,
      attack: calcStat(base.baseStats.attack, ivs.attack, evs.attack),
      defense: calcStat(base.baseStats.defense, ivs.defense, evs.defense),
      spAttack: calcStat(base.baseStats.spAttack, ivs.spAttack, evs.spAttack),
      spDefense: calcStat(base.baseStats.spDefense, ivs.spDefense, evs.spDefense),
      speed: calcStat(base.baseStats.speed, ivs.speed, evs.speed)
    };

    return rawStats;
  }

  static applyNatureToDisplay(stats: Stats, nature: string): Stats {
    const natureInfo = NATURES[nature];
    if (!natureInfo || !natureInfo.plus) return stats;

    const result = { ...stats };
    
    if (natureInfo.plus && stats[natureInfo.plus as keyof Stats] !== undefined) {
      const key = natureInfo.plus as keyof Stats;
      result[key] = Math.floor(result[key] * natureInfo.mod);
    }
    if (natureInfo.minus && stats[natureInfo.minus as keyof Stats] !== undefined) {
      const key = natureInfo.minus as keyof Stats;
      result[key] = Math.floor(result[key] / natureInfo.mod);
    }
    
    return result;
  }

  static getLearnedMoves(base: any, level: number): LearnedMove[] {
    const moves: LearnedMove[] = [];
    const moveIds = base.learnset.filter((_: any, index: number) => index < 4);
    
    for (const moveId of moveIds) {
      const move = movesData.find(m => m.id === moveId);
      if (move) {
        moves.push({
          moveId,
          currentPp: move.pp
        });
      }
    }
    
    return moves;
  }

  static getExpForLevel(level: number): number {
    return Math.round((level * level * level) * 1.2);
  }

  static getExpForNextLevel(currentLevel: number): number {
    return this.getExpForLevel(currentLevel + 1);
  }

  static getExpToNextLevel(pokemon: PokemonInstance): { current: number; needed: number; progress: number } {
    const nextLevelExp = this.getExpForNextLevel(pokemon.level);
    const currentLevelExp = this.getExpForLevel(pokemon.level);
    const earned = pokemon.exp - currentLevelExp;
    const needed = nextLevelExp - currentLevelExp;
    const progress = Math.min(100, Math.floor((earned / needed) * 100));
    
    return { current: pokemon.exp, needed: nextLevelExp, progress };
  }

  static gainExp(pokemon: PokemonInstance, exp: number): { leveledUp: boolean; evolved: boolean; messages: string[] } {
    const result: { leveledUp: boolean; evolved: boolean; messages: string[] } = {
      leveledUp: false,
      evolved: false,
      messages: []
    };

    pokemon.exp += exp;
    result.messages.push(`${this.getPokemonName(pokemon)} 获得 ${exp} 经验值！`);

    while (true) {
      const nextLevelExp = this.getExpForNextLevel(pokemon.level);
      
      if (pokemon.exp >= nextLevelExp) {
        const oldLevel = pokemon.level;
        const base = this.getPokemonBase(pokemon.baseId);
        
        if (base) {
          pokemon.level++;
          pokemon.stats = this.calculateStats(base, pokemon.level, pokemon.ivs, pokemon.evs);
          
          const hpDiff = pokemon.stats.hp - pokemon.currentHp;
          pokemon.currentHp = pokemon.stats.hp - Math.min(hpDiff, 0);
          
          result.leveledUp = true;
          result.messages.push(`★ ${this.getPokemonName(pokemon)} 升到了 Lv.${pokemon.level}！`);
          
          const displayStats = this.applyNatureToDisplay(pokemon.stats, pokemon.nature);
          result.messages.push(`  HP:${displayStats.hp} 攻击:${displayStats.attack} 防御:${displayStats.defense}`);
          
          const evoResult = this.checkEvolution(pokemon);
          if (evoResult.evolved) {
            result.evolved = true;
            result.messages.push(...evoResult.messages);
          }
        }
      } else {
        break;
      }
    }

    return result;
  }

  static checkEvolution(pokemon: PokemonInstance): { evolved: boolean; messages: string[] } {
    const result: { evolved: boolean; messages: string[] } = {
      evolved: false,
      messages: []
    };

    const base = this.getPokemonBase(pokemon.baseId);
    if (!base || !base.evolutions || base.evolutions.length === 0) {
      return result;
    }

    for (const evo of base.evolutions) {
      if (evo.type === 'level' && pokemon.level >= evo.level) {
        const oldName = this.getPokemonName(pokemon);
        const newBase = this.getPokemonBase(evo.evolvesTo);
        
        if (newBase) {
          pokemon.baseId = evo.evolvesTo;
          pokemon.stats = this.calculateStats(newBase, pokemon.level, pokemon.ivs, pokemon.evs);
          pokemon.currentHp = pokemon.stats.hp;
          pokemon.ability = Array.isArray(newBase.abilities) 
            ? newBase.abilities[Math.floor(Math.random() * newBase.abilities.length)]
            : (newBase.abilities || '无');
          
          result.evolved = true;
          result.messages.push('');
          result.messages.push(`✦✦✦ 进化！ ✦✦✦`);
          result.messages.push(`${oldName}`);
          result.messages.push(`   ↓ ↓ ↓`);
          result.messages.push(`${newBase.name}`);
          result.messages.push(`✦✦✦ 进化完成！ ✦✦✦`);
          result.messages.push(`  属性: ${newBase.types.join('/')}`);
          result.messages.push(`  特性: ${pokemon.ability}`);
        }
      }
    }

    return result;
  }

  static canEvolve(pokemon: PokemonInstance): { can: boolean; method?: string; requirement?: string } {
    const base = this.getPokemonBase(pokemon.baseId);
    if (!base || !base.evolutions || base.evolutions.length === 0) {
      return { can: false };
    }

    for (const evo of base.evolutions) {
      if (evo.type === 'level') {
        if (pokemon.level >= evo.level) {
          return { can: true, method: '升级', requirement: `Lv.${evo.level}` };
        }
        return { can: true, method: '升级', requirement: `需要 Lv.${evo.level}` };
      }
      if (evo.type === 'item') {
        return { can: true, method: '道具', requirement: `${evo.itemName}` };
      }
    }

    return { can: false };
  }

  static getEvolutionChain(baseId: number): string[] {
    const chain: string[] = [];
    let currentId = baseId;
    const visited = new Set<number>();
    
    while (currentId && visited.size < 10 && !visited.has(currentId)) {
      visited.add(currentId);
      const base = this.getPokemonBase(currentId);
      if (base) {
        chain.push(base.name);
        if (base.evolutions && base.evolutions.length > 0) {
          currentId = base.evolutions[0].evolvesTo;
        } else {
          break;
        }
      } else {
        break;
      }
    }
    
    return chain;
  }

  static getPokemonName(pokemon: PokemonInstance): string {
    const base = this.getPokemonBase(pokemon.baseId);
    return pokemon.nickname || base?.name || '未知';
  }

  static getHpBar(current: number, max: number, width: number = 10): string {
    const filled = Math.floor((current / max) * width);
    const empty = width - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }

  static isFainted(pokemon: PokemonInstance): boolean {
    return pokemon.currentHp <= 0;
  }

  static heal(pokemon: PokemonInstance, amount: number): number {
    const maxHp = pokemon.stats.hp;
    const healed = Math.min(amount, maxHp - pokemon.currentHp);
    pokemon.currentHp += healed;
    return healed;
  }

  static healFully(pokemon: PokemonInstance): void {
    pokemon.currentHp = pokemon.stats.hp;
    for (const move of pokemon.moves) {
      const moveData = movesData.find(m => m.id === move.moveId);
      if (moveData) {
        move.currentPp = moveData.pp;
      }
    }
    pokemon.statusEffects = [];
  }

  static getRandomWildPokemon(minTier: number, maxTier: number): PokemonInstance | null {
    const availablePokemon = pokemonList.filter((p: any) => 
      p.tier >= minTier && p.tier <= maxTier && !this.isLegendary(p.id)
    );
    
    if (availablePokemon.length === 0) return null;
    
    const randomPokemon = availablePokemon[Math.floor(Math.random() * availablePokemon.length)];
    const levelVariance = Math.max(3, minTier * 2);
    const minLevel = Math.max(1, minTier * 2 - levelVariance);
    const maxLevel = minTier * 2 + levelVariance + 5;
    const level = minLevel + Math.floor(Math.random() * (maxLevel - minLevel));
    
    return this.createPokemon(randomPokemon.id, level);
  }

  static isLegendary(id: number): boolean {
    const legendaryIds = [104, 105, 106, 107];
    return legendaryIds.includes(id);
  }

  static getRareEncounter(locationMinLevel: number): PokemonInstance | null {
    if (Math.random() > 0.03) return null;

    const legendaryPool = pokemonList.filter((p: any) => this.isLegendary(p.id));
    if (legendaryPool.length === 0) return null;

    const randomLegend = legendaryPool[Math.floor(Math.random() * legendaryPool.length)];
    const level = locationMinLevel + 10;
    
    return this.createPokemon(randomLegend.id, level);
  }

  static getIVRating(ivs: Stats): string {
    const total = Object.values(ivs).reduce((a, b) => a + b, 0);
    const maxTotal = 32 * 6;
    const percentage = total / maxTotal;
    
    if (percentage > 0.9) return '完美';
    if (percentage > 0.8) return '优秀';
    if (percentage > 0.6) return '良好';
    if (percentage > 0.4) return '普通';
    return '一般';
  }

  static getStatusEffectiveness(status: string): { damagePerTurn: number; canAttack: boolean } {
    switch (status) {
      case 'poison':
        return { damagePerTurn: 8, canAttack: true };
      case 'burn':
        return { damagePerTurn: 8, canAttack: true };
      case 'paralysis':
        return { damagePerTurn: 0, canAttack: Math.random() > 0.25 };
      case 'freeze':
        return { damagePerTurn: 0, canAttack: false };
      case 'sleep':
        return { damagePerTurn: 0, canAttack: false };
      default:
        return { damagePerTurn: 0, canAttack: true };
    }
  }

  static addStatusEffect(pokemon: PokemonInstance, effect: string): boolean {
    if (pokemon.statusEffects.includes(effect)) return false;
    
    const immuneTypes: Record<string, string[]> = {
      poison: ['钢', '毒'],
      burn: ['水', '火', '冰'],
      freeze: ['冰'],
      paralysis: ['电', '地面'],
      sleep: []
    };
    
    const base = this.getPokemonBase(pokemon.baseId);
    if (base && immuneTypes[effect]?.includes(base.types[0])) {
      return false;
    }
    
    if (effect === 'freeze' && base?.types.includes('冰')) return false;
    
    pokemon.statusEffects.push(effect);
    return true;
  }
}
