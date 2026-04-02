import { PokemonBot } from './bot';
import type { BotConfig } from './bot';
import * as fs from 'fs';
import * as path from 'path';

const CONFIG_FILE = path.join(__dirname, '../config.json');

function loadConfig(): BotConfig {
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

async function main(): Promise<void> {
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
  
  const bot = new PokemonBot(config);
  
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
