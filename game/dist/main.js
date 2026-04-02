"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pokemon_1 = require("./core/pokemon");
const player_1 = require("./core/player");
const battle_1 = require("./core/battle");
const renderer_1 = require("./ui/renderer");
const input_1 = require("./ui/input");
const save_1 = require("./systems/save");
const maps_json_1 = __importDefault(require("./data/maps.json"));
const items_json_1 = __importDefault(require("./data/items.json"));
const locations = maps_json_1.default;
class Game {
    constructor() {
        this.player = null;
        this.running = false;
        this.input = new input_1.InputHandler();
    }
    async start() {
        this.running = true;
        renderer_1.Renderer.clear();
        renderer_1.Renderer.drawTitle();
        await this.input.waitForKey();
        while (this.running) {
            await this.showMainMenu();
        }
        this.input.close();
    }
    async showMainMenu() {
        renderer_1.Renderer.clear();
        const saves = save_1.SaveManager.getAllSaves();
        const options = ['新游戏'];
        for (const save of saves) {
            if (save.info) {
                options.push(`继续游戏 - ${save.info.name} (徽章: ${save.info.badges})`);
            }
            else {
                options.push(`存档 ${save.slot} - 空`);
            }
        }
        options.push('退出');
        renderer_1.Renderer.drawMenu('宝可梦文字冒险', options);
        const choice = await this.input.getMenuChoice(options.length);
        if (choice === 0 || choice === options.length) {
            this.running = false;
            return;
        }
        if (choice === 1) {
            await this.newGame();
        }
        else {
            const slot = choice - 1;
            const saveInfo = save_1.SaveManager.getSaveInfo(slot);
            if (saveInfo) {
                this.player = save_1.SaveManager.load(slot);
                if (this.player) {
                    await this.gameLoop(slot);
                }
            }
            else {
                renderer_1.Renderer.showMessage('这个存档是空的！');
                await this.input.waitForKey();
            }
        }
    }
    async newGame() {
        renderer_1.Renderer.clear();
        renderer_1.Renderer.drawStarterSelection();
        const choice = await this.input.getMenuChoice(3);
        if (choice === 0)
            return;
        const name = await this.input.getText('请输入你的名字');
        this.player = player_1.PlayerManager.createPlayer(name || '训练家', choice - 1);
        renderer_1.Renderer.clear();
        renderer_1.Renderer.showMessage(`欢迎，${this.player.name}！你获得了 ${pokemon_1.PokemonManager.getPokemonName(this.player.party[0])}！`);
        await this.input.waitForKey();
        await this.gameLoop(1);
    }
    async gameLoop(saveSlot) {
        while (this.running && this.player) {
            await this.showLocationMenu(saveSlot);
        }
    }
    async showLocationMenu(saveSlot) {
        if (!this.player)
            return;
        const location = locations.find(l => l.id === this.player.currentLocation);
        if (!location) {
            renderer_1.Renderer.showMessage('错误：未知位置');
            await this.input.waitForKey();
            return;
        }
        renderer_1.Renderer.clear();
        renderer_1.Renderer.drawLocation(location.name, location.description);
        const options = ['探索', '移动', '队伍', '背包', '存档', '返回主菜单'];
        renderer_1.Renderer.drawMenu('选择行动', options);
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
    async explore(location, saveSlot) {
        if (!this.player)
            return;
        if (location.wildPokemon.length === 0) {
            renderer_1.Renderer.showMessage('这里没有野生宝可梦...');
            await this.input.waitForKey();
            return;
        }
        if (Math.random() < 0.3) {
            const encounter = this.selectWildEncounter(location.wildPokemon);
            if (encounter) {
                await this.wildBattle(encounter, saveSlot);
            }
        }
        else {
            renderer_1.Renderer.showMessage('你在草丛中探索，但没有发现宝可梦。');
            await this.input.waitForKey();
        }
    }
    selectWildEncounter(encounters) {
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
    async wildBattle(encounter, saveSlot) {
        if (!this.player)
            return;
        const playerPokemon = player_1.PlayerManager.getFirstHealthyPokemon(this.player);
        if (!playerPokemon) {
            renderer_1.Renderer.showMessage('你没有可以战斗的宝可梦！');
            await this.input.waitForKey();
            return;
        }
        const level = encounter.minLevel + Math.floor(Math.random() * (encounter.maxLevel - encounter.minLevel + 1));
        const enemyPokemon = pokemon_1.PokemonManager.createPokemon(encounter.pokemonId, level);
        if (!enemyPokemon)
            return;
        renderer_1.Renderer.clear();
        renderer_1.Renderer.drawWildBattleStart(enemyPokemon);
        await this.input.waitForKey();
        const state = battle_1.BattleEngine.createBattle(playerPokemon, enemyPokemon, 'wild');
        while (!state.isOver) {
            renderer_1.Renderer.clear();
            renderer_1.Renderer.drawBattle(state);
            renderer_1.Renderer.drawBattleMenu(state.playerPokemon);
            const choice = await this.input.getMenuChoice(4);
            let playerAction;
            switch (choice) {
                case 1:
                    renderer_1.Renderer.clear();
                    renderer_1.Renderer.drawMoveMenu(state.playerPokemon);
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
                            renderer_1.Renderer.drawCatchAttempt(ballResult.shakes, true);
                            await this.input.waitForKey();
                            player_1.PlayerManager.addPokemon(this.player, state.enemyPokemon);
                            renderer_1.Renderer.showMessage(`${pokemon_1.PokemonManager.getPokemonName(state.enemyPokemon)} 被捕捉了！`);
                            await this.input.waitForKey();
                            return;
                        }
                        else {
                            renderer_1.Renderer.drawCatchAttempt(ballResult.shakes, false);
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
            const enemyAction = battle_1.BattleEngine.getEnemyAction(state);
            battle_1.BattleEngine.executeTurn(state, playerAction, enemyAction);
            renderer_1.Renderer.clear();
            renderer_1.Renderer.showBattleLog(state.log);
            await this.input.waitForKey();
        }
        if (state.winner === 'player') {
            const exp = battle_1.BattleEngine.getExpReward(state);
            renderer_1.Renderer.showMessage(`战斗胜利！获得了 ${exp} 经验值！`);
            await this.input.waitForKey();
            player_1.PlayerManager.gainExpToParty(this.player, exp, [0]);
        }
        else {
            renderer_1.Renderer.showMessage('战斗失败...');
            await this.input.waitForKey();
        }
        this.syncPlayerPokemon(state);
        this.saveGame(saveSlot);
    }
    async useItem(itemId, state) {
        if (!this.player)
            return null;
        if (!player_1.PlayerManager.hasItem(this.player, itemId)) {
            renderer_1.Renderer.showMessage('你没有这个道具！');
            await this.input.waitForKey();
            return null;
        }
        const item = items_json_1.default.find(i => i.id === itemId);
        if (!item)
            return null;
        if (item.type === 'ball' && item.catchRate !== undefined) {
            player_1.PlayerManager.removeItem(this.player, itemId);
            return battle_1.BattleEngine.canCatch(state, item.catchRate);
        }
        return null;
    }
    syncPlayerPokemon(state) {
        if (!this.player)
            return;
        const index = this.player.party.findIndex(p => pokemon_1.PokemonManager.getPokemonName(p) === pokemon_1.PokemonManager.getPokemonName(state.playerPokemon));
        if (index >= 0) {
            this.player.party[index] = state.playerPokemon;
        }
    }
    async move(location) {
        if (!this.player)
            return;
        if (location.connections.length === 0) {
            renderer_1.Renderer.showMessage('这里没有可以移动的地方。');
            await this.input.waitForKey();
            return;
        }
        const options = [];
        for (const connId of location.connections) {
            const conn = locations.find(l => l.id === connId);
            if (conn) {
                options.push(conn.name);
            }
        }
        options.push('取消');
        renderer_1.Renderer.drawMenu('选择目的地', options);
        const choice = await this.input.getMenuChoice(options.length);
        if (choice > 0 && choice <= location.connections.length) {
            this.player.currentLocation = location.connections[choice - 1];
            renderer_1.Renderer.showMessage('移动成功！');
            await this.input.waitForKey();
        }
    }
    async showParty() {
        if (!this.player)
            return;
        renderer_1.Renderer.clear();
        renderer_1.Renderer.drawParty(this.player.party);
        await this.input.waitForKey();
        const choice = await this.input.getMenuChoice(this.player.party.length);
        if (choice > 0 && choice <= this.player.party.length) {
            renderer_1.Renderer.clear();
            renderer_1.Renderer.drawPokemonStatus(this.player.party[choice - 1]);
            await this.input.waitForKey();
        }
    }
    async showPartyInBattle(state) {
        if (!this.player)
            return;
        renderer_1.Renderer.clear();
        renderer_1.Renderer.drawParty(this.player.party);
        await this.input.waitForKey();
    }
    async showInventory() {
        if (!this.player)
            return;
        const options = [];
        for (const item of this.player.inventory) {
            const itemData = items_json_1.default.find(i => i.id === item.itemId);
            if (itemData) {
                options.push(`${itemData.name} x${item.quantity}`);
            }
        }
        if (options.length === 0) {
            renderer_1.Renderer.showMessage('背包是空的。');
            await this.input.waitForKey();
            return;
        }
        options.push('返回');
        renderer_1.Renderer.drawMenu('背包', options);
        await this.input.waitForKey();
    }
    saveGame(slot) {
        if (!this.player)
            return;
        if (save_1.SaveManager.save(this.player, slot)) {
            renderer_1.Renderer.showMessage('游戏已保存！');
        }
        else {
            renderer_1.Renderer.showMessage('保存失败！');
        }
    }
}
async function main() {
    const game = new Game();
    await game.start();
}
main().catch(console.error);
//# sourceMappingURL=main.js.map