import { Player, Location, WildEncounter, BattleAction, PokemonInstance } from './core/types';
import { PokemonManager } from './core/pokemon';
import { PlayerManager } from './core/player';
import { BattleEngine } from './core/battle';
import { Renderer } from './ui/renderer';
import { InputHandler } from './ui/input';
import { SaveManager } from './systems/save';
import mapsData from './data/maps.json';
import itemsData from './data/items.json';

const locations = mapsData as Location[];

interface RandomEvent {
  type: 'wild' | 'item' | 'npc' | 'trainer' | 'rare' | 'money' | 'heal' | 'nothing';
  message: string;
  reward?: any;
}

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
    console.log('[1] 新游戏');
    console.log('[2] 继续游戏');
    console.log('[3] 退出');
    console.log('');
    
    const choice = await this.input.getMenuChoice(3);
    
    if (choice === 3 || choice === 0) {
      this.running = false;
      return;
    }
    
    if (choice === 1) {
      await this.newGame();
    } else {
      const saveInfo = SaveManager.getSaveInfo(1);
      if (saveInfo) {
        this.player = SaveManager.load(1);
        if (this.player) {
          await this.gameLoop(1);
        }
      } else {
        console.log('没有找到存档！');
        await this.input.waitForKey();
      }
    }
  }

  private async newGame(): Promise<void> {
    console.log('');
    console.log('选择初始宝可梦:');
    console.log('[1] 小火龙 → 火恐龙 → 喷火龙');
    console.log('[2] 杰尼龟 → 卡咪龟 → 水箭龟');
    console.log('[3] 妙蛙种子 → 妙蛙草 → 妙蛙花');
    console.log('');
    
    const choice = await this.input.getMenuChoice(3);
    if (choice === 0) return;
    
    const name = await this.input.getText('输入名字');
    
    this.player = PlayerManager.createPlayer(name || '训练家', choice - 1);
    
    const starter = this.player.party[0];
    const chain = PokemonManager.getEvolutionChain(starter.baseId);
    
    console.log('');
    console.log(`欢迎 ${name}！`);
    console.log(`你获得了 ${PokemonManager.getPokemonName(starter)}！`);
    console.log(`进化路线: ${chain.join(' → ')}`);
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
      this.player.currentLocation = 'pallet-town';
    }
    
    const currentLoc = locations.find(l => l.id === this.player!.currentLocation)!;
    
    console.log('');
    console.log(`═══ ${currentLoc.name} ═══`);
    console.log(currentLoc.description);
    console.log('');
    
    const lead = this.player.party[0];
    const expInfo = PokemonManager.getExpToNextLevel(lead);
    const pcCount = PlayerManager.getPcCount(this.player);
    console.log(`队伍: ${PokemonManager.getPokemonName(lead)} Lv.${lead.level} | PC: ${pcCount}只`);
    console.log(`经验: ${expInfo.progress}% | 金钱: $${this.player.money}`);
    console.log('');
    
    console.log('[1] 探索    [2] 移动    [3] 队伍');
    console.log('[4] 背包    [5] 存档    [6] 电脑(PC)');
    
    let extraOption = 7;
    if (currentLoc.hasCenter) {
      console.log(`[${extraOption}] 宝可梦中心`);
      extraOption++;
    }
    if (currentLoc.hasShop) {
      console.log(`[${extraOption}] 商店`);
      extraOption++;
    }
    console.log(`[0] 返回主菜单`);
    console.log('');
    
    const choice = await this.input.getMenuChoice(extraOption);
    
    switch (choice) {
      case 0:
        this.player = null;
        break;
      case 1:
        await this.explore(currentLoc, saveSlot);
        break;
      case 2:
        await this.move(currentLoc, saveSlot);
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
        await this.managePC();
        break;
      default:
        let subChoice = choice;
        if (currentLoc.hasCenter && subChoice === 7) {
          await this.pokemonCenter();
        } else if (currentLoc.hasShop) {
          if (!currentLoc.hasCenter && subChoice === 7) {
            await this.openShop(currentLoc.shopItems || [1, 10]);
          } else if (currentLoc.hasCenter && subChoice === 8) {
            await this.openShop(currentLoc.shopItems || [1, 10]);
          }
        }
        break;
    }
  }

  private async managePC(): Promise<void> {
    if (!this.player) return;
    
    while (true) {
      console.log('');
      const pcLines = PlayerManager.viewPC(this.player);
      for (const line of pcLines) {
        console.log(line);
      }
      console.log('');
      console.log('[1] 取出宝可梦    [2] 存入宝可梦    [3] 释放宝可梦');
      console.log('[0] 返回');
      console.log('');
      
      const choice = await this.input.getMenuChoice(3);
      
      if (choice === 0) return;
      
      if (choice === 1) {
        if (this.player.party.length >= 6) {
          console.log('队伍已满！请先存入一只。');
          await this.input.waitForKey();
          continue;
        }
        
        const pcCount = PlayerManager.getPcCount(this.player);
        if (pcCount === 0) {
          console.log('电脑中没有宝可梦。');
          await this.input.waitForKey();
          continue;
        }
        
        console.log('');
        console.log('选择要取出的盒子 (输入0取消):');
        
        let targetBox = -1;
        for (let i = 0; i < this.player.pc.length; i++) {
          if (this.player.pc[i].length > 0) {
            console.log(`  [${i + 1}] 盒子${i + 1}: ${this.player.pc[i].length}只`);
          }
        }
        console.log('  [0] 取消');
        
        const boxChoice = await this.input.getMenuChoice(this.player.pc.length);
        if (boxChoice === 0) continue;
        
        const box = this.player.pc[boxChoice - 1];
        if (!box || box.length === 0) {
          console.log('这个盒子是空的。');
          await this.input.waitForKey();
          continue;
        }
        
        console.log(`\n盒子${boxChoice} 的宝可梦:`);
        for (let j = 0; j < box.length; j++) {
          const p = box[j];
          console.log(`  [${j + 1}] ${PokemonManager.getPokemonName(p)} Lv.${p.level}`);
        }
        console.log('  [0] 取消');
        
        const pokeChoice = await this.input.getMenuChoice(box.length);
        if (pokeChoice === 0) continue;
        
        const result = PlayerManager.withdrawFromPC(this.player, boxChoice - 1, pokeChoice - 1);
        console.log(result.message);
        await this.input.waitForKey();
      }
      
      if (choice === 2) {
        if (this.player.party.length <= 1) {
          console.log('至少保留一只宝可梦在队伍中！');
          await this.input.waitForKey();
          continue;
        }
        
        console.log('');
        console.log('选择要存入的宝可梦:');
        for (let i = 0; i < this.player.party.length; i++) {
          const p = this.player.party[i];
          console.log(`  [${i + 1}] ${PokemonManager.getPokemonName(p)} Lv.${p.level}`);
        }
        console.log('  [0] 取消');
        
        const partyChoice = await this.input.getMenuChoice(this.player.party.length);
        if (partyChoice === 0) continue;
        
        const result = PlayerManager.depositToPC(this.player, partyChoice - 1);
        console.log(result.message);
        await this.input.waitForKey();
      }
      
      if (choice === 3) {
        const pcCount = PlayerManager.getPcCount(this.player);
        if (pcCount === 0 && this.player.party.length <= 1) {
          console.log('没有可释放的宝可梦。');
          await this.input.waitForKey();
          continue;
        }
        
        console.log('');
        console.log('⚠ 释放宝可梦 ⚠');
        console.log('释放后的宝可梦将永远无法找回！');
        console.log('');
        
        let allPokemon: { source: 'party' | 'pc'; boxIndex?: number; pokeIndex: number; pokemon: PokemonInstance }[] = [];
        
        for (let i = 0; i < this.player.party.length; i++) {
          allPokemon.push({ source: 'party', pokeIndex: i, pokemon: this.player.party[i] });
        }
        
        for (let i = 0; i < this.player.pc.length; i++) {
          for (let j = 0; j < this.player.pc[i].length; j++) {
            allPokemon.push({ source: 'pc', boxIndex: i, pokeIndex: j, pokemon: this.player.pc[i][j] });
          }
        }
        
        console.log('选择要释放的宝可梦:');
        for (let i = 0; i < allPokemon.length; i++) {
          const entry = allPokemon[i];
          const name = PokemonManager.getPokemonName(entry.pokemon);
          const location = entry.source === 'party' ? '[队伍]' : `[盒子${(entry.boxIndex || 0) + 1}]`;
          console.log(`  [${i + 1}] ${name} Lv.${entry.pokemon.level} ${location}`);
        }
        console.log('  [0] 取消');
        console.log('');
        
        const releaseChoice = await this.input.getMenuChoice(allPokemon.length);
        if (releaseChoice === 0) continue;
        
        const target = allPokemon[releaseChoice - 1];
        const targetName = PokemonManager.getPokemonName(target.pokemon);
        
        console.log(`\n确定要释放 ${targetName} 吗？`);
        console.log('[1] 确认释放    [0] 取消');
        console.log('');
        
        const confirmChoice = await this.input.getMenuChoice(1);
        if (confirmChoice === 0) continue;
        
        if (target.source === 'party') {
          if (this.player.party.length <= 1) {
            console.log('不能释放队伍中最后一只宝可梦！');
            await this.input.waitForKey();
            continue;
          }
          this.player.party.splice(target.pokeIndex, 1);
        } else {
          if (target.boxIndex !== undefined) {
            this.player.pc[target.boxIndex].splice(target.pokeIndex, 1);
          }
        }
        
        console.log(`${targetName} 被释放了... 再见，${targetName}！`);
        await this.input.waitForKey();
      }
    }
  }

  private generateRandomEvent(location: Location): RandomEvent {
    const roll = Math.random() * 100;
    
    if (roll < 35) {
      return { type: 'wild', message: '' };
    }
    if (roll < 42) {
      const items = [
        { id: 10, name: '伤药', qty: Math.floor(Math.random() * 3) + 1 },
        { id: 1, name: '精灵球', qty: Math.floor(Math.random() * 2) + 1 },
        { id: 11, name: '好伤药', qty: 1 }
      ];
      const item = items[Math.floor(Math.random() * items.length)];
      return { type: 'item', message: `你在草丛中发现了 ${item.qty} 个${item.name}！`, reward: item };
    }
    if (roll < 48) {
      const npcs = [
        '一位路过的训练家向你点头致意',
        '你遇到了一个友善的村民',
        '一个小孩跑过来说"加油哦！"',
        '一位老者给了你一些忠告'
      ];
      return { type: 'npc', message: npcs[Math.floor(Math.random() * npcs.length)] };
    }
    if (roll < 55) {
      return { type: 'trainer', message: '野生训练家出现了！' };
    }
    if (roll < 57) {
      return { type: 'rare', message: '空气中弥漫着神秘的气息...' };
    }
    if (roll < 63) {
      const amount = Math.floor(Math.random() * 200) + 50;
      return { type: 'money', message: `你捡到了 $${amount}！`, reward: amount };
    }
    if (roll < 67) {
      return { type: 'heal', message: '一阵微风吹过，你的宝可梦感到精神焕发！' };
    }
    
    return { type: 'nothing', message: '什么也没有发生...' };
  }

  private async explore(location: Location, saveSlot: number): Promise<void> {
    if (!this.player) return;
    
    if (location.wildPokemon.length === 0) {
      console.log('这里没有野生宝可梦...');
      await this.input.waitForKey();
      return;
    }
    
    const event = this.generateRandomEvent(location);
    
    switch (event.type) {
      case 'wild':
        await this.handleWildEncounter(location, saveSlot);
        break;
      case 'item':
        console.log(event.message);
        PlayerManager.addItem(this.player, event.reward.id, event.reward.qty);
        await this.input.waitForKey();
        break;
      case 'npc':
        console.log(event.message);
        await this.input.waitForKey();
        break;
      case 'trainer':
        await this.handleTrainerBattle(location, saveSlot);
        break;
      case 'rare':
        await this.handleRareEncounter(location, saveSlot);
        break;
      case 'money':
        console.log(event.message);
        PlayerManager.addMoney(this.player, event.reward);
        await this.input.waitForKey();
        break;
      case 'heal':
        console.log(event.message);
        PlayerManager.healAllPokemon(this.player);
        await this.input.waitForKey();
        break;
      default:
        console.log(event.message);
        await this.input.waitForKey();
    }
  }

  private async handleWildEncounter(location: Location, saveSlot: number): Promise<void> {
    if (!this.player) return;

    const minTier = location.minTier || 1;
    const maxTier = location.maxTier || 2;

    const rareCheck = PokemonManager.getRareEncounter(minTier * 2);
    let enemyPokemon = rareCheck || PokemonManager.getRandomWildPokemon(minTier, maxTier);

    if (!enemyPokemon) {
      console.log('什么也没发现...');
      await this.input.waitForKey();
      return;
    }

    const isRare = !!rareCheck;
    await this.wildBattle(enemyPokemon, saveSlot, isRare);
  }

  private async handleTrainerBattle(location: Location, saveSlot: number): Promise<void> {
    if (!this.player) return;

    const minTier = location.minTier || 1;
    const maxTier = location.maxTier || 2;
    const enemyPokemon = PokemonManager.getRandomWildPokemon(minTier, maxTier);

    if (!enemyPokemon) return;

    console.log('野生训练家出现了！');
    await this.input.waitForKey();

    await this.trainerBattle(enemyPokemon, saveSlot);
  }

  private async handleRareEncounter(location: Location, saveSlot: number): Promise<void> {
    if (!this.player) return;

    const minTier = location.minTier || 1;
    const rarePokemon = PokemonManager.getRareEncounter(minTier * 2);

    if (!rarePokemon) {
      console.log('神秘气息消失了...');
      await this.input.waitForKey();
      return;
    }

    console.log('');
    console.log('⚠ ⚠ ⚠ 稀有宝可梦出现！ ⚠ ⚠ ⚠');
    console.log('');
    await this.input.waitForKey();

    await this.wildBattle(rarePokemon, saveSlot, true);
  }

  private async wildBattle(enemyPokemon: any, saveSlot: number, isRare: boolean = false): Promise<void> {
    if (!this.player) return;
    
    const playerPokemon = PlayerManager.getFirstHealthyPokemon(this.player);
    if (!playerPokemon) {
      console.log('你没有可以战斗的宝可梦！');
      await this.input.waitForKey();
      return;
    }
    
    Renderer.drawWildBattleStart(enemyPokemon);
    if (isRare) {
      console.log('★★★ 这是稀有的传说宝可梦！ ★★★');
    }
    await this.input.waitForKey();
    
    const state = BattleEngine.createBattle(playerPokemon, enemyPokemon, 'wild', this.player.party);
    
    while (!state.isOver) {
      Renderer.drawBattle(state);
      Renderer.drawBattleMenu();
      
      const choice = await this.input.getMenuChoice(4);
      
      let playerAction: BattleAction;
      
      switch (choice) {
        case 1:
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
            Renderer.drawCatchAttempt(ballResult.shakes, ballResult.success);
            await this.input.waitForKey();
            
            if (ballResult.success) {
              const result = PlayerManager.addPokemon(this.player, state.enemyPokemon);
              console.log(`${PokemonManager.getPokemonName(state.enemyPokemon)} 被捕捉了！`);
              console.log(result.message);
              if (isRare) {
                console.log('★ 恭喜！捕捉到稀有宝可梦！★');
              }
              await this.input.waitForKey();
              return;
            }
          }
          playerAction = { type: 'wait' };
          break;
        case 3:
          const aliveCount = this.player.party.filter(p => !PokemonManager.isFainted(p)).length;
          if (aliveCount <= 1) {
            console.log('没有可切换的宝可梦！');
            await this.input.waitForKey();
            continue;
          }
          console.log('切换宝可梦:');
          for (let i = 0; i < this.player.party.length; i++) {
            const p = this.player.party[i];
            const fainted = PokemonManager.isFainted(p) ? '(濒死)' : '';
            const current = p === state.playerPokemon ? ' ← 当前' : '';
            console.log(`  [${i + 1}] ${PokemonManager.getPokemonName(p)} Lv.${p.level} HP:${p.currentHp}/${p.stats.hp}${fainted}${current}`);
          }
          console.log('  [0] 取消');
          const switchChoice = await this.input.getMenuChoice(this.player.party.length);
          if (switchChoice === 0) continue;
          const switchTarget = this.player.party[switchChoice - 1];
          if (switchTarget === state.playerPokemon) {
            console.log('已经在场上了！');
            await this.input.waitForKey();
            continue;
          }
          if (PokemonManager.isFainted(switchTarget)) {
            console.log('这只宝可梦已经濒死了！');
            await this.input.waitForKey();
            continue;
          }
          playerAction = { type: 'switch', pokemonIndex: switchChoice - 1 };
          break;
        case 4:
          playerAction = { type: 'run' };
          break;
        default:
          continue;
      }
      
      const enemyAction = BattleEngine.getEnemyAction(state);
      const result = BattleEngine.executeTurn(state, playerAction, enemyAction);
      
      for (const msg of result.messages) {
        console.log(msg);
      }
      
      if (state.playerPokemon.currentHp <= 0 && BattleEngine.hasAlivePartyMember(state)) {
        console.log(`${PokemonManager.getPokemonName(state.playerPokemon)} 倒下了...`);
        console.log('');
        console.log('选择下一只宝可梦:');
        const aliveParty = this.player.party.filter(p => !PokemonManager.isFainted(p));
        for (let i = 0; i < aliveParty.length; i++) {
          const p = aliveParty[i];
          console.log(`  [${i + 1}] ${PokemonManager.getPokemonName(p)} Lv.${p.level} HP:${p.currentHp}/${p.stats.hp}`);
        }
        console.log('  [0] 逃跑');
        console.log('');
        
        const switchChoice = await this.input.getMenuChoice(aliveParty.length);
        if (switchChoice === 0) {
          state.isOver = true;
          state.winner = 'enemy';
          console.log('你逃跑了...');
          await this.input.waitForKey();
          break;
        }
        
        const newPokemon = aliveParty[switchChoice - 1];
        const oldName = PokemonManager.getPokemonName(state.playerPokemon);
        const newName = PokemonManager.getPokemonName(newPokemon);
        state.playerPokemon = newPokemon;
        console.log(`去吧！${newName}！`);
        await this.input.waitForKey();
        continue;
      }
      
      if (result.isOver && state.winner === 'player') {
        console.log(`${PokemonManager.getPokemonName(state.enemyPokemon)} 被击败了！`);
      } else if (result.isOver && state.winner === 'enemy') {
        console.log(`${PokemonManager.getPokemonName(state.playerPokemon)} 倒下了...`);
      }
      
      await this.input.waitForKey();
    }
    
    if (state.winner === 'player') {
      const aliveParty = this.player.party.filter(p => !PokemonManager.isFainted(p));
      const exp = BattleEngine.getExpReward(state);
      
      console.log(`战斗胜利！获得 ${exp} 经验值`);
      
      for (const p of aliveParty) {
        const gainResult = PokemonManager.gainExp(p, Math.floor(exp / aliveParty.length));
        for (const msg of gainResult.messages) {
          console.log(msg);
        }
      }
      
      const moneyReward = Math.floor(Math.random() * 100) + 20;
      PlayerManager.addMoney(this.player, moneyReward);
      console.log(`获得 $${moneyReward}`);
      
      await this.input.waitForKey();
      
      this.syncPlayerPokemon(state);
      this.saveGame(saveSlot);
    } else {
      console.log('战斗失败...');
      await this.input.waitForKey();
    }
  }

  private async trainerBattle(enemyPokemon: any, saveSlot: number): Promise<void> {
    if (!this.player) return;
    
    const playerPokemon = PlayerManager.getFirstHealthyPokemon(this.player);
    if (!playerPokemon) return;

    const state = BattleEngine.createBattle(playerPokemon, enemyPokemon, 'trainer', this.player.party);
    
    while (!state.isOver) {
      Renderer.drawBattle(state);
      Renderer.drawBattleMenu();
      
      const choice = await this.input.getMenuChoice(4);
      
      let playerAction: BattleAction;
      
      switch (choice) {
        case 1:
          Renderer.drawMoveMenu(state.playerPokemon);
          const moveChoice = await this.input.getMenuChoice(4);
          if (moveChoice === 0 || moveChoice > state.playerPokemon.moves.length) continue;
          playerAction = { type: 'attack', moveId: state.playerPokemon.moves[moveChoice - 1].moveId };
          break;
        case 2:
          const aliveCount = this.player.party.filter(p => !PokemonManager.isFainted(p)).length;
          if (aliveCount <= 1) {
            console.log('没有可切换的宝可梦！');
            await this.input.waitForKey();
            continue;
          }
          console.log('切换宝可梦:');
          for (let i = 0; i < this.player.party.length; i++) {
            const p = this.player.party[i];
            const fainted = PokemonManager.isFainted(p) ? '(濒死)' : '';
            const current = p === state.playerPokemon ? ' ← 当前' : '';
            console.log(`  [${i + 1}] ${PokemonManager.getPokemonName(p)} Lv.${p.level} HP:${p.currentHp}/${p.stats.hp}${fainted}${current}`);
          }
          console.log('  [0] 取消');
          const switchChoice = await this.input.getMenuChoice(this.player.party.length);
          if (switchChoice === 0) continue;
          const switchTarget = this.player.party[switchChoice - 1];
          if (switchTarget === state.playerPokemon) {
            console.log('已经在场上了！');
            await this.input.waitForKey();
            continue;
          }
          if (PokemonManager.isFainted(switchTarget)) {
            console.log('这只宝可梦已经濒死了！');
            await this.input.waitForKey();
            continue;
          }
          playerAction = { type: 'switch', pokemonIndex: switchChoice - 1 };
          break;
        case 3:
        case 4:
          console.log('训练家战中不能逃跑！');
          await this.input.waitForKey();
          continue;
        default:
          continue;
      }
      
      const enemyAction = BattleEngine.getEnemyAction(state);
      const result = BattleEngine.executeTurn(state, playerAction, enemyAction);
      
      for (const msg of result.messages) {
        console.log(msg);
      }
      
      if (state.playerPokemon.currentHp <= 0 && BattleEngine.hasAlivePartyMember(state)) {
        console.log(`${PokemonManager.getPokemonName(state.playerPokemon)} 倒下了...`);
        console.log('');
        console.log('选择下一只宝可梦:');
        const aliveParty = this.player.party.filter(p => !PokemonManager.isFainted(p));
        for (let i = 0; i < aliveParty.length; i++) {
          const p = aliveParty[i];
          console.log(`  [${i + 1}] ${PokemonManager.getPokemonName(p)} Lv.${p.level} HP:${p.currentHp}/${p.stats.hp}`);
        }
        console.log('');
        
        const nextChoice = await this.input.getMenuChoice(aliveParty.length);
        if (nextChoice === 0) {
          state.isOver = true;
          state.winner = 'enemy';
          break;
        }
        
        const newPokemon = aliveParty[nextChoice - 1];
        const newName = PokemonManager.getPokemonName(newPokemon);
        state.playerPokemon = newPokemon;
        console.log(`去吧！${newName}！`);
        await this.input.waitForKey();
        continue;
      }
      
      if (result.isOver && state.winner === 'player') {
        console.log(`击败了训练家的 ${PokemonManager.getPokemonName(state.enemyPokemon)}！`);
      }
      
      await this.input.waitForKey();
    }
    
    if (state.winner === 'player') {
      const aliveParty = this.player.party.filter(p => !PokemonManager.isFainted(p));
      const exp = Math.floor(BattleEngine.getExpReward(state) * 1.5);
      console.log(`训练家战胜利！获得 ${exp} 经验值`);
      
      for (const p of aliveParty) {
        const gainResult = PokemonManager.gainExp(p, Math.floor(exp / aliveParty.length));
        for (const msg of gainResult.messages) {
          console.log(msg);
        }
      }
      
      const moneyReward = Math.floor(Math.random() * 300) + 100;
      PlayerManager.addMoney(this.player, moneyReward);
      console.log(`获得 $${moneyReward}`);
      
      await this.input.waitForKey();
      this.syncPlayerPokemon(state);
      this.saveGame(saveSlot);
    }
  }

  private async useItem(itemId: number, state: any): Promise<{ success: boolean; shakes: number } | null> {
    if (!this.player) return null;
    
    if (!PlayerManager.hasItem(this.player, itemId)) {
      console.log('你没有精灵球了！');
      await this.input.waitForKey();
      return null;
    }
    
    PlayerManager.removeItem(this.player, itemId);
    return BattleEngine.canCatch(state, 1.0);
  }

  private syncPlayerPokemon(state: any): void {
    if (!this.player) return;
    
    const index = this.player.party.findIndex(p => 
      p.baseId === state.playerPokemon.baseId
    );
    
    if (index >= 0) {
      this.player.party[index] = state.playerPokemon;
    }
  }

  private async move(location: Location, saveSlot: number): Promise<void> {
    if (!this.player) return;
    
    if (location.connections.length === 0) {
      console.log('这里没有可以移动的地方。');
      await this.input.waitForKey();
      return;
    }
    
    console.log('选择目的地:');
    for (let i = 0; i < location.connections.length; i++) {
      const conn = locations.find(l => l.id === location.connections[i]);
      if (conn) {
        console.log(`[${i + 1}] ${conn.name}`);
      }
    }
    console.log('[0] 取消');
    console.log('');
    
    const choice = await this.input.getMenuChoice(location.connections.length);
    
    if (choice > 0 && choice <= location.connections.length) {
      this.player.currentLocation = location.connections[choice - 1];
      const targetLoc = locations.find(l => l.id === this.player!.currentLocation);
      console.log(`移动中...`);
      
      const roll = Math.random();
      if (roll < 0.3) {
        const events = ['路上很安静...', '阳光明媚的一天', '风吹过草地'];
        console.log(events[Math.floor(Math.random() * events.length)]);
      } else if (roll < 0.6) {
        const locData = locations.find(l => l.id === this.player!.currentLocation);
        if (locData?.wildPokemon && locData.wildPokemon.length > 0) {
          console.log('移动途中遭遇了野生宝可梦！');
          await this.input.waitForKey();
          await this.handleWildEncounter(locData!, saveSlot);
          return;
        }
      }
      
      console.log(`到达了 ${targetLoc?.name}`);
      await this.input.waitForKey();
    }
  }

  private async pokemonCenter(): Promise<void> {
    if (!this.player) return;
    
    console.log('');
    console.log('═══ 宝可梦中心 ═══');
    console.log('"欢迎光临！需要恢复宝可梦吗？"');
    console.log('');
    
    const needsHealing = this.player.party.some(p => 
      p.currentHp < p.stats.hp || p.statusEffects.length > 0
    );
    
    if (!needsHealing) {
      console.log('你的宝可梦都很健康。');
      await this.input.waitForKey();
      return;
    }
    
    console.log('恢复中...');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    PlayerManager.healAllPokemon(this.player);
    
    console.log('✓ 所有宝可梦已完全恢复！');
    for (let i = 0; i < this.player.party.length; i++) {
      const p = this.player.party[i];
      console.log(`  ${i+1}. ${PokemonManager.getPokemonName(p)} HP:${p.stats.hp}/${p.stats.hp}`);
    }
    console.log('');
    await this.input.waitForKey();
  }

  private async openShop(itemIds: number[]): Promise<void> {
    if (!this.player) return;
    
    const shopItems = itemIds.map(id => itemsData.find(i => i.id === id)).filter(Boolean);
    
    while (true) {
      console.log('');
      console.log('═══ 友好商店 ═══');
      console.log(`金钱: $${this.player.money}`);
      console.log('──────────────────');
      
      for (let i = 0; i < shopItems.length; i++) {
        const item = shopItems[i]!;
        console.log(`[${i + 1}] ${item.name} - $${item.price}`);
      }
      
      console.log('[0] 离开');
      console.log('');
      
      const choice = await this.input.getMenuChoice(shopItems.length);
      
      if (choice === 0) {
        console.log('欢迎下次光临！');
        await this.input.waitForKey();
        return;
      }
      
      const selectedItem = shopItems[choice - 1];
      if (!selectedItem) continue;
      
      console.log(`\n${selectedItem.name} | $${selectedItem.price}`);
      console.log(selectedItem.description);
      console.log(`余额: $${this.player.money}`);
      console.log('[1] x1  [5] x5  [10] x10  [0] 取消');
      
      const buyChoice = await this.input.getMenuChoice(3);
      if (buyChoice === 0) continue;
      
      const quantities: Record<number, number> = { 1: 1, 2: 5, 3: 10 };
      const qty = quantities[buyChoice] || 1;
      const totalCost = selectedItem.price * qty;
      
      if (totalCost > this.player.money) {
        console.log(`金钱不足！需要$${totalCost}`);
        await this.input.waitForKey();
        continue;
      }
      
      PlayerManager.removeMoney(this.player, totalCost);
      PlayerManager.addItem(this.player, selectedItem.id, qty);
      console.log(`购买成功！+${qty} ${selectedItem.name} | 剩余: $${this.player.money}`);
      await this.input.waitForKey();
    }
  }

  private async showParty(): Promise<void> {
    if (!this.player) return;

    console.log('');
    console.log('─── 队伍 ───');
    for (let i = 0; i < this.player.party.length; i++) {
      const p = this.player.party[i];
      const name = PokemonManager.getPokemonName(p);
      const status = PokemonManager.isFainted(p) ? '(濒死)' : '';
      const expInfo = PokemonManager.getExpToNextLevel(p);
      const evoInfo = PokemonManager.canEvolve(p);
      const evoText = evoInfo.can ? ` [可进化:${evoInfo.requirement}]` : '';
      
      const natureInfo = PokemonManager.getNatureInfo(p.nature);
      const natureText = natureInfo.plus ? ` 性格:${natureInfo.name}` : '';
      const abilityText = p.ability ? ` 特性:${p.ability}` : '';
      const ivRating = PokemonManager.getIVRating(p.ivs);
      const ivText = ` 个体:${ivRating}`;
      
      let statusEffectText = '';
      if (p.statusEffects.length > 0) {
        const statusNames: Record<string, string> = {
          poison: '中毒', burn: '烧伤', freeze: '冰冻',
          paralysis: '麻痹', sleep: '睡眠'
        };
        statusEffectText = ` [${p.statusEffects.map(s => statusNames[s] || s).join(',')}]`;
      }

      console.log(`${i + 1}. ${name} Lv.${p.level} HP:${p.currentHp}/${p.stats.hp}${status}${statusEffectText}`);
      console.log(`   EXP:${expInfo.progress}%${evoText}${natureText}${abilityText}`);
      console.log(`   ${ivText}`);

      const chain = PokemonManager.getEvolutionChain(p.baseId);
      if (chain.length > 1) {
        console.log(`   进化链: ${chain.join(' → ')}`);
      }
    }
    console.log('');
    console.log('[1] 交换位置    [0] 返回');
    const partyChoice = await this.input.getMenuChoice(1);
    
    if (partyChoice === 1 && this.player.party.length >= 2) {
      console.log('选择第一只宝可梦(编号):');
      const first = await this.input.getMenuChoice(this.player.party.length);
      if (first === 0) return;
      console.log('选择第二只宝可梦(编号):');
      const second = await this.input.getMenuChoice(this.player.party.length);
      if (second === 0 || second === first) return;
      
      const temp = this.player.party[first - 1];
      this.player.party[first - 1] = this.player.party[second - 1];
      this.player.party[second - 1] = temp;
      console.log('交换成功！');
      await this.input.waitForKey();
    }
  }

  private async showInventory(): Promise<void> {
    if (!this.player) return;
    
    while (true) {
      console.log('');
      console.log('═══ 背包 ═══');
      
      if (this.player.inventory.length === 0) {
        console.log('（空无一物）');
        await this.input.waitForKey();
        return;
      }
      
      const usableItems = this.player.inventory.filter(item => {
        const data = itemsData.find(i => i.id === item.itemId);
        return data && data.type === 'medicine';
      });
      
      console.log(`[使用道具]`);
      for (let i = 0; i < usableItems.length; i++) {
        const item = usableItems[i];
        const data = itemsData.find(d => d.id === item.itemId)!;
        console.log(`  [${i + 1}] ${data.name} x${item.quantity} - ${data.description}`);
      }
      
      if (usableItems.length === 0) {
        console.log('（没有可使用的道具）');
      }
      
      console.log('');
      console.log('[0] 返回');
      console.log('');
      
      if (usableItems.length === 0) {
        await this.input.waitForKey();
        return;
      }
      
      const choice = await this.input.getMenuChoice(usableItems.length);
      
      if (choice === 0) return;
      
      const selectedItem = usableItems[choice - 1];
      const itemData = itemsData.find(i => i.id === selectedItem.itemId);
      if (!itemData) continue;
      
      console.log(`\n── ${itemData.name} ──`);
      console.log(itemData.description);
      console.log('');
      
      const targetablePokemon = this.player.party.filter(p => {
        if (itemData.revive) return PokemonManager.isFainted(p);
        if (itemData.healHp) return !PokemonManager.isFainted(p) && p.currentHp < p.stats.hp;
        if (itemData.cureStatus) return p.statusEffects.includes(itemData.cureStatus);
        return false;
      });
      
      if (targetablePokemon.length === 0) {
        let reason = '';
        if (itemData.revive) reason = '没有濒死的宝可梦';
        else if (itemData.healHp) reason = '所有宝可梦都是满血状态';
        else if (itemData.cureStatus) {
          const statusNames: Record<string, string> = { poison: '中毒', burn: '烧伤', paralysis: '麻痹', freeze: '冰冻', sleep: '睡眠' };
          reason = `没有${statusNames[itemData.cureStatus] || ''}状态的宝可梦`;
        }
        console.log(reason + '，无法使用。');
        await this.input.waitForKey();
        continue;
      }
      
      console.log('选择目标宝可梦:');
      for (let i = 0; i < targetablePokemon.length; i++) {
        const p = targetablePokemon[i];
        const name = PokemonManager.getPokemonName(p);
        const statusText = p.statusEffects.length > 0 ? ` [${p.statusEffects.join(',')}]` : '';
        console.log(`  [${i + 1}] ${name} Lv.${p.level} HP:${p.currentHp}/${p.stats.hp}${statusText}`);
      }
      console.log('  [0] 取消');
      console.log('');
      
      const targetChoice = await this.input.getMenuChoice(targetablePokemon.length);
      if (targetChoice === 0) continue;
      
      const target = targetablePokemon[targetChoice - 1];
      const targetName = PokemonManager.getPokemonName(target);
      
      PlayerManager.removeItem(this.player, itemData.id, 1);
      
      if (itemData.revive) {
        const healAmount = Math.floor(target.stats.hp / 2);
        target.currentHp = healAmount;
        target.statusEffects = [];
        console.log(`${targetName} 复活了！HP恢复到 ${healAmount}`);
      } else if (itemData.healHp) {
        const actualHeal = Math.min(itemData.healHp, target.stats.hp - target.currentHp);
        target.currentHp += actualHeal;
        console.log(`${targetName} 恢复了 ${actualHeal} HP！当前: ${target.currentHp}/${target.stats.hp}`);
      } else if (itemData.cureStatus) {
        target.statusEffects = target.statusEffects.filter(s => s !== itemData.cureStatus);
        const statusNames: Record<string, string> = { poison: '中毒', burn: '烧伤', paralysis: '麻痹', freeze: '冰冻', sleep: '睡眠' };
        console.log(`${targetName} 的${statusNames[itemData.cureStatus] || ''}被治愈了！`);
      }
      
      console.log('');
      await this.input.waitForKey();
    }
  }

  private saveGame(slot: number): void {
    if (!this.player) return;
    
    if (SaveManager.save(this.player, slot)) {
      console.log('游戏已保存！');
    } else {
      console.log('保存失败！');
    }
    console.log('');
  }
}

async function main(): Promise<void> {
  const game = new Game();
  await game.start();
}

main().catch(console.error);
