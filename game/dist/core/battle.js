"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BattleEngine = void 0;
const pokemon_1 = require("./pokemon");
const moves_json_1 = __importDefault(require("../data/moves.json"));
const typeChart_json_1 = __importDefault(require("../data/typeChart.json"));
class BattleEngine {
    static createBattle(playerPokemon, enemyPokemon, type = 'wild') {
        return {
            type,
            playerPokemon: { ...playerPokemon },
            enemyPokemon: { ...enemyPokemon },
            playerActions: [],
            enemyActions: [],
            turn: 0,
            log: [],
            isOver: false
        };
    }
    static executeTurn(state, playerAction, enemyAction) {
        state.turn++;
        const playerSpeed = state.playerPokemon.stats.speed;
        const enemySpeed = state.enemyPokemon.stats.speed;
        const playerFirst = playerSpeed > enemySpeed ||
            (playerSpeed === enemySpeed && Math.random() < 0.5);
        if (playerFirst) {
            this.executeAction(state, state.playerPokemon, state.enemyPokemon, playerAction, 'player');
            if (!this.checkBattleEnd(state)) {
                this.executeAction(state, state.enemyPokemon, state.playerPokemon, enemyAction, 'enemy');
            }
        }
        else {
            this.executeAction(state, state.enemyPokemon, state.playerPokemon, enemyAction, 'enemy');
            if (!this.checkBattleEnd(state)) {
                this.executeAction(state, state.playerPokemon, state.enemyPokemon, playerAction, 'player');
            }
        }
        this.checkBattleEnd(state);
        return state;
    }
    static executeAction(state, attacker, defender, action, attackerRole) {
        switch (action.type) {
            case 'attack':
                this.executeAttack(state, attacker, defender, action.moveId, attackerRole);
                break;
            case 'run':
                this.executeRun(state, attackerRole);
                break;
            case 'wait':
                this.addLog(state, `${pokemon_1.PokemonManager.getPokemonName(attacker)}在等待...`, 'info');
                break;
        }
    }
    static executeAttack(state, attacker, defender, moveId, attackerRole) {
        const move = moves_json_1.default.find(m => m.id === moveId);
        if (!move) {
            this.addLog(state, '技能不存在！', 'info');
            return;
        }
        const learnedMove = attacker.moves.find(m => m.moveId === moveId);
        if (!learnedMove || learnedMove.currentPp <= 0) {
            this.addLog(state, '没有PP了！', 'info');
            return;
        }
        learnedMove.currentPp--;
        const attackerName = pokemon_1.PokemonManager.getPokemonName(attacker);
        const defenderName = pokemon_1.PokemonManager.getPokemonName(defender);
        if (Math.random() * 100 > move.accuracy) {
            this.addLog(state, `${attackerName}使用了${move.name}！但是没打中...`, 'miss');
            return;
        }
        if (move.category === 'status') {
            this.addLog(state, `${attackerName}使用了${move.name}！`, 'info');
            return;
        }
        const damage = this.calculateDamage(attacker, defender, move);
        defender.currentHp = Math.max(0, defender.currentHp - damage);
        const effectiveness = this.getTypeEffectiveness(move.type, defender);
        let effectivenessText = '';
        if (effectiveness > 1)
            effectivenessText = '效果拔群！';
        else if (effectiveness < 1 && effectiveness > 0)
            effectivenessText = '效果不太好...';
        else if (effectiveness === 0)
            effectivenessText = '没有效果...';
        const isCritical = Math.random() < 0.0625;
        const actualDamage = isCritical ? Math.floor(damage * 1.5) : damage;
        this.addLog(state, `${attackerName}使用了${move.name}！${effectivenessText}造成了${actualDamage}点伤害！`, isCritical ? 'critical' : 'damage');
        if (isCritical) {
            this.addLog(state, '击中了要害！', 'critical');
        }
    }
    static calculateDamage(attacker, defender, move) {
        const level = attacker.level;
        const power = move.power;
        const attack = move.category === 'physical'
            ? attacker.stats.attack
            : attacker.stats.spAttack;
        const defense = move.category === 'physical'
            ? defender.stats.defense
            : defender.stats.spDefense;
        const baseDamage = ((2 * level / 5 + 2) * power * attack / defense / 50) + 2;
        const effectiveness = this.getTypeEffectiveness(move.type, defender);
        const stab = this.getStabBonus(attacker, move.type);
        const random = 0.85 + Math.random() * 0.15;
        return Math.floor(baseDamage * effectiveness * stab * random);
    }
    static getTypeEffectiveness(attackType, defender) {
        const defenderBase = pokemon_1.PokemonManager.getPokemonBase(defender.baseId);
        if (!defenderBase)
            return 1;
        let effectiveness = 1;
        for (const defType of defenderBase.types) {
            const chart = typeChart_json_1.default;
            if (chart[attackType] && chart[attackType][defType] !== undefined) {
                effectiveness *= chart[attackType][defType];
            }
        }
        return effectiveness;
    }
    static getStabBonus(attacker, moveType) {
        const attackerBase = pokemon_1.PokemonManager.getPokemonBase(attacker.baseId);
        if (!attackerBase)
            return 1;
        return attackerBase.types.includes(moveType) ? 1.5 : 1;
    }
    static executeRun(state, runner) {
        if (state.type === 'wild') {
            if (Math.random() < 0.5) {
                state.isOver = true;
                this.addLog(state, '成功逃跑了！', 'info');
            }
            else {
                this.addLog(state, '逃跑失败！', 'info');
            }
        }
        else {
            this.addLog(state, '训练家战斗中无法逃跑！', 'info');
        }
    }
    static checkBattleEnd(state) {
        if (pokemon_1.PokemonManager.isFainted(state.playerPokemon)) {
            state.isOver = true;
            state.winner = 'enemy';
            this.addLog(state, `${pokemon_1.PokemonManager.getPokemonName(state.playerPokemon)}倒下了！`, 'info');
            return true;
        }
        if (pokemon_1.PokemonManager.isFainted(state.enemyPokemon)) {
            state.isOver = true;
            state.winner = 'player';
            this.addLog(state, `${pokemon_1.PokemonManager.getPokemonName(state.enemyPokemon)}被击败了！`, 'info');
            return true;
        }
        return false;
    }
    static addLog(state, message, type) {
        state.log.push({
            turn: state.turn,
            message,
            type
        });
    }
    static getEnemyAction(state) {
        const enemy = state.enemyPokemon;
        const availableMoves = enemy.moves.filter(m => m.currentPp > 0);
        if (availableMoves.length === 0) {
            return { type: 'wait' };
        }
        const randomMove = availableMoves[Math.floor(Math.random() * availableMoves.length)];
        return {
            type: 'attack',
            moveId: randomMove.moveId
        };
    }
    static getExpReward(state) {
        const enemyBase = pokemon_1.PokemonManager.getPokemonBase(state.enemyPokemon.baseId);
        if (!enemyBase)
            return 0;
        return Math.floor((enemyBase.expYield * state.enemyPokemon.level) / 7);
    }
    static canCatch(state, ballCatchRate) {
        const enemy = state.enemyPokemon;
        const enemyBase = pokemon_1.PokemonManager.getPokemonBase(enemy.baseId);
        if (!enemyBase)
            return { success: false, shakes: 0 };
        const hpMax = enemy.stats.hp;
        const hpCurrent = enemy.currentHp;
        const catchRate = ((3 * hpMax - 2 * hpCurrent) * enemyBase.catchRate * ballCatchRate) / (3 * hpMax);
        const shakeProbability = 65536 / Math.pow(255 / catchRate, 0.1875);
        let shakes = 0;
        for (let i = 0; i < 3; i++) {
            if (Math.random() * 65536 < shakeProbability) {
                shakes++;
            }
        }
        return {
            success: shakes === 3,
            shakes
        };
    }
}
exports.BattleEngine = BattleEngine;
//# sourceMappingURL=battle.js.map