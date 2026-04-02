# 宝可梦文字冒险 QQ机器人

一个基于 icqq 的宝可梦文字冒险游戏机器人，可以在QQ群中运行。

## 快速开始

### 本地运行

```bash
# 安装依赖
npm install

# 首次运行生成配置
npm run dev
# 按 Ctrl+C 停止

# 编辑配置文件
nano config.json

# 再次启动
npm run dev
```

### 服务器部署

```bash
# 一键部署
bash deploy.sh
```

详细部署文档请查看 [DEPLOY.md](./DEPLOY.md)

---

## 配置说明

编辑 `config.json`：

```json
{
  "qq": 123456789,           // 机器人QQ号
  "password": "password",    // 机器人QQ密码
  "admins": [123456789],     // 管理员QQ列表
  "groups": [12345678],      // 允许的群号(留空=所有群)
  "triggerPrefix": "!"       // 触发前缀
}
```

---

## 游戏指令

| 指令 | 说明 |
|------|------|
| `!开始` | 开始新游戏 |
| `!状态` | 查看当前状态 |
| `!帮助` | 显示帮助 |

---

## 功能列表

- ✅ 选择初始宝可梦（御三家）
- ✅ 野生宝可梦遭遇与战斗
- ✅ 属性克制系统
- ✅ 捕捉系统
- ✅ 多地图探索
- ✅ 存档系统
- ✅ 多用户独立存档
- ✅ 群聊/私聊支持

---

## 项目结构

```
packages/bot/
├── src/
│   ├── index.ts      # 入口
│   ├── bot.ts        # 机器人核心
│   ├── session.ts    # 会话管理
│   ├── core/         # 游戏核心
│   ├── data/         # 游戏数据
│   └── systems/      # 存档系统
├── config.json       # 配置文件
├── saves/            # 用户存档
├── deploy.sh         # 部署脚本
├── DEPLOY.md         # 部署文档
└── package.json
```

---

## 常用命令

```bash
# 开发
npm run dev

# 编译
npm run build

# 运行
npm start

# PM2 管理
pm2 status              # 状态
pm2 logs pokemon-bot    # 日志
pm2 restart pokemon-bot # 重启
pm2 stop pokemon-bot    # 停止
```

---

## 注意事项

1. **使用小号**：建议使用QQ小号运行，避免主号风险
2. **首次登录**：可能需要滑块验证
3. **icqq库**：第三方协议，请遵守相关条款
4. **数据备份**：定期备份 `saves` 目录

---

## 免责声明

本项目仅供学习交流使用，请勿用于商业用途。使用本机器人产生的任何后果由使用者自行承担。
