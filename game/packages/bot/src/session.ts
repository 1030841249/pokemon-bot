import { Player, BattleState, PokemonInstance, BattleAction } from './core/types';
import { PokemonManager } from './core/pokemon';
import { PlayerManager } from './core/player';
import { BattleEngine } from './core/battle';
import mapsData from './data/maps.json';
import itemsData from './data/items.json';

type GameScene = 
  | 'main_menu'
  | 'starter_select'
  | 'name_input'
  | 'location'
  | 'explore'
  | 'battle'
  | 'battle_menu'
  | 'move_select'
  | 'party'
  | 'inventory'
  | 'move_location';

interface Session {
  userId: string;
  groupId?: string;
  player: Player | null;
  scene: GameScene;
  battleState: BattleState | null;
  tempData: {
    starterChoice?: number;
    selectedMoveIndex?: number;
    selectedLocation?: string;
    encounter?: any;
  };
}

export class SessionManager {
  private sessions: Map<string, Session> = new Map();
  private saveDir: string;

  constructor(saveDir: string = './saves') {
    this.saveDir = saveDir;
  }

  getSession(userId: string, groupId?: string): Session {
    const key = this.getSessionKey(userId, groupId);
    
    if (!this.sessions.has(key)) {
      this.sessions.set(key, {
        userId,
        groupId,
        player: null,
        scene: 'main_menu',
        battleState: null,
        tempData: {}
      });
    }
    
    return this.sessions.get(key)!;
  }

  private getSessionKey(userId: string, groupId?: string): string {
    return groupId ? `${groupId}_${userId}` : userId;
  }

  loadPlayer(userId: string, groupId?: string): Player | null {
    const key = this.getSessionKey(userId, groupId);
    const savePath = `${this.saveDir}/${key}.json`;
    
    try {
      const fs = require('fs');
      if (fs.existsSync(savePath)) {
        const data = fs.readFileSync(savePath, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('加载存档失败:', error);
    }
    
    return null;
  }

  savePlayer(session: Session): boolean {
    if (!session.player) return false;
    
    const key = this.getSessionKey(session.userId, session.groupId);
    const savePath = `${this.saveDir}/${key}.json`;
    
    try {
      const fs = require('fs');
      if (!fs.existsSync(this.saveDir)) {
        fs.mkdirSync(this.saveDir, { recursive: true });
      }
      fs.writeFileSync(savePath, JSON.stringify(session.player, null, 2));
      return true;
    } catch (error) {
      console.error('保存失败:', error);
      return false;
    }
  }

  handleInput(userId: string, message: string, groupId?: string): string {
    const session = this.getSession(userId, groupId);
    
    switch (session.scene) {
      case 'main_menu':
        return this.handleMainMenu(session, message);
      case 'starter_select':
        return this.handleStarterSelect(session, message);
      case 'name_input':
        return this.handleNameInput(session, message);
      case 'location':
        return this.handleLocation(session, message);
      case 'battle':
      case 'battle_menu':
        return this.handleBattle(session, message);
      case 'move_select':
        return this.handleMoveSelect(session, message);
      case 'move_location':
        return this.handleMoveLocation(session, message);
      default:
        return this.renderMainMenu(session);
    }
  }

  private handleMainMenu(session: Session, message: string): string {
    const choice = parseInt(message.trim());
    
    if (choice === 1) {
      session.scene = 'starter_select';
      return this.renderStarterSelect();
    } else if (choice === 2) {
      const player = this.loadPlayer(session.userId, session.groupId);
      if (player) {
        session.player = player;
        session.scene = 'location';
        return this.renderLocation(session);
      }
      return '没有找到存档，请先开始新游戏！\n\n' + this.renderMainMenu(session);
    }
    
    return this.renderMainMenu(session);
  }

  private handleStarterSelect(session: Session, message: string): string {
    const choice = parseInt(message.trim());
    
    if (choice >= 1 && choice <= 3) {
      session.tempData.starterChoice = choice - 1;
      session.scene = 'name_input';
      return '请输入你的名字：';
    }
    
    return this.renderStarterSelect();
  }

  private handleNameInput(session: Session, message: string): string {
    const name = message.trim() || '训练家';
    const starterIndex = session.tempData.starterChoice || 0;
    
    session.player = PlayerManager.createPlayer(name, starterIndex);
    session.scene = 'location';
    
    const starter = session.player.party[0];
    const starterName = PokemonManager.getPokemonName(starter);
    
    this.savePlayer(session);
    
    return `欢迎，${name}！\n你获得了 ${starterName}！\n\n` + this.renderLocation(session);
  }

  private handleLocation(session: Session, message: string): string {
    if (!session.player) return this.renderMainMenu(session);
    
    const choice = parseInt(message.trim());
    
    switch (choice) {
      case 1:
        return this.handleExplore(session);
      case 2:
        session.scene = 'move_location';
        return this.renderMoveLocation(session);
      case 3:
        return this.renderParty(session);
      case 4:
        return this.renderInventory(session);
      case 5:
        this.savePlayer(session);
        return '游戏已保存！\n\n' + this.renderLocation(session);
      default:
        return this.renderLocation(session);
    }
  }

  private handleExplore(session: Session): string {
    if (!session.player) return this.renderMainMenu(session);
    
    const location = (mapsData as any[]).find((l: any) => l.id === session.player!.currentLocation);
    if (!location || location.wildPokemon.length === 0) {
      return '这里没有野生宝可梦...\n\n' + this.renderLocation(session);
    }
    
    if (Math.random() < 0.4) {
      const encounter = this.selectWildEncounter(location.wildPokemon);
      if (encounter) {
        return this.startWildBattle(session, encounter);
      }
    }
    
    return '你在草丛中探索，但没有发现宝可梦。\n\n' + this.renderLocation(session);
  }

  private selectWildEncounter(encounters: any[]): any | null {
    const roll = Math.random();
    let cumulative = 0;
    
    for (const encounter of encounters) {
      cumulative += encounter.rate;
      if (roll < cumulative) {
        return encounter;
      }
    }
    
    return encounters[0];
  }

  private startWildBattle(session: Session, encounter: any): string {
    if (!session.player) return this.renderMainMenu(session);
    
    const playerPokemon = PlayerManager.getFirstHealthyPokemon(session.player);
    if (!playerPokemon) {
      return '你没有可以战斗的宝可梦！\n\n' + this.renderLocation(session);
    }
    
    const level = encounter.minLevel + Math.floor(Math.random() * (encounter.maxLevel - encounter.minLevel + 1));
    const enemyPokemon = PokemonManager.createPokemon(encounter.pokemonId, level);
    
    if (!enemyPokemon) return this.renderLocation(session);
    
    session.battleState = BattleEngine.createBattle(playerPokemon, enemyPokemon, 'wild');
    session.tempData.encounter = encounter;
    session.scene = 'battle_menu';
    
    const enemyName = PokemonManager.getPokemonName(enemyPokemon);
    
    return `野生的 ${enemyName} (Lv.${level}) 出现了！\n\n` + this.renderBattleMenu(session);
  }

  private handleBattle(session: Session, message: string): string {
    if (!session.battleState || !session.player) {
      session.scene = 'location';
      return this.renderLocation(session);
    }
    
    const choice = parseInt(message.trim());
    
    switch (choice) {
      case 1:
        session.scene = 'move_select';
        return this.renderMoveSelect(session);
      case 2:
        return this.handleUseBall(session);
      case 3:
        return this.handleRun(session);
      default:
        return this.renderBattleMenu(session);
    }
  }

  private handleMoveSelect(session: Session, message: string): string {
    if (!session.battleState || !session.player) {
      session.scene = 'location';
      return this.renderLocation(session);
    }
    
    const choice = parseInt(message.trim());
    
    if (choice === 0) {
      session.scene = 'battle_menu';
      return this.renderBattleMenu(session);
    }
    
    const moves = session.battleState.playerPokemon.moves;
    if (choice >= 1 && choice <= moves.length) {
      const playerAction: BattleAction = {
        type: 'attack',
        moveId: moves[choice - 1].moveId
      };
      
      return this.executeBattleTurn(session, playerAction);
    }
    
    return this.renderMoveSelect(session);
  }

  private handleUseBall(session: Session): string {
    if (!session.battleState || !session.player) {
      session.scene = 'location';
      return this.renderLocation(session);
    }
    
    if (!PlayerManager.hasItem(session.player, 1)) {
      return '你没有精灵球了！\n\n' + this.renderBattleMenu(session);
    }
    
    PlayerManager.removeItem(session.player, 1);
    const result = BattleEngine.canCatch(session.battleState, 1.0);
    
    if (result.success) {
      const enemyName = PokemonManager.getPokemonName(session.battleState.enemyPokemon);
      PlayerManager.addPokemon(session.player, session.battleState.enemyPokemon);
      
      session.battleState = null;
      session.scene = 'location';
      this.savePlayer(session);
      
      return `摇晃了${result.shakes}次...\n捕捉成功！\n${enemyName} 加入了你的队伍！\n\n` + this.renderLocation(session);
    }
    
    const enemyAction = BattleEngine.getEnemyAction(session.battleState);
    BattleEngine.executeTurn(session.battleState, { type: 'wait' }, enemyAction);
    
    let result_msg = `摇晃了${result.shakes}次...\n捕捉失败！\n\n`;
    result_msg += this.getBattleLog(session.battleState);
    result_msg += '\n' + this.renderBattleMenu(session);
    
    return result_msg;
  }

  private handleRun(session: Session): string {
    if (!session.battleState) {
      session.scene = 'location';
      return this.renderLocation(session);
    }
    
    if (session.battleState.type === 'wild') {
      if (Math.random() < 0.5) {
        session.battleState = null;
        session.scene = 'location';
        return '成功逃跑了！\n\n' + this.renderLocation(session);
      }
      
      const enemyAction = BattleEngine.getEnemyAction(session.battleState);
      BattleEngine.executeTurn(session.battleState, { type: 'run' }, enemyAction);
      
      return '逃跑失败！\n\n' + this.renderBattleMenu(session);
    }
    
    return '训练家战斗中无法逃跑！\n\n' + this.renderBattleMenu(session);
  }

  private executeBattleTurn(session: Session, playerAction: BattleAction): string {
    if (!session.battleState || !session.player) {
      session.scene = 'location';
      return this.renderLocation(session);
    }
    
    const enemyAction = BattleEngine.getEnemyAction(session.battleState);
    BattleEngine.executeTurn(session.battleState, playerAction, enemyAction);
    
    let result = this.getBattleLog(session.battleState);
    
    if (session.battleState.isOver) {
      if (session.battleState.winner === 'player') {
        const exp = BattleEngine.getExpReward(session.battleState);
        PlayerManager.gainExpToParty(session.player, exp, [0]);
        result += `\n战斗胜利！获得 ${exp} 经验值！`;
      } else {
        result += '\n战斗失败...';
      }
      
      this.syncPlayerPokemon(session);
      session.battleState = null;
      session.scene = 'location';
      this.savePlayer(session);
      
      return result + '\n\n' + this.renderLocation(session);
    }
    
    session.scene = 'battle_menu';
    return result + '\n' + this.renderBattleMenu(session);
  }

  private syncPlayerPokemon(session: Session): void {
    if (!session.player || !session.battleState) return;
    
    const index = session.player.party.findIndex((p: PokemonInstance) => 
      p.baseId === session.battleState!.playerPokemon.baseId
    );
    
    if (index >= 0) {
      session.player.party[index] = session.battleState.playerPokemon;
    }
  }

  private getBattleLog(state: BattleState): string {
    const recent = state.log.slice(-3);
    return recent.map((l: any) => l.message).join('\n');
  }

  private handleMoveLocation(session: Session, message: string): string {
    if (!session.player) return this.renderMainMenu(session);
    
    const location = (mapsData as any[]).find((l: any) => l.id === session.player!.currentLocation);
    if (!location) return this.renderLocation(session);
    
    const choice = parseInt(message.trim());
    
    if (choice === 0 || choice > location.connections.length) {
      session.scene = 'location';
      return this.renderLocation(session);
    }
    
    if (choice >= 1 && choice <= location.connections.length) {
      session.player.currentLocation = location.connections[choice - 1];
      session.scene = 'location';
      this.savePlayer(session);
      return '移动成功！\n\n' + this.renderLocation(session);
    }
    
    return this.renderMoveLocation(session);
  }

  renderMainMenu(session: Session): string {
    const player = this.loadPlayer(session.userId, session.groupId);
    let saveInfo = '';
    
    if (player) {
      saveInfo = `\n存档: ${player.name} (徽章: ${player.badges})`;
    }
    
    return `╔════════════════════════╗
║    宝可梦文字冒险      ║
╠════════════════════════╣
║ [1] 新游戏             ║
║ [2] 继续游戏${saveInfo ? '           ' : '（无存档）'}${saveInfo}
║ [3] 退出               ║
╚════════════════════════╝`;
  }

  private renderStarterSelect(): string {
    return `╔════════════════════════╗
║   选择初始宝可梦       ║
╠════════════════════════╣
║ [1] 小火龙 (火)        ║
║ [2] 杰尼龟 (水)        ║
║ [3] 妙蛙种子 (草)      ║
╚════════════════════════╝`;
  }

  private renderLocation(session: Session): string {
    if (!session.player) return this.renderMainMenu(session);
    
    const location = (mapsData as any[]).find((l: any) => l.id === session.player!.currentLocation);
    if (!location) return this.renderMainMenu(session);
    
    const pokemon = PlayerManager.getFirstHealthyPokemon(session.player);
    const pokemonName = pokemon ? PokemonManager.getPokemonName(pokemon) : '无';
    
    return `╔════════════════════════╗
║ ${location.name}
╠════════════════════════╣
║ ${location.description.slice(0, 18)}
║ ${location.description.slice(18) || ''}
╠════════════════════════╣
║ 当前: ${pokemonName} Lv.${pokemon?.level || 0}
╠════════════════════════╣
║ [1] 探索  [2] 移动     ║
║ [3] 队伍  [4] 背包     ║
║ [5] 存档               ║
╚════════════════════════╝`;
  }

  private renderBattleMenu(session: Session): string {
    if (!session.battleState) return this.renderLocation(session);
    
    const state = session.battleState;
    const playerP = state.playerPokemon;
    const enemyP = state.enemyPokemon;
    
    const playerName = PokemonManager.getPokemonName(playerP);
    const enemyName = PokemonManager.getPokemonName(enemyP);
    
    const playerHpBar = PokemonManager.getHpBar(playerP.currentHp, playerP.stats.hp, 8);
    const enemyHpBar = PokemonManager.getHpBar(enemyP.currentHp, enemyP.stats.hp, 8);
    
    return `╔════════════════════════╗
║ 敌方: ${enemyName} Lv.${enemyP.level}
║ HP: ${enemyHpBar} ${enemyP.currentHp}/${enemyP.stats.hp}
╠════════════════════════╣
║ 我方: ${playerName} Lv.${playerP.level}
║ HP: ${playerHpBar} ${playerP.currentHp}/${playerP.stats.hp}
╠════════════════════════╣
║ [1] 攻击  [2] 捕捉     ║
║ [3] 逃跑               ║
╚════════════════════════╝`;
  }

  private renderMoveSelect(session: Session): string {
    if (!session.battleState) return this.renderBattleMenu(session);
    
    const moves = session.battleState.playerPokemon.moves;
    let moveList = '';
    
    const movesData = require('./data/moves.json');
    
    for (let i = 0; i < 4; i++) {
      if (i < moves.length) {
        const move = moves[i];
        const moveData = movesData.find((m: any) => m.id === move.moveId);
        const moveName = moveData?.name || '未知';
        moveList += `║ [${i + 1}] ${moveName} (${move.currentPp})${' '.repeat(Math.max(0, 8 - moveName.length))}║\n`;
      } else {
        moveList += `║ [${i + 1}] -            ║\n`;
      }
    }
    
    return `╔════════════════════════╗
║      选择技能          ║
╠════════════════════════╣
${moveList}║ [0] 返回               ║
╚════════════════════════╝`;
  }

  private renderMoveLocation(session: Session): string {
    if (!session.player) return this.renderMainMenu(session);
    
    const location = (mapsData as any[]).find((l: any) => l.id === session.player!.currentLocation);
    if (!location) return this.renderLocation(session);
    
    let options = '';
    for (let i = 0; i < location.connections.length; i++) {
      const conn = (mapsData as any[]).find((l: any) => l.id === location.connections[i]);
      if (conn) {
        options += `║ [${i + 1}] ${conn.name}${' '.repeat(Math.max(0, 14 - conn.name.length))}║\n`;
      }
    }
    
    return `╔════════════════════════╗
║      选择目的地        ║
╠════════════════════════╣
${options}║ [0] 返回               ║
╚════════════════════════╝`;
  }

  private renderParty(session: Session): string {
    if (!session.player) return this.renderMainMenu(session);
    
    let partyList = '';
    for (let i = 0; i < session.player.party.length; i++) {
      const p = session.player.party[i];
      const name = PokemonManager.getPokemonName(p);
      const hpBar = PokemonManager.getHpBar(p.currentHp, p.stats.hp, 6);
      const status = PokemonManager.isFainted(p) ? ' [濒死]' : '';
      partyList += `║ ${i + 1}. ${name} Lv.${p.level}\n║    HP:${hpBar}${status}\n`;
    }
    
    return `╔════════════════════════╗
║        队伍            ║
╠════════════════════════╣
${partyList}╚════════════════════════╝

` + this.renderLocation(session);
  }

  private renderInventory(session: Session): string {
    if (!session.player) return this.renderMainMenu(session);
    
    if (session.player.inventory.length === 0) {
      return '背包是空的。\n\n' + this.renderLocation(session);
    }
    
    let itemList = '';
    for (const item of session.player.inventory) {
      const itemData = (itemsData as any[]).find((i: any) => i.id === item.itemId);
      if (itemData) {
        itemList += `║ ${itemData.name} x${item.quantity}\n`;
      }
    }
    
    return `╔════════════════════════╗
║        背包            ║
╠════════════════════════╣
${itemList}╚════════════════════════╝

` + this.renderLocation(session);
  }
}
