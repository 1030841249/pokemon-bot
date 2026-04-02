"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PokemonManager = void 0;
const pokemon_json_1 = __importDefault(require("../data/pokemon.json"));
const moves_json_1 = __importDefault(require("../data/moves.json"));
const pokemonList = pokemon_json_1.default;
class PokemonManager {
    static getPokemonBase(id) {
        return pokemonList.find(p => p.id === id);
    }
    static getAllPokemon() {
        return pokemonList;
    }
    static createPokemon(baseId, level) {
        const base = this.getPokemonBase(baseId);
        if (!base)
            return null;
        const ivs = this.generateIvs();
        const evs = this.generateEmptyStats();
        const stats = this.calculateStats(base, level, ivs, evs);
        const moves = this.getLearnedMoves(base, level);
        return {
            baseId,
            level,
            exp: this.getExpForLevel(level),
            currentHp: stats.hp,
            stats,
            moves,
            ivs,
            evs
        };
    }
    static generateIvs() {
        return {
            hp: Math.floor(Math.random() * 32),
            attack: Math.floor(Math.random() * 32),
            defense: Math.floor(Math.random() * 32),
            spAttack: Math.floor(Math.random() * 32),
            spDefense: Math.floor(Math.random() * 32),
            speed: Math.floor(Math.random() * 32)
        };
    }
    static generateEmptyStats() {
        return { hp: 0, attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0 };
    }
    static calculateStats(base, level, ivs, evs) {
        const hp = Math.floor(((2 * base.baseStats.hp + ivs.hp + Math.floor(evs.hp / 4)) * level) / 100) + level + 10;
        const calcStat = (baseStat, iv, ev) => {
            return Math.floor(((2 * baseStat + iv + Math.floor(ev / 4)) * level) / 100) + 5;
        };
        return {
            hp,
            attack: calcStat(base.baseStats.attack, ivs.attack, evs.attack),
            defense: calcStat(base.baseStats.defense, ivs.defense, evs.defense),
            spAttack: calcStat(base.baseStats.spAttack, ivs.spAttack, evs.spAttack),
            spDefense: calcStat(base.baseStats.spDefense, ivs.spDefense, evs.spDefense),
            speed: calcStat(base.baseStats.speed, ivs.speed, evs.speed)
        };
    }
    static getLearnedMoves(base, level) {
        const moves = [];
        const moveIds = base.learnset.filter((_, index) => index < 4);
        for (const moveId of moveIds) {
            const move = moves_json_1.default.find(m => m.id === moveId);
            if (move) {
                moves.push({
                    moveId,
                    currentPp: move.pp
                });
            }
        }
        return moves;
    }
    static getExpForLevel(level) {
        return Math.floor((4 * Math.pow(level, 3)) / 5);
    }
    static getExpForNextLevel(level) {
        return this.getExpForLevel(level + 1);
    }
    static gainExp(pokemon, exp) {
        pokemon.exp += exp;
        const nextLevelExp = this.getExpForNextLevel(pokemon.level);
        if (pokemon.exp >= nextLevelExp) {
            return this.levelUp(pokemon);
        }
        return false;
    }
    static levelUp(pokemon) {
        const base = this.getPokemonBase(pokemon.baseId);
        if (!base)
            return false;
        pokemon.level++;
        pokemon.stats = this.calculateStats(base, pokemon.level, pokemon.ivs, pokemon.evs);
        pokemon.currentHp = pokemon.stats.hp;
        if (base.evolution && pokemon.level >= base.evolution.level) {
            return true;
        }
        return false;
    }
    static evolve(pokemon) {
        const base = this.getPokemonBase(pokemon.baseId);
        if (!base?.evolution)
            return false;
        const evolutionBase = this.getPokemonBase(base.evolution.evolvesTo);
        if (!evolutionBase)
            return false;
        pokemon.baseId = base.evolution.evolvesTo;
        pokemon.stats = this.calculateStats(evolutionBase, pokemon.level, pokemon.ivs, pokemon.evs);
        return true;
    }
    static getPokemonName(pokemon) {
        const base = this.getPokemonBase(pokemon.baseId);
        return pokemon.nickname || base?.name || '未知';
    }
    static getHpBar(current, max, width = 10) {
        const filled = Math.floor((current / max) * width);
        const empty = width - filled;
        return '█'.repeat(filled) + '░'.repeat(empty);
    }
    static isFainted(pokemon) {
        return pokemon.currentHp <= 0;
    }
    static heal(pokemon, amount) {
        const maxHp = pokemon.stats.hp;
        const healed = Math.min(amount, maxHp - pokemon.currentHp);
        pokemon.currentHp += healed;
        return healed;
    }
    static healFully(pokemon) {
        pokemon.currentHp = pokemon.stats.hp;
        for (const move of pokemon.moves) {
            const moveData = moves_json_1.default.find(m => m.id === move.moveId);
            if (moveData) {
                move.currentPp = moveData.pp;
            }
        }
    }
}
exports.PokemonManager = PokemonManager;
