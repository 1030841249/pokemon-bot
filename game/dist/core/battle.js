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
    static createBattle(playerPokemon, enemyPokemon, type, playerParty) {
        return {
            type,
            playerPokemon: { ...playerPokemon },
            enemyPokemon: { ...enemyPokemon },
            playerParty: playerParty,
            turn: 0,
            isOver: false,
            winner: null
        };
    }
    static executeTurn(state, playerAction, enemyAction) {
        state.turn++;
        const turnMessages = [];
        const statusMsgs = this.processStatusEffects(state, state.playerPokemon, 'player');
        turnMessages.push(...statusMsgs);
        if (this.checkBattleEnd(state)) {
            return { messages: turnMessages, isOver: state.isOver };
        }
        const enemyStatusMsgs = this.processStatusEffects(state, state.enemyPokemon, 'enemy');
        turnMessages.push(...enemyStatusMsgs);
        if (this.checkBattleEnd(state)) {
            return { messages: turnMessages, isOver: state.isOver };
        }
        const playerSpeed = this.getEffectiveSpeed(state.playerPokemon);
        const enemySpeed = this.getEffectiveSpeed(state.enemyPokemon);
        const playerCanAct = this.canPokemonAct(state.playerPokemon);
        const enemyCanAct = this.canPokemonAct(state.enemyPokemon);
        const playerFirst = playerSpeed > enemySpeed ||
            (playerSpeed === enemySpeed && Math.random() < 0.5);
        if (playerFirst) {
            if (playerCanAct) {
                const msg1 = this.executeAction(state, state.playerPokemon, state.enemyPokemon, playerAction, 'player');
                turnMessages.push(...msg1);
            }
            else {
                turnMessages.push(`${pokemon_1.PokemonManager.getPokemonName(state.playerPokemon)}无法行动！`);
            }
            if (!this.checkBattleEnd(state) && enemyCanAct) {
                const msg2 = this.executeAction(state, state.enemyPokemon, state.playerPokemon, enemyAction, 'enemy');
                turnMessages.push(...msg2);
            }
        }
        else {
            if (enemyCanAct) {
                const msg1 = this.executeAction(state, state.enemyPokemon, state.playerPokemon, enemyAction, 'enemy');
                turnMessages.push(...msg1);
            }
            if (!this.checkBattleEnd(state) && playerCanAct) {
                const msg2 = this.executeAction(state, state.playerPokemon, state.enemyPokemon, playerAction, 'player');
                turnMessages.push(...msg2);
            }
        }
        this.checkBattleEnd(state);
        return { messages: turnMessages, isOver: state.isOver };
    }
    static processStatusEffects(state, pokemon, _role) {
        const messages = [];
        const name = pokemon_1.PokemonManager.getPokemonName(pokemon);
        for (const status of pokemon.statusEffects) {
            const effectInfo = pokemon_1.PokemonManager.getStatusEffectiveness(status);
            if (effectInfo.damagePerTurn > 0 && pokemon.currentHp > 0) {
                const damage = Math.floor(pokemon.stats.hp * effectInfo.damagePerTurn / 100);
                pokemon.currentHp = Math.max(0, pokemon.currentHp - damage);
                let statusName = '';
                switch (status) {
                    case 'poison':
                        statusName = '毒';
                        break;
                    case 'burn':
                        statusName = '烧伤';
                        break;
                    case 'curse':
                        statusName = '诅咒';
                        break;
                }
                messages.push(`${name}受到${statusName}伤害，损失 ${damage} HP！`);
            }
            if (status === 'sleep') {
                if (Math.random() < 0.33) {
                    pokemon.statusEffects = pokemon.statusEffects.filter(s => s !== 'sleep');
                    messages.push(`${name}从睡眠中醒来了！`);
                }
            }
            if (status === 'freeze') {
                if (Math.random() < 0.2) {
                    pokemon.statusEffects = pokemon.statusEffects.filter(s => s !== 'freeze');
                    messages.push(`${name}解冻了！`);
                }
            }
        }
        return messages;
    }
    static canPokemonAct(pokemon) {
        for (const status of pokemon.statusEffects) {
            const effectInfo = pokemon_1.PokemonManager.getStatusEffectiveness(status);
            if (!effectInfo.canAttack)
                return false;
        }
        return true;
    }
    static getEffectiveSpeed(pokemon) {
        const naturedStats = pokemon_1.PokemonManager.applyNatureToDisplay(pokemon.stats, pokemon.nature);
        let speed = naturedStats.speed;
        if (pokemon.statusEffects.includes('paralysis')) {
            speed = Math.floor(speed * 0.25);
        }
        return speed;
    }
    static applyAbilityOnEntry(attacker, defender) {
        const messages = [];
        if (attacker.ability === '威吓') {
            const defStats = pokemon_1.PokemonManager.applyNatureToDisplay(defender.stats, defender.nature);
            defender.stats.attack = Math.max(1, Math.floor(defStats.attack * 0.67));
            const defName = pokemon_1.PokemonManager.getPokemonName(defender);
            messages.push(`${pokemon_1.PokemonManager.getPokemonName(attacker)}的威吓！${defName}的攻击下降了！`);
        }
        return messages;
    }
    static executeAction(state, attacker, defender, action, attackerRole) {
        const messages = [];
        switch (action.type) {
            case 'attack':
                const attackMsgs = this.executeAttack(state, attacker, defender, action.moveId);
                messages.push(...attackMsgs);
                break;
            case 'switch':
                const switchMsgs = this.executeSwitch(state, action.pokemonIndex, attackerRole);
                messages.push(...switchMsgs);
                break;
            case 'run':
                const runMsg = this.executeRun(state);
                messages.push(runMsg);
                break;
            case 'wait':
                messages.push(`${pokemon_1.PokemonManager.getPokemonName(attacker)}在等待...`);
                break;
        }
        return messages;
    }
    static executeSwitch(state, pokemonIndex, role) {
        const messages = [];
        const oldName = pokemon_1.PokemonManager.getPokemonName(state.playerPokemon);
        if (role === 'player' && state.playerParty) {
            const newPokemon = state.playerParty[pokemonIndex];
            if (newPokemon && !pokemon_1.PokemonManager.isFainted(newPokemon)) {
                state.playerPokemon = newPokemon;
                const newName = pokemon_1.PokemonManager.getPokemonName(newPokemon);
                messages.push(`${oldName}，回来！`);
                messages.push(`去吧！${newName}！`);
                const abilityMsgs = this.applyAbilityOnEntry(newPokemon, state.enemyPokemon);
                messages.push(...abilityMsgs);
            }
        }
        return messages;
    }
    static executeAttack(state, attacker, defender, moveId) {
        const messages = [];
        const move = moves_json_1.default.find(m => m.id === moveId);
        if (!move) {
            messages.push('技能不存在！');
            return messages;
        }
        const learnedMove = attacker.moves.find(m => m.moveId === moveId);
        if (!learnedMove || learnedMove.currentPp <= 0) {
            messages.push('没有PP了！');
            return messages;
        }
        learnedMove.currentPp--;
        const attackerName = pokemon_1.PokemonManager.getPokemonName(attacker);
        const defenderName = pokemon_1.PokemonManager.getPokemonName(defender);
        if (defender.ability === '引火' && move.type === '火') {
            messages.push(`${attackerName}使用了${move.name}！`);
            messages.push(`${defenderName}的引火特性吸收了火焰攻击！`);
            return messages;
        }
        if (defender.ability === '漂浮' && move.type === '地面') {
            messages.push(`${attackerName}使用了${move.name}！`);
            messages.push(`${defenderName}的漂浮特性使其免疫地面系攻击！`);
            return messages;
        }
        if (Math.random() * 100 > move.accuracy) {
            messages.push(`${attackerName}使用了${move.name}！没打中...`);
            return messages;
        }
        if (move.category === 'status') {
            messages.push(`${attackerName}使用了${move.name}！`);
            return messages;
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
        let msg = `${attackerName}的 ${move.name}！`;
        if (effectivenessText)
            msg += effectivenessText;
        msg += `造成 ${damage} 点伤害`;
        if (isCritical)
            msg += ' [要害一击]';
        messages.push(msg);
        if (defender.statusEffects.includes('freeze') && move.type === '火') {
            defender.statusEffects = defender.statusEffects.filter(s => s !== 'freeze');
            messages.push(`${defenderName}被火焰解冻了！`);
        }
        if (defender.currentHp > 0) {
            const statusEffect = move.statusEffect;
            const statusChance = move.statusChance;
            if (statusEffect && statusChance && Math.random() < statusChance) {
                const addResult = pokemon_1.PokemonManager.addStatusEffect(defender, statusEffect);
                if (addResult) {
                    const statusNames = {
                        poison: '中毒', burn: '烧伤', freeze: '冰冻',
                        paralysis: '麻痹', sleep: '睡眠'
                    };
                    messages.push(`${defenderName}被${statusNames[statusEffect] || statusEffect}了！`);
                }
            }
            if (defender.ability === '静电' && move.category === 'physical' && Math.random() < 0.3) {
                const addResult = pokemon_1.PokemonManager.addStatusEffect(attacker, 'paralysis');
                if (addResult) {
                    messages.push(`${defenderName}的静电特性使${attackerName}麻痹了！`);
                }
            }
        }
        return messages;
    }
    static calculateDamage(attacker, defender, move) {
        const level = attacker.level;
        const power = move.power;
        const atkStats = pokemon_1.PokemonManager.applyNatureToDisplay(attacker.stats, attacker.nature);
        const defStats = pokemon_1.PokemonManager.applyNatureToDisplay(defender.stats, defender.nature);
        let attack = move.category === 'physical'
            ? atkStats.attack
            : atkStats.spAttack;
        let defense = move.category === 'physical'
            ? defStats.defense
            : defStats.spDefense;
        if (attacker.statusEffects.includes('burn') && move.category === 'physical') {
            attack = Math.floor(attack * 0.5);
        }
        const baseDamage = ((2 * level / 5 + 2) * power * attack / defense / 50) + 2;
        const effectiveness = this.getTypeEffectiveness(move.type, defender);
        const stab = this.getStabBonus(attacker, move.type);
        const random = 0.85 + Math.random() * 0.15;
        let finalDamage = Math.floor(baseDamage * effectiveness * stab * random);
        if (attacker.ability === '猛火' || attacker.ability === '激流' || attacker.ability === '茂盛') {
            const attackerBase = pokemon_1.PokemonManager.getPokemonBase(attacker.baseId);
            if (attackerBase && attackerBase.types.includes(move.type) && attacker.currentHp < attacker.stats.hp * 0.33) {
                finalDamage = Math.floor(finalDamage * 1.5);
            }
        }
        return finalDamage;
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
    static executeRun(state) {
        if (state.type === 'wild') {
            const playerSpeed = this.getEffectiveSpeed(state.playerPokemon);
            const enemySpeed = this.getEffectiveSpeed(state.enemyPokemon);
            const escapeOdds = Math.floor((playerSpeed * 128 / enemySpeed + 30 * state.turn) % 256);
            if (Math.random() * 256 < escapeOdds) {
                state.isOver = true;
                return '成功逃跑了！';
            }
            return '逃跑失败！';
        }
        return '训练家战斗中无法逃跑！';
    }
    static hasAlivePartyMember(state) {
        if (!state.playerParty)
            return false;
        return state.playerParty.some(p => !pokemon_1.PokemonManager.isFainted(p));
    }
    static checkBattleEnd(state) {
        if (state.enemyPokemon.currentHp <= 0) {
            state.isOver = true;
            state.winner = 'player';
            return true;
        }
        if (state.playerPokemon.currentHp <= 0) {
            if (this.hasAlivePartyMember(state)) {
                return false;
            }
            state.isOver = true;
            state.winner = 'enemy';
            return true;
        }
        return false;
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