"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const bot_1 = require("./bot");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const CONFIG_FILE = path.join(__dirname, '../config.json');
function loadConfig() {
    if (!fs.existsSync(CONFIG_FILE)) {
        const template = {
            qq: 123456789,
            password: "your_password",
            admins: [123456789],
            groups: [],
            triggerPrefix: "!"
        };
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(template, null, 2));
        console.log('已创建配置文件 config.json，请修改后重新启动');
        console.log('');
        console.log('配置说明:');
        console.log('  qq: 机器人QQ号');
        console.log('  password: 机器人QQ密码');
        console.log('  admins: 管理员QQ号列表');
        console.log('  groups: 允许使用的群号列表(留空则所有群可用)');
        console.log('  triggerPrefix: 触发前缀，默认为 !');
        process.exit(0);
    }
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
}
async function main() {
    console.log('╔════════════════════════╗');
    console.log('║   宝可梦文字冒险Bot    ║');
    console.log('║     Pokemon Bot        ║');
    console.log('╚════════════════════════╝');
    console.log('');
    const config = loadConfig();
    if (config.qq === 123456789) {
        console.log('请先修改 config.json 中的QQ号和密码！');
        process.exit(1);
    }
    const bot = new bot_1.PokemonBot(config);
    process.on('SIGINT', async () => {
        console.log('\n正在关闭...');
        await bot.stop();
        process.exit(0);
    });
    process.on('SIGTERM', async () => {
        await bot.stop();
        process.exit(0);
    });
    await bot.start();
}
main().catch((error) => {
    console.error('启动失败:', error);
    process.exit(1);
});
