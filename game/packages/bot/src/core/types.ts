export type PokemonType = 
  | '火' | '水' | '草' | '电' | '冰' | '格斗'
  | '毒' | '地面' | '飞行' | '超能' | '虫' | '岩石'
  | '幽灵' | '龙' | '恶' | '钢' | '妖精' | '一般';

export interface Stats {
  hp: number;
  attack: number;
  defense: number;
  spAttack: number;
  spDefense: number;
  speed: number;
}

export interface Move {
  id: number;
  name: string;
  type: PokemonType;
  category: 'physical' | 'special' | 'status';
  power: number;
  accuracy: number;
  pp: number;
  description: string;
}

export interface PokemonBase {
  id: number;
  name: string;
  types: PokemonType[];
  baseStats: Stats;
  learnset: number[];
  evolution?: {
    level: number;
    evolvesTo: number;
  };
  catchRate: number;
  expYield: number;
}

export interface PokemonInstance {
  baseId: number;
  nickname?: string;
  level: number;
  exp: number;
  currentHp: number;
  stats: Stats;
  moves: LearnedMove[];
  ivs: Stats;
  evs: Stats;
}

export interface LearnedMove {
  moveId: number;
  currentPp: number;
}

export interface InventoryItem {
  itemId: number;
  quantity: number;
}

export interface Player {
  name: string;
  party: PokemonInstance[];
  pc: PokemonInstance[][];
  inventory: InventoryItem[];
  badges: number;
  money: number;
  currentLocation: string;
  playTime: number;
}

export interface Location {
  id: string;
  name: string;
  description: string;
  connections: string[];
  wildPokemon: WildEncounter[];
  npcs: NPC[];
  gym?: GymLeader;
}

export interface WildEncounter {
  pokemonId: number;
  minLevel: number;
  maxLevel: number;
  rate: number;
}

export interface NPC {
  id: string;
  name: string;
  dialogue: string[];
  type: 'normal' | 'healer' | 'shop' | 'trainer';
}

export interface GymLeader {
  name: string;
  type: PokemonType;
  badge: string;
  pokemon: PokemonInstance[];
  reward: number;
}

export interface BattleState {
  type: 'wild' | 'trainer';
  playerPokemon: PokemonInstance;
  enemyPokemon: PokemonInstance;
  playerActions: BattleAction[];
  enemyActions: BattleAction[];
  turn: number;
  log: BattleLogEntry[];
  isOver: boolean;
  winner?: 'player' | 'enemy';
}

export interface BattleAction {
  type: 'attack' | 'item' | 'switch' | 'run' | 'wait';
  moveId?: number;
  itemId?: number;
  pokemonIndex?: number;
}

export interface BattleLogEntry {
  turn: number;
  message: string;
  type: 'info' | 'damage' | 'heal' | 'status' | 'critical' | 'miss';
}

export interface TypeChart {
  [attacker: string]: {
    [defender: string]: number;
  };
}
