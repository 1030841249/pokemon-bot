import { Player, Location, WildEncounter, BattleAction } from './core/types';
import { PokemonManager } from './core/pokemon';
import { PlayerManager } from './core/player';
import { BattleEngine } from './core/battle';
import { Renderer } from './ui/renderer';
import { InputHandler } from './ui/input';
import { SaveManager } from './systems/save';
import mapsData from './data/maps.json';
import itemsData from './data/items.json';

const locations = mapsData as Location[];

class Game {
  private player: Player | null = null;
  private input: InputHandler;
  private running: boolean = false;

  constructor() {
    this.input = new InputHandler();
  }

  async start(): Promise<void> {
    this.running = true;
    Renderer.clear();
    Renderer.drawTitle();
    
    await this.input.waitForKey();
    
    while (this.running) {
      await this.showMainMenu();
    }
    
    this.input.close();
  }

  private async showMainMenu(): Promise<void> {
    Renderer.clear();
    
    const saves = SaveManager.getAllSaves();
    const options: string[] = ['新游戏'];
    
    for (const save of saves) {
      if (save.info) {
        options.push(`继续游戏 - ${save.info.name} (徽章: ${save.info.badges})`);
      } else {
        options.push(`存档 ${save.slot} - 空`);
      }
    }
    options.push('退出');
    
    Renderer.drawMenu('宝可梦文字冒险', options);
    
    const choice = await this.input.getMenuChoice(options.length);
    
    if (choice === 0 || choice === options.length) {
      this.running = false;
      return;
    }
    
    if (choice === 1) {
      await this.newGame();
    } else {
      const slot = choice - 1;
      const saveInfo = SaveManager.getSaveInfo(slot);
      if (saveInfo) {
        this.player = SaveManager.load(slot);
        if (this.player) {
          await this.gameLoop(slot);
        }
      } else {
        Renderer.showMessage('这个存档是空的！');
        await this.input.waitForKey();
      }
    }
  }

  private async newGame(): Promise<void> {
    Renderer.clear();
    Renderer.drawStarterSelection();
    
    const choice = await this.input.getMenuChoice(3);
    if (choice === 0) return;
    
    const name = await this.input.getText('请输入你的名字');
    
    this.player = PlayerManager.createPlayer(name || '训练家', choice - 1);
    
    Renderer.clear();
    Renderer.showMessage(`欢迎，${this.player.name}！你获得了 ${PokemonManager.getPokemonName(this.player.party[0])}！`);
    await this.input.waitForKey();
    
    await this.gameLoop(1);
  }

  private async gameLoop(saveSlot: number): Promise<void> {
    while (this.running && this.player) {
      await this.showLocationMenu(saveSlot);
    }
  }

  private async showLocationMenu(saveSlot: number): Promise<void> {
    if (!this.player) return;
    
    const location = locations.find(l => l.id === this.player!.currentLocation);
    if (!location) {
      Renderer.showMessage('错误：未知位置');
      await this.input.waitForKey();
      return;
    }
    
    Renderer.clear();
    Renderer.drawLocation(location.name, location.description);
    
    const options: string[] = ['探索', '移动', '队伍', '背包', '存档', '返回主菜单'];
    Renderer.drawMenu('选择行动', options);
    
    const choice = await this.input.getMenuChoice(options.length);
    
    switch (choice) {
      case 1:
        await this.explore(location, saveSlot);
        break;
      case 2:
        await this.move(location);
        break;
      case 3:
        await this.showParty();
        break;
      case 4:
        await this.showInventory();
        break;
      case 5:
        this.saveGame(saveSlot);
        break;
      case 6:
        this.player = null;
        break;
    }
  }

  private async explore(location: Location, saveSlot: number): Promise<void> {
    if (!this.player) return;
    
    if (location.wildPokemon.length === 0) {
      Renderer.showMessage('这里没有野生宝可梦...');
      await this.input.waitForKey();
      return;
    }
    
    if (Math.random() < 0.3) {
      const encounter = this.selectWildEncounter(location.wildPokemon);
      if (encounter) {
        await this.wildBattle(encounter, saveSlot);
      }
    } else {
      Renderer.showMessage('你在草丛中探索，但没有发现宝可梦。');
      await this.input.waitForKey();
    }
  }

  private selectWildEncounter(encounters: WildEncounter[]): WildEncounter | null {
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

  private async wildBattle(encounter: WildEncounter, saveSlot: number): Promise<void> {
    if (!this.player) return;
    
    const playerPokemon = PlayerManager.getFirstHealthyPokemon(this.player);
    if (!playerPokemon) {
      Renderer.showMessage('你没有可以战斗的宝可梦！');
      await this.input.waitForKey();
      return;
    }
    
    const level = encounter.minLevel + Math.floor(Math.random() * (encounter.maxLevel - encounter.minLevel + 1));
    const enemyPokemon = PokemonManager.createPokemon(encounter.pokemonId, level);
    
    if (!enemyPokemon) return;
    
    Renderer.clear();
    Renderer.drawWildBattleStart(enemyPokemon);
    await this.input.waitForKey();
    
    const state = BattleEngine.createBattle(playerPokemon, enemyPokemon, 'wild');
    
    while (!state.isOver) {
      Renderer.clear();
      Renderer.drawBattle(state);
      Renderer.drawBattleMenu(state.playerPokemon);
      
      const choice = await this.input.getMenuChoice(4);
      
      let playerAction: BattleAction;
      
      switch (choice) {
        case 1:
          Renderer.clear();
          Renderer.drawMoveMenu(state.playerPokemon);
          const moveChoice = await this.input.getMenuChoice(4);
          if (moveChoice === 0 || moveChoice > state.playerPokemon.moves.length) {
            continue;
          }
          playerAction = { type: 'attack', moveId: state.playerPokemon.moves[moveChoice - 1].moveId };
          break;
        case 2:
          const ballResult = await this.useItem(1, state);
          if (ballResult) {
            if (ballResult.success) {
              Renderer.drawCatchAttempt(ballResult.shakes, true);
              await this.input.waitForKey();
              
              PlayerManager.addPokemon(this.player, state.enemyPokemon);
              Renderer.showMessage(`${PokemonManager.getPokemonName(state.enemyPokemon)} 被捕捉了！`);
              await this.input.waitForKey();
              return;
            } else {
              Renderer.drawCatchAttempt(ballResult.shakes, false);
              await this.input.waitForKey();
            }
          }
          playerAction = { type: 'wait' };
          break;
        case 3:
          await this.showPartyInBattle(state);
          playerAction = { type: 'wait' };
          continue;
        case 4:
          playerAction = { type: 'run' };
          break;
        default:
          continue;
      }
      
      const enemyAction = BattleEngine.getEnemyAction(state);
      BattleEngine.executeTurn(state, playerAction, enemyAction);
      
      Renderer.clear();
      Renderer.showBattleLog(state.log);
      await this.input.waitForKey();
    }
    
    if (state.winner === 'player') {
      const exp = BattleEngine.getExpReward(state);
      Renderer.showMessage(`战斗胜利！获得了 ${exp} 经验值！`);
      await this.input.waitForKey();
      
      PlayerManager.gainExpToParty(this.player, exp, [0]);
    } else {
      Renderer.showMessage('战斗失败...');
      await this.input.waitForKey();
    }
    
    this.syncPlayerPokemon(state);
    this.saveGame(saveSlot);
  }

  private async useItem(itemId: number, state: any): Promise<{ success: boolean; shakes: number } | null> {
    if (!this.player) return null;
    
    if (!PlayerManager.hasItem(this.player, itemId)) {
      Renderer.showMessage('你没有这个道具！');
      await this.input.waitForKey();
      return null;
    }
    
    const item = itemsData.find(i => i.id === itemId);
    if (!item) return null;
    
    if (item.type === 'ball' && item.catchRate !== undefined) {
      PlayerManager.removeItem(this.player, itemId);
      return BattleEngine.canCatch(state, item.catchRate);
    }
    
    return null;
  }

  private syncPlayerPokemon(state: any): void {
    if (!this.player) return;
    
    const index = this.player.party.findIndex(p => 
      PokemonManager.getPokemonName(p) === PokemonManager.getPokemonName(state.playerPokemon)
    );
    
    if (index >= 0) {
      this.player.party[index] = state.playerPokemon;
    }
  }

  private async move(location: Location): Promise<void> {
    if (!this.player) return;
    
    if (location.connections.length === 0) {
      Renderer.showMessage('这里没有可以移动的地方。');
      await this.input.waitForKey();
      return;
    }
    
    const options: string[] = [];
    for (const connId of location.connections) {
      const conn = locations.find(l => l.id === connId);
      if (conn) {
        options.push(conn.name);
      }
    }
    options.push('取消');
    
    Renderer.drawMenu('选择目的地', options);
    
    const choice = await this.input.getMenuChoice(options.length);
    
    if (choice > 0 && choice <= location.connections.length) {
      this.player.currentLocation = location.connections[choice - 1];
      Renderer.showMessage('移动成功！');
      await this.input.waitForKey();
    }
  }

  private async showParty(): Promise<void> {
    if (!this.player) return;
    
    Renderer.clear();
    Renderer.drawParty(this.player.party);
    
    await this.input.waitForKey();
    
    const choice = await this.input.getMenuChoice(this.player.party.length);
    
    if (choice > 0 && choice <= this.player.party.length) {
      Renderer.clear();
      Renderer.drawPokemonStatus(this.player.party[choice - 1]);
      await this.input.waitForKey();
    }
  }

  private async showPartyInBattle(state: any): Promise<void> {
    if (!this.player) return;
    
    Renderer.clear();
    Renderer.drawParty(this.player.party);
    await this.input.waitForKey();
  }

  private async showInventory(): Promise<void> {
    if (!this.player) return;
    
    const options: string[] = [];
    
    for (const item of this.player.inventory) {
      const itemData = itemsData.find(i => i.id === item.itemId);
      if (itemData) {
        options.push(`${itemData.name} x${item.quantity}`);
      }
    }
    
    if (options.length === 0) {
      Renderer.showMessage('背包是空的。');
      await this.input.waitForKey();
      return;
    }
    
    options.push('返回');
    
    Renderer.drawMenu('背包', options);
    await this.input.waitForKey();
  }

  private saveGame(slot: number): void {
    if (!this.player) return;
    
    if (SaveManager.save(this.player, slot)) {
      Renderer.showMessage('游戏已保存！');
    } else {
      Renderer.showMessage('保存失败！');
    }
  }
}

async function main(): Promise<void> {
  const game = new Game();
  await game.start();
}

main().catch(console.error);
