import { Client } from 'icqq';
import * as readline from 'readline';
import { SessionManager } from './session';
import { PokemonManager } from './core/pokemon';

interface BotConfig {
  qq: number;
  password: string;
  admins?: number[];
  groups?: number[];
  triggerPrefix?: string;
}

class PokemonBot {
  private client: Client;
  private sessionManager: SessionManager;
  private config: BotConfig;
  private isReady: boolean = false;
  private rl: readline.Interface;

  constructor(config: BotConfig) {
    this.config = {
      triggerPrefix: '!',
      admins: [],
      groups: [],
      ...config
    };
    
    this.client = new Client({ 
      platform: 1,
      log_level: 'info'
    });
    
    this.sessionManager = new SessionManager('./saves');
    
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.on('system.online', () => {
      console.log('');
      console.log('✅ 机器人已上线！');
      console.log('');
      this.isReady = true;
    });

    this.client.on('system.offline', (data: any) => {
      console.log('');
      console.log('❌ 机器人已离线:', data.message);
      this.isReady = false;
    });

    this.client.on('system.login.slider', (event: { url: string }) => {
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
      console.log('4. 将 ticket 粘贴到此处按回车');
      console.log('');
      console.log('验证链接：');
      console.log(event.url);
      console.log('');
      
      this.rl.question('请输入 ticket: ', (ticket) => {
        if (ticket.trim()) {
          console.log('正在提交验证...');
          this.client.submitSlider(ticket.trim());
        } else {
          console.log('ticket 不能为空，请重新运行程序');
          process.exit(1);
        }
      });
    });

    this.client.on('system.login.device', (event: { url: string; phone: string }) => {
      console.log('');
      console.log('==========================================');
      console.log('        需要完成设备验证');
      console.log('==========================================');
      console.log('');
      console.log('请按以下步骤操作：');
      console.log('');
      console.log('1. 用手机QQ扫描下方二维码');
      console.log('   或访问链接进行验证');
      console.log('2. 验证成功后在此按回车继续');
      console.log('');
      console.log('验证链接：');
      console.log(event.url);
      console.log('');
      
      this.rl.question('验证完成后按回车继续: ', () => {
        console.log('正在继续登录...');
      });
    });

    this.client.on('system.login.error', (data: any) => {
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

    this.client.on('message', (event: any) => {
      this.handleMessage(event);
    });

    this.client.on('request.friend.add', (event: any) => {
      event.approve(true);
      console.log(`已同意好友请求: ${event.user_id}`);
    });

    this.client.on('request.group.invite', (event: any) => {
      if (this.config.admins?.includes(event.user_id)) {
        event.approve(true);
        console.log(`已同意入群邀请: ${event.group_id}`);
      }
    });
  }

  private async handleMessage(event: any): Promise<void> {
    const message = event.toString().trim();
    const userId = event.user_id;
    const groupId = event.group_id;
    const isGroup = !!groupId;

    if (!message.startsWith(this.config.triggerPrefix!)) {
      return;
    }

    const content = message.slice(this.config.triggerPrefix!.length).trim();

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
    } else {
      await event.reply(response);
    }
  }

  private async processGameInput(userId: number, message: string, groupId?: number): Promise<string> {
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

  private getHelpMessage(): string {
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

  private getStatusMessage(userId: string, groupId?: string): string {
    const player = this.sessionManager.loadPlayer(userId, groupId);
    
    if (!player) {
      return '你还没有开始游戏！\n发送 !开始 开始冒险吧！';
    }

    const pokemon = player.party[0];
    const pokemonName = pokemon ? PokemonManager.getPokemonName(pokemon) : '无';
    
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

  async start(): Promise<void> {
    console.log('');
    console.log('==========================================');
    console.log('        正在登录 QQ...');
    console.log('==========================================');
    console.log('');
    console.log(`QQ号: ${this.config.qq}`);
    console.log('');
    
    await this.client.login(this.config.qq, this.config.password);
  }

  async stop(): Promise<void> {
    console.log('正在停止机器人...');
    this.rl.close();
    this.client.logout();
  }
}

export { PokemonBot };
export type { BotConfig };
