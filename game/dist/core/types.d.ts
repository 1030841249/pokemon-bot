export type PokemonType = '火' | '水' | '草' | '电' | '冰' | '格斗' | '毒' | '地面' | '飞行' | '超能' | '虫' | '岩石' | '幽灵' | '龙' | '恶' | '钢' | '妖精' | '一般';
export interface Nature {
    name: string;
    plus: string;
    minus: string;
    mod: number;
}
export interface Ability {
    name: string;
    description: string;
    effect: string;
}
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
export interface Evolution {
    level?: number;
    evolvesTo: number;
    type: 'level' | 'item' | 'trade' | 'friendship';
    itemName?: string;
}
export interface LevelMove {
    level: number;
    moveId: number;
}
export interface PokemonBase {
    id: number;
    name: string;
    types: PokemonType[];
    baseStats: Stats;
    learnset: number[];
    levelMoves?: LevelMove[];
    evolutions?: Evolution[];
    catchRate: number;
    expYield: number;
    growthRate?: string;
    abilities?: string | string[];
    tier?: number;
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
    nature: string;
    ability: string;
    statusEffects: string[];
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
    minTier?: number;
    maxTier?: number;
    npcs: NPC[];
    hasCenter: boolean;
    hasShop: boolean;
    shopItems?: number[];
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
    playerParty?: PokemonInstance[];
    turn: number;
    isOver: boolean;
    winner: 'player' | 'enemy' | null;
}
export interface BattleAction {
    type: 'attack' | 'item' | 'run' | 'wait' | 'switch';
    moveId?: number;
    itemId?: number;
    pokemonIndex?: number;
}
export interface TypeChart {
    [attacker: string]: {
        [defender: string]: number;
    };
}
//# sourceMappingURL=types.d.ts.map