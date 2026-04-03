import { BattleState, PokemonInstance, BattleAction } from './types';
import { PokemonManager } from './pokemon';
import movesData from '../data/moves.json';
import typeChart from '../data/typeChart.json';

interface Move {
  id: number;
  name: string;
  type: any;
  category: 'physical' | 'special' | 'status';
  power: number;
  accuracy: number;
  pp: number;
  description: string;
}

export class BattleEngine {
  static createBattle(
    playerPokemon: PokemonInstance,
    enemyPokemon: PokemonInstance,
    type: 'wild' | 'trainer'
  ): BattleState {
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

  static executeTurn(
    state: BattleState,
    playerAction: BattleAction,
    enemyAction: BattleAction
  ): { messages: string[]; isOver: boolean } {
    state.turn++;
    const turnMessages: string[] = [];

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

    const playerSpeed = state.playerPokemon.stats.speed;
    const enemySpeed = state.enemyPokemon.stats.speed;

    const playerCanAct = this.canPokemonAct(state.playerPokemon);
    const enemyCanAct = this.canPokemonAct(state.enemyPokemon);

    const playerFirst = playerSpeed > enemySpeed ||
      (playerSpeed === enemySpeed && Math.random() < 0.5);

    if (playerFirst) {
      if (playerCanAct) {
        const msg1 = this.executeAction(state, state.playerPokemon, state.enemyPokemon, playerAction, 'player');
        turnMessages.push(...msg1);
      } else {
        turnMessages.push(`${PokemonManager.getPokemonName(state.playerPokemon)}无法行动！`);
      }

      if (!this.checkBattleEnd(state) && enemyCanAct) {
        const msg2 = this.executeAction(state, state.enemyPokemon, state.playerPokemon, enemyAction, 'enemy');
        turnMessages.push(...msg2);
      }
    } else {
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

  private static processStatusEffects(state: BattleState, pokemon: PokemonInstance, _role: 'player' | 'enemy'): string[] {
    const messages: string[] = [];
    const name = PokemonManager.getPokemonName(pokemon);

    for (const status of pokemon.statusEffects) {
      const effectInfo = PokemonManager.getStatusEffectiveness(status);
      
      if (effectInfo.damagePerTurn > 0 && pokemon.currentHp > 0) {
        const damage = Math.floor(pokemon.stats.hp * effectInfo.damagePerTurn / 100);
        pokemon.currentHp = Math.max(0, pokemon.currentHp - damage);
        
        let statusName = '';
        switch (status) {
          case 'poison': statusName = '毒'; break;
          case 'burn': statusName = '烧伤'; break;
          case 'curse': statusName = '诅咒'; break;
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

  private static canPokemonAct(pokemon: PokemonInstance): boolean {
    for (const status of pokemon.statusEffects) {
      const effectInfo = PokemonManager.getStatusEffectiveness(status);
      if (!effectInfo.canAttack) return false;
    }
    return true;
  }

  private static executeAction(
    state: BattleState,
    attacker: PokemonInstance,
    defender: PokemonInstance,
    action: BattleAction,
    _attackerRole: 'player' | 'enemy'
  ): string[] {
    const messages: string[] = [];
    
    switch (action.type) {
      case 'attack':
        const attackMsgs = this.executeAttack(state, attacker, defender, action.moveId!);
        messages.push(...attackMsgs);
        break;
      case 'run':
        const runMsg = this.executeRun(state);
        messages.push(runMsg);
        break;
      case 'wait':
        messages.push(`${PokemonManager.getPokemonName(attacker)}在等待...`);
        break;
    }
    
    return messages;
  }

  private static executeAttack(
    state: BattleState,
    attacker: PokemonInstance,
    defender: PokemonInstance,
    moveId: number
  ): string[] {
    const messages: string[] = [];
    const move = movesData.find(m => m.id === moveId) as Move;
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

    const attackerName = PokemonManager.getPokemonName(attacker);

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
    if (effectiveness > 1) effectivenessText = '效果拔群！';
    else if (effectiveness < 1 && effectiveness > 0) effectivenessText = '效果不太好...';
    else if (effectiveness === 0) effectivenessText = '没有效果...';

    const isCritical = Math.random() < 0.0625;

    let msg = `${attackerName}的 ${move.name}！`;
    if (effectivenessText) msg += effectivenessText;
    msg += `造成 ${damage} 点伤害`;
    if (isCritical) msg += ' [要害一击]';
    messages.push(msg);

    return messages;
  }

  private static calculateDamage(
    attacker: PokemonInstance,
    defender: PokemonInstance,
    move: Move
  ): number {
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

  private static getTypeEffectiveness(attackType: any, defender: PokemonInstance): number {
    const defenderBase = PokemonManager.getPokemonBase(defender.baseId);
    if (!defenderBase) return 1;

    let effectiveness = 1;
    for (const defType of defenderBase.types) {
      const chart = typeChart as Record<string, Record<string, number>>;
      if (chart[attackType] && chart[attackType][defType] !== undefined) {
        effectiveness *= chart[attackType][defType];
      }
    }
    return effectiveness;
  }

  private static getStabBonus(attacker: PokemonInstance, moveType: any): number {
    const attackerBase = PokemonManager.getPokemonBase(attacker.baseId);
    if (!attackerBase) return 1;
    
    return attackerBase.types.includes(moveType) ? 1.5 : 1;
  }

  private static executeRun(state: BattleState): string {
    if (state.type === 'wild') {
      if (Math.random() < 0.5) {
        state.isOver = true;
        return '成功逃跑了！';
      }
      return '逃跑失败！';
    }
    return '训练家战斗中无法逃跑！';
  }

  private static checkBattleEnd(state: BattleState): boolean {
    if (state.enemyPokemon.currentHp <= 0) {
      state.isOver = true;
      state.winner = 'player';
      return true;
    }

    if (state.playerPokemon.currentHp <= 0) {
      state.isOver = true;
      state.winner = 'enemy';
      return true;
    }

    return false;
  }

  static getEnemyAction(state: BattleState): BattleAction {
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

  static getExpReward(state: BattleState): number {
    const enemyBase = PokemonManager.getPokemonBase(state.enemyPokemon.baseId);
    if (!enemyBase) return 0;
    
    return Math.floor((enemyBase.expYield * state.enemyPokemon.level) / 7);
  }

  static canCatch(state: BattleState, ballCatchRate: number): { success: boolean; shakes: number } {
    const enemy = state.enemyPokemon;
    const enemyBase = PokemonManager.getPokemonBase(enemy.baseId);
    if (!enemyBase) return { success: false, shakes: 0 };

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
