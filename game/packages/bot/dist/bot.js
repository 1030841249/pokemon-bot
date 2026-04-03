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
exports.PokemonBot = void 0;
const icqq_1 = require("icqq");
const readline = __importStar(require("readline"));
const fs = __importStar(require("fs"));
const session_1 = require("./session");
const pokemon_1 = require("./core/pokemon");
class PokemonBot {
    constructor(config) {
        this.isReady = false;
        this.config = {
            triggerPrefix: '!',
            admins: [],
            groups: [],
            ...config
        };
        this.client = new icqq_1.Client({
            platform: 3, // 使用 Watch 协议 (3) 支持扫码登录
            log_level: 'info'
        });
        this.sessionManager = new session_1.SessionManager('./saves');
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        this.setupEventHandlers();
    }
    setupEventHandlers() {
        this.client.on('system.online', () => {
            console.log('');
            console.log('✅ 机器人已上线！');
            console.log('');
            this.isReady = true;
        });
        this.client.on('system.offline', (data) => {
            console.log('');
            console.log('❌ 机器人已离线:', data.message);
            this.isReady = false;
        });
        this.client.on('system.login.slider', (event) => {
            console.log('');
            console.log('==========================================');
            console.log('        需要完成滑块验证');
            console.log('==========================================');
            console.log('');
            console.log('请按以下步骤操作：');
            console.log('');
            console.log('1. 复制下面的链接，在浏览器中打开');
            console.log('2. 完成滑块验证');
            console.log('3. 验证成功后，页面会显示一串字符（ticket）');
            console.log('4. 创建 ticket.txt 文件，将 ticket 写入文件');
            console.log('   命令: echo "your_ticket" > ticket.txt');
            console.log('');
            console.log('验证链接：');
            console.log(event.url);
            console.log('');
            console.log('等待 ticket.txt 文件...');
            // 轮询检查 ticket.txt 文件
            const checkInterval = setInterval(() => {
                try {
                    if (fs.existsSync('ticket.txt')) {
                        const ticket = fs.readFileSync('ticket.txt', 'utf-8').trim();
                        if (ticket) {
                            clearInterval(checkInterval);
                            console.log('检测到 ticket:', ticket.substring(0, 20) + '...');
                            console.log('正在提交验证...');
                            fs.unlinkSync('ticket.txt'); // 删除文件
                            try {
                                this.client.submitSlider(ticket);
                                console.log('ticket 已提交，等待服务器响应...');
                            }
                            catch (err) {
                                console.error('提交 ticket 失败:', err);
                            }
                        }
                    }
                }
                catch (error) {
                    console.error('读取 ticket 文件失败:', error);
                }
            }, 1000);
        });
        this.client.on('system.login.device', (event) => {
            console.log('');
            console.log('==========================================');
            console.log('        需要完成设备验证');
            console.log('==========================================');
            console.log('');
            console.log('请按以下步骤操作：');
            console.log('');
            console.log('1. 用手机QQ扫描下方二维码');
            console.log('   或访问链接进行验证');
            console.log('2. 验证成功后创建 device.txt 文件');
            console.log('   命令: touch device.txt');
            console.log('');
            console.log('验证链接：');
            console.log(event.url);
            console.log('');
            console.log('等待 device.txt 文件...');
            // 轮询检查 device.txt 文件
            const checkInterval = setInterval(() => {
                try {
                    if (fs.existsSync('device.txt')) {
                        clearInterval(checkInterval);
                        console.log('检测到验证完成，继续登录...');
                        fs.unlinkSync('device.txt'); // 删除文件
                    }
                }
                catch (error) {
                    console.error('读取 device 文件失败:', error);
                }
            }, 1000);
        });
        this.client.on('system.login.error', (data) => {
            console.log('');
            console.log('==========================================');
            console.log('        登录失败');
            console.log('==========================================');
            console.log('');
            console.log('错误信息:', data.message);
            console.log('');
            console.log('可能的原因：');
            console.log('1. QQ号或密码错误');
            console.log('2. 账号被限制登录');
            console.log('3. 需要先在手机QQ上登录一次');
            console.log('4. 滑块验证ticket错误或过期');
            console.log('');
            process.exit(1);
        });
        // 监听登录相关事件
        this.client.on('internal.verbose', (verbose) => {
            console.log('[icqq]', verbose);
        });
        // 二维码处理
        let qrcodeCheckInterval = null;
        this.client.on('system.login.qrcode', (event) => {
            console.log('');
            console.log('==========================================');
            console.log('        需要扫描二维码登录');
            console.log('==========================================');
            console.log('');
            console.log('请按以下步骤操作：');
            console.log('');
            console.log('1. 保存二维码图片到本地');
            console.log('2. 使用手机QQ扫描二维码');
            console.log('3. 在手机上确认登录');
            console.log('4. 创建 qrcode.txt 文件通知机器人');
            console.log('   命令: touch qrcode.txt');
            console.log('');
            console.log('⚠️  二维码有效期约2分钟，过期会自动刷新');
            console.log('');
            // 保存二维码图片
            const qrcodePath = './qrcode.png';
            fs.writeFileSync(qrcodePath, event.image);
            console.log(`二维码已保存到: ${qrcodePath}`);
            console.log('请立即下载并用手机QQ扫描！');
            console.log('');
            console.log('等待扫码完成...');
            // 清除之前的定时器
            if (qrcodeCheckInterval) {
                clearInterval(qrcodeCheckInterval);
            }
            // 轮询检查 qrcode.txt 文件
            qrcodeCheckInterval = setInterval(() => {
                try {
                    if (fs.existsSync('qrcode.txt')) {
                        clearInterval(qrcodeCheckInterval);
                        qrcodeCheckInterval = null;
                        console.log('检测到扫码完成，正在登录...');
                        fs.unlinkSync('qrcode.txt');
                        if (fs.existsSync(qrcodePath)) {
                            fs.unlinkSync(qrcodePath);
                        }
                        // 调用二维码登录
                        this.client.qrcodeLogin().catch((err) => {
                            console.error('二维码登录失败:', err);
                        });
                    }
                }
                catch (error) {
                    console.error('读取 qrcode 文件失败:', error);
                }
            }, 1000);
        });
        // 二维码刷新事件
        this.client.on('internal.error.qrcode', (code, message) => {
            console.log(`二维码状态: ${code} - ${message}`);
            if (code === 1) {
                console.log('二维码已过期，正在获取新的二维码...');
                // 清除旧的定时器
                if (qrcodeCheckInterval) {
                    clearInterval(qrcodeCheckInterval);
                    qrcodeCheckInterval = null;
                }
                // 删除旧的二维码文件
                try {
                    if (fs.existsSync('./qrcode.png')) {
                        fs.unlinkSync('./qrcode.png');
                    }
                }
                catch (e) { }
            }
        });
        this.client.on('message', (event) => {
            this.handleMessage(event);
        });
        this.client.on('request.friend.add', (event) => {
            event.approve(true);
            console.log(`已同意好友请求: ${event.user_id}`);
        });
        this.client.on('request.group.invite', (event) => {
            if (this.config.admins?.includes(event.user_id)) {
                event.approve(true);
                console.log(`已同意入群邀请: ${event.group_id}`);
            }
        });
    }
    async handleMessage(event) {
        const message = event.toString().trim();
        const userId = event.user_id;
        const groupId = event.group_id;
        const isGroup = !!groupId;
        if (!message.startsWith(this.config.triggerPrefix)) {
            return;
        }
        const content = message.slice(this.config.triggerPrefix.length).trim();
        if (isGroup) {
            if (this.config.groups && this.config.groups.length > 0) {
                if (!this.config.groups.includes(groupId)) {
                    return;
                }
            }
        }
        const response = await this.processGameInput(userId, content, groupId);
        if (isGroup) {
            await event.reply(response, true);
        }
        else {
            await event.reply(response);
        }
    }
    async processGameInput(userId, message, groupId) {
        const userIdStr = userId.toString();
        const groupIdStr = groupId?.toString();
        if (message === '开始' || message === '游戏' || message === '菜单') {
            return this.sessionManager.handleInput(userIdStr, '', groupIdStr);
        }
        if (message === '帮助' || message === 'help') {
            return this.getHelpMessage();
        }
        if (message === '状态') {
            return this.getStatusMessage(userIdStr, groupIdStr);
        }
        return this.sessionManager.handleInput(userIdStr, message, groupIdStr);
    }
    getHelpMessage() {
        return `╔════════════════════════╗
║     宝可梦文字冒险     ║
╠════════════════════════╣
║ 指令列表:              ║
║ !开始 - 开始游戏       ║
║ !状态 - 查看状态       ║
║ !帮助 - 显示帮助       ║
╠════════════════════════╣
║ 游戏中直接输入数字选择 ║
╚════════════════════════╝`;
    }
    getStatusMessage(userId, groupId) {
        const player = this.sessionManager.loadPlayer(userId, groupId);
        if (!player) {
            return '你还没有开始游戏！\n发送 !开始 开始冒险吧！';
        }
        const pokemon = player.party[0];
        const pokemonName = pokemon ? pokemon_1.PokemonManager.getPokemonName(pokemon) : '无';
        return `╔════════════════════════╗
║      玩家状态          ║
╠════════════════════════╣
║ 名字: ${player.name}
║ 徽章: ${player.badges}
║ 金钱: ${player.money}
║ 队伍: ${player.party.length}/6
║ 首发: ${pokemonName} Lv.${pokemon?.level || 0}
╚════════════════════════╝`;
    }
    async start() {
        console.log('');
        console.log('==========================================');
        console.log('        正在登录 QQ...');
        console.log('==========================================');
        console.log('');
        console.log(`QQ号: ${this.config.qq}`);
        console.log('登录方式: 扫码登录 (Watch协议)');
        console.log('');
        // 使用扫码登录，不需要密码
        await this.client.login();
    }
    async stop() {
        console.log('正在停止机器人...');
        this.rl.close();
        this.client.logout();
    }
}
exports.PokemonBot = PokemonBot;
