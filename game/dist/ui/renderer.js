"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Renderer = void 0;
const pokemon_1 = require("../core/pokemon");
class Renderer {
    static clear() {
        console.clear();
    }
    static drawBox(title, content) {
        const lines = [];
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
    static formatLine(text, align = 'left') {
        const innerWidth = this.WIDTH - 2;
        const displayWidth = this.getDisplayWidth(text);
        let truncatedText = text;
        if (displayWidth > innerWidth) {
            truncatedText = this.truncateText(text, innerWidth);
        }
        const padding = Math.max(0, innerWidth - this.getDisplayWidth(truncatedText));
        let formatted;
        if (align === 'center') {
            const leftPad = Math.floor(padding / 2);
            const rightPad = padding - leftPad;
            formatted = ' '.repeat(leftPad) + truncatedText + ' '.repeat(rightPad);
        }
        else if (align === 'right') {
            formatted = ' '.repeat(padding) + truncatedText;
        }
        else {
            formatted = truncatedText + ' '.repeat(padding);
        }
        return this.BOX_CHAR.vertical + formatted + this.BOX_CHAR.vertical;
    }
    static getDisplayWidth(text) {
        let width = 0;
        for (const char of text) {
            width += char.charCodeAt(0) > 127 ? 2 : 1;
        }
        return width;
    }
    static truncateText(text, maxWidth) {
        let result = '';
        let width = 0;
        for (const char of text) {
            const charWidth = char.charCodeAt(0) > 127 ? 2 : 1;
            if (width + charWidth > maxWidth - 2) {
                result += '..';
                break;
            }
            result += char;
            width += charWidth;
        }
        return result;
    }
    static drawMenu(title, options) {
        const content = [''];
        for (let i = 0; i < options.length; i++) {
            content.push(`  [${i + 1}] ${options[i]}`);
        }
        content.push('');
        this.drawBox(title, content);
    }
    static drawBattle(state) {
        const enemyName = pokemon_1.PokemonManager.getPokemonName(state.enemyPokemon);
        const enemyHp = state.enemyPokemon.currentHp;
        const enemyMaxHp = state.enemyPokemon.stats.hp;
        const playerName = pokemon_1.PokemonManager.getPokemonName(state.playerPokemon);
        const playerHp = state.playerPokemon.currentHp;
        const playerMaxHp = state.playerPokemon.stats.hp;
        const enemyStatusText = this.getStatusEffectText(state.enemyPokemon);
        const playerStatusText = this.getStatusEffectText(state.playerPokemon);
        console.log('');
        console.log('═════════════════════════════════');
        console.log(`  ${enemyName}  Lv.${state.enemyPokemon.level}${enemyStatusText}`);
        console.log(`  HP: ${enemyHp}/${enemyMaxHp}`);
        if (state.enemyPokemon.ability) {
            console.log(`  特性: ${state.enemyPokemon.ability}`);
        }
        console.log('───────────────────────────────');
        console.log(`  vs`);
        console.log('───────────────────────────────');
        console.log(`  ${playerName}  Lv.${state.playerPokemon.level}${playerStatusText}`);
        console.log(`  HP: ${playerHp}/${playerMaxHp}`);
        if (state.playerPokemon.ability) {
            console.log(`  特性: ${state.playerPokemon.ability}`);
        }
        console.log('═════════════════════════════════');
        console.log('');
    }
    static getStatusEffectText(pokemon) {
        if (!pokemon.statusEffects || pokemon.statusEffects.length === 0)
            return '';
        const statusNames = {
            poison: '【中毒】',
            burn: '【烧伤】',
            freeze: '【冰冻】',
            paralysis: '【麻痹】',
            sleep: '【睡眠】'
        };
        return pokemon.statusEffects.map(s => statusNames[s] || '').join('');
    }
    static drawBattleMenu() {
        console.log('[1] 攻击   [2] 捕捉');
        console.log('[3] 队伍   [4] 逃跑');
        console.log('');
    }
    static drawMoveMenu(pokemon) {
        const moves = pokemon.moves.map(m => {
            const moveData = require('../data/moves.json').find((md) => md.id === m.moveId);
            return moveData ? `${moveData.name}` : '未知';
        });
        console.log('选择技能:');
        for (let i = 0; i < 4; i++) {
            if (i < moves.length) {
                console.log(`  [${i + 1}] ${moves[i]}`);
            }
        }
        console.log('  [0] 返回');
        console.log('');
    }
    static drawPokemonStatus(pokemon) {
        const name = pokemon_1.PokemonManager.getPokemonName(pokemon);
        const base = pokemon_1.PokemonManager.getPokemonBase(pokemon.baseId);
        const types = base?.types.join('/') || '未知';
        console.log('');
        console.log(`${name} Lv.${pokemon.level}`);
        console.log(`属性: ${types}`);
        console.log(`HP: ${pokemon.currentHp}/${pokemon.stats.hp}`);
        console.log(`攻:${pokemon.stats.attack} 防:${pokemon.stats.defense}`);
        console.log(`特攻:${pokemon.stats.spAttack} 特防:${pokemon.stats.spDefense}`);
        console.log(`速度:${pokemon.stats.speed}`);
        console.log('');
    }
    static drawParty(pokemons) {
        console.log('');
        console.log('─── 队伍 ───');
        for (let i = 0; i < pokemons.length; i++) {
            const pokemon = pokemons[i];
            const name = pokemon_1.PokemonManager.getPokemonName(pokemon);
            const status = pokemon_1.PokemonManager.isFainted(pokemon) ? '(濒死)' : '';
            console.log(`${i + 1}. ${name} Lv.${pokemon.level} HP:${pokemon.currentHp}/${pokemon.stats.hp} ${status}`);
        }
        console.log('');
    }
    static showMessage(message) {
        console.log('');
        console.log(message);
        console.log('');
    }
    static showBattleLog(log) {
        const recentLog = log.slice(-3);
        for (const entry of recentLog) {
            console.log(entry.message);
        }
        console.log('');
    }
    static drawTitle() {
        console.log('');
        console.log('╔══════════════════════════════╗');
        console.log('║     宝可梦文字冒险          ║');
        console.log('║     Pokemon Adventure       ║');
        console.log('╚══════════════════════════════╝');
        console.log('');
    }
    static drawStarterSelection() {
        console.log('选择你的初始宝可梦:');
        console.log('[1] 小火龙 (火)');
        console.log('[2] 杰尼龟 (水)');
        console.log('[3] 妙蛙种子 (草)');
        console.log('');
    }
    static drawLocation(name, description) {
        console.log('');
        console.log(`─── ${name} ───`);
        console.log(description);
        console.log('');
    }
    static drawWildBattleStart(pokemon) {
        const name = pokemon_1.PokemonManager.getPokemonName(pokemon);
        console.log('');
        console.log(`⚠ 野生的 ${name}(Lv.${pokemon.level}) 出现了！`);
        console.log('');
    }
    static drawCatchAttempt(shakes, success) {
        if (success) {
            console.log(`✓ 捕捉成功！摇晃了${shakes}次`);
        }
        else {
            console.log(`✗ 捕捉失败！摇晃了${shakes}次`);
        }
        console.log('');
    }
    static showContinuePrompt() {
        process.stdout.write('按回车键继续...');
    }
}
exports.Renderer = Renderer;
Renderer.WIDTH = 40;
Renderer.BOX_CHAR = {
    topLeft: '╔', topRight: '╗',
    bottomLeft: '╚', bottomRight: '╝',
    horizontal: '═', vertical: '║'
};
//# sourceMappingURL=renderer.js.map