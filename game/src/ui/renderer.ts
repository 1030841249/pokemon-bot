import { BattleState, PokemonInstance } from '../core/types';
import { PokemonManager } from '../core/pokemon';

export class Renderer {
  private static readonly WIDTH = 40;
  private static readonly BOX_CHAR = {
    topLeft: '╔', topRight: '╗',
    bottomLeft: '╚', bottomRight: '╝',
    horizontal: '═', vertical: '║'
  };

  static clear(): void {
    console.clear();
  }

  static drawBox(title: string, content: string[]): void {
    const lines: string[] = [];
    
    lines.push(this.BOX_CHAR.topLeft + this.BOX_CHAR.horizontal.repeat(this.WIDTH - 2) + this.BOX_CHAR.topRight);
    
    if (title) {
      lines.push(this.formatLine(title, 'center'));
      lines.push(this.BOX_CHAR.vertical + this.BOX_CHAR.horizontal.repeat(this.WIDTH - 2) + this.BOX_CHAR.vertical);
    }
    
    for (const line of content) {
      lines.push(this.formatLine(line));
    }
    
    lines.push(this.BOX_CHAR.bottomLeft + this.BOX_CHAR.horizontal.repeat(this.WIDTH - 2) + this.BOX_CHAR.bottomRight);
    
    console.log(lines.join('\n'));
  }

  private static formatLine(text: string, align: 'left' | 'center' | 'right' = 'left'): string {
    const innerWidth = this.WIDTH - 2;
    const padding = innerWidth - this.getDisplayWidth(text);
    
    let formatted: string;
    if (align === 'center') {
      const leftPad = Math.floor(padding / 2);
      const rightPad = padding - leftPad;
      formatted = ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
    } else if (align === 'right') {
      formatted = ' '.repeat(padding) + text;
    } else {
      formatted = text + ' '.repeat(padding);
    }
    
    return this.BOX_CHAR.vertical + formatted + this.BOX_CHAR.vertical;
  }

  private static getDisplayWidth(text: string): number {
    let width = 0;
    for (const char of text) {
      width += char.charCodeAt(0) > 127 ? 2 : 1;
    }
    return width;
  }

  static drawMenu(title: string, options: string[]): void {
    const content: string[] = [''];
    
    for (let i = 0; i < options.length; i++) {
      content.push(`  [${i + 1}] ${options[i]}`);
    }
    
    content.push('');
    this.drawBox(title, content);
  }

  static drawBattle(state: BattleState): void {
    const content: string[] = [];
    
    const enemyName = PokemonManager.getPokemonName(state.enemyPokemon);
    const enemyHp = state.enemyPokemon.currentHp;
    const enemyMaxHp = state.enemyPokemon.stats.hp;
    const enemyBar = PokemonManager.getHpBar(enemyHp, enemyMaxHp);
    
    content.push(`  敌方: ${enemyName} Lv.${state.enemyPokemon.level}`);
    content.push(`  HP: ${enemyBar} ${enemyHp}/${enemyMaxHp}`);
    content.push('');
    content.push(this.BOX_CHAR.horizontal.repeat(this.WIDTH - 2));
    content.push('');
    
    const playerName = PokemonManager.getPokemonName(state.playerPokemon);
    const playerHp = state.playerPokemon.currentHp;
    const playerMaxHp = state.playerPokemon.stats.hp;
    const playerBar = PokemonManager.getHpBar(playerHp, playerMaxHp);
    
    content.push(`  我方: ${playerName} Lv.${state.playerPokemon.level}`);
    content.push(`  HP: ${playerBar} ${playerHp}/${playerMaxHp}`);
    content.push('');
    
    this.drawBox('战斗', content);
  }

  static drawBattleMenu(pokemon: PokemonInstance): void {
    const content: string[] = [''];
    content.push('  [1] 攻击    [2] 道具');
    content.push('  [3] 宝可梦  [4] 逃跑');
    content.push('');
    
    this.drawBox('选择行动', content);
  }

  static drawMoveMenu(pokemon: PokemonInstance): void {
    const content: string[] = [''];
    
    const moves = pokemon.moves.map(m => {
      const moveData = require('../data/moves.json').find((md: any) => md.id === m.moveId);
      return moveData ? `${moveData.name} (${m.currentPp}/${moveData.pp})` : '未知';
    });
    
    for (let i = 0; i < 4; i++) {
      if (i < moves.length) {
        content.push(`  [${i + 1}] ${moves[i]}`);
      } else {
        content.push(`  [${i + 1}] -`);
      }
    }
    content.push('');
    content.push('  [0] 返回');
    content.push('');
    
    this.drawBox('选择技能', content);
  }

  static drawPokemonStatus(pokemon: PokemonInstance): void {
    const name = PokemonManager.getPokemonName(pokemon);
    const base = PokemonManager.getPokemonBase(pokemon.baseId);
    const types = base?.types.join('/') || '未知';
    const hpBar = PokemonManager.getHpBar(pokemon.currentHp, pokemon.stats.hp);
    
    const content: string[] = [''];
    content.push(`  名字: ${name}`);
    content.push(`  等级: ${pokemon.level}`);
    content.push(`  属性: ${types}`);
    content.push('');
    content.push(`  HP: ${hpBar} ${pokemon.currentHp}/${pokemon.stats.hp}`);
    content.push('');
    content.push(`  攻击: ${pokemon.stats.attack}  防御: ${pokemon.stats.defense}`);
    content.push(`  特攻: ${pokemon.stats.spAttack}  特防: ${pokemon.stats.spDefense}`);
    content.push(`  速度: ${pokemon.stats.speed}`);
    content.push('');
    
    this.drawBox('宝可梦状态', content);
  }

  static drawParty(pokemons: PokemonInstance[]): void {
    const content: string[] = [''];
    
    for (let i = 0; i < pokemons.length; i++) {
      const pokemon = pokemons[i];
      const name = PokemonManager.getPokemonName(pokemon);
      const hpBar = PokemonManager.getHpBar(pokemon.currentHp, pokemon.stats.hp);
      const status = PokemonManager.isFainted(pokemon) ? ' [濒死]' : '';
      
      content.push(`  [${i + 1}] ${name} Lv.${pokemon.level}`);
      content.push(`      HP: ${hpBar} ${pokemon.currentHp}/${pokemon.stats.hp}${status}`);
      content.push('');
    }
    
    this.drawBox('队伍', content);
  }

  static showMessage(message: string): void {
    this.drawBox('', ['', '  ' + message, '']);
  }

  static showBattleLog(log: { turn: number; message: string }[]): void {
    const content: string[] = [''];
    const recentLog = log.slice(-5);
    
    for (const entry of recentLog) {
      content.push(`  ${entry.message}`);
    }
    content.push('');
    
    this.drawBox('战斗记录', content);
  }

  static drawTitle(): void {
    const title = `
╔════════════════════════════════════════╗
║                                        ║
║        宝 可 梦 文 字 冒 险            ║
║                                        ║
║          Pokemon Text Adventure        ║
║                                        ║
╚════════════════════════════════════════╝
`;
    console.log(title);
  }

  static drawStarterSelection(): void {
    const content: string[] = [''];
    content.push('  请选择你的初始宝可梦:');
    content.push('');
    content.push('  [1] 小火龙 (火属性)');
    content.push('  [2] 杰尼龟 (水属性)');
    content.push('  [3] 妙蛙种子 (草属性)');
    content.push('');
    
    this.drawBox('选择初始宝可梦', content);
  }

  static drawLocation(name: string, description: string): void {
    const content: string[] = [''];
    content.push(`  当前位置: ${name}`);
    content.push('');
    content.push(`  ${description}`);
    content.push('');
    
    this.drawBox('地图', content);
  }

  static drawWildBattleStart(pokemon: PokemonInstance): void {
    const name = PokemonManager.getPokemonName(pokemon);
    const content: string[] = [''];
    content.push(`  野生的 ${name} 出现了！`);
    content.push(`  等级: ${pokemon.level}`);
    content.push('');
    
    this.drawBox('遭遇野生宝可梦', content);
  }

  static drawCatchAttempt(shakes: number, success: boolean): void {
    const content: string[] = [''];
    
    for (let i = 0; i < 3; i++) {
      if (i < shakes) {
        content.push('  * 晃动...');
      }
    }
    
    if (success) {
      content.push('');
      content.push('  捕捉成功！');
    } else {
      content.push('');
      content.push('  捕捉失败...');
    }
    content.push('');
    
    this.drawBox('捕捉', content);
  }
}
