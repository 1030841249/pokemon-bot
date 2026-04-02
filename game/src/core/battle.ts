import { BattleState, BattleAction, BattleLogEntry, PokemonInstance, PokemonType } from './types';
import { PokemonManager } from './pokemon';
import movesData from '../data/moves.json';
import typeChart from '../data/typeChart.json';

interface Move {
  id: number;
  name: string;
  type: PokemonType;
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
    type: 'wild' | 'trainer' = 'wild'
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
  ): BattleState {
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
    } else {
      this.executeAction(state, state.enemyPokemon, state.playerPokemon, enemyAction, 'enemy');
      if (!this.checkBattleEnd(state)) {
        this.executeAction(state, state.playerPokemon, state.enemyPokemon, playerAction, 'player');
      }
    }

    this.checkBattleEnd(state);
    return state;
  }

  private static executeAction(
    state: BattleState,
    attacker: PokemonInstance,
    defender: PokemonInstance,
    action: BattleAction,
    attackerRole: 'player' | 'enemy'
  ): void {
    switch (action.type) {
      case 'attack':
        this.executeAttack(state, attacker, defender, action.moveId!, attackerRole);
        break;
      case 'run':
        this.executeRun(state, attackerRole);
        break;
      case 'wait':
        this.addLog(state, `${PokemonManager.getPokemonName(attacker)}在等待...`, 'info');
        break;
    }
  }

  private static executeAttack(
    state: BattleState,
    attacker: PokemonInstance,
    defender: PokemonInstance,
    moveId: number,
    attackerRole: 'player' | 'enemy'
  ): void {
    const move = movesData.find(m => m.id === moveId) as Move;
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

    const attackerName = PokemonManager.getPokemonName(attacker);
    const defenderName = PokemonManager.getPokemonName(defender);

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
    if (effectiveness > 1) effectivenessText = '效果拔群！';
    else if (effectiveness < 1 && effectiveness > 0) effectivenessText = '效果不太好...';
    else if (effectiveness === 0) effectivenessText = '没有效果...';

    const isCritical = Math.random() < 0.0625;
    const actualDamage = isCritical ? Math.floor(damage * 1.5) : damage;

    this.addLog(
      state,
      `${attackerName}使用了${move.name}！${effectivenessText}造成了${actualDamage}点伤害！`,
      isCritical ? 'critical' : 'damage'
    );

    if (isCritical) {
      this.addLog(state, '击中了要害！', 'critical');
    }
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

  private static getTypeEffectiveness(attackType: PokemonType, defender: PokemonInstance): number {
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

  private static getStabBonus(attacker: PokemonInstance, moveType: PokemonType): number {
    const attackerBase = PokemonManager.getPokemonBase(attacker.baseId);
    if (!attackerBase) return 1;
    
    return attackerBase.types.includes(moveType) ? 1.5 : 1;
  }

  private static executeRun(state: BattleState, runner: 'player' | 'enemy'): void {
    if (state.type === 'wild') {
      if (Math.random() < 0.5) {
        state.isOver = true;
        this.addLog(state, '成功逃跑了！', 'info');
      } else {
        this.addLog(state, '逃跑失败！', 'info');
      }
    } else {
      this.addLog(state, '训练家战斗中无法逃跑！', 'info');
    }
  }

  private static checkBattleEnd(state: BattleState): boolean {
    if (PokemonManager.isFainted(state.playerPokemon)) {
      state.isOver = true;
      state.winner = 'enemy';
      this.addLog(state, `${PokemonManager.getPokemonName(state.playerPokemon)}倒下了！`, 'info');
      return true;
    }

    if (PokemonManager.isFainted(state.enemyPokemon)) {
      state.isOver = true;
      state.winner = 'player';
      this.addLog(state, `${PokemonManager.getPokemonName(state.enemyPokemon)}被击败了！`, 'info');
      return true;
    }

    return false;
  }

  private static addLog(state: BattleState, message: string, type: BattleLogEntry['type']): void {
    state.log.push({
      turn: state.turn,
      message,
      type
    });
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
