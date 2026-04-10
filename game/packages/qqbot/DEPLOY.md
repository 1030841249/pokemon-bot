# QQ机器人部署指南 (NoneBot2 + NapCat)

本文档介绍如何使用 NoneBot2 + NapCat 部署宝可梦文字冒险QQ机器人。

---

## 一、架构说明

```
┌─────────────┐     WebSocket     ┌─────────────┐
│   QQ客户端   │ ◄──────────────► │  NapCat      │
│ (手机/平板)  │                  │ (OneBot协议) │
└─────────────┘                  └──────┬───────┘
                                        │
                                  ┌──────▼───────┐
                                  │  NoneBot2     │
                                  │  (Python)     │
                                  └──────────────┘
```

---

## 二、服务器环境要求

| 项目 | 要求 |
|------|------|
| 系统 | Ubuntu 20.04+ / CentOS 7+ |
| Python | 3.10+ |
| Node.js | 18+ (用于运行NapCat) |
| 内存 | 1GB+ |

---

## 三、安装步骤

### 1. 安装 Python 环境

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Python 3.10+
sudo apt install -y python3.10 python3.10-venv python3-pip

# 创建虚拟环境（推荐）
python3.10 -m venv /opt/qqbot/venv
source /opt/qqbot/venv/bin/activate

# 验证
python --version  # 应显示 Python 3.10.x
```

### 2. 上传项目文件

将整个 `qqbot` 目录上传到服务器：

```bash
# 在本地执行
scp -r "/Users/a11/Desktop/game/Digital Monster/game/packages/qqbot" root@47.103.57.247:/opt/
```

### 3. 安装 Python 依赖

```bash
cd /opt/qqbot
source venv/bin/activate
pip install -r requirements.txt
```

### 4. 配置环境变量

```bash
nano .env
```

修改配置：
```env
HOST=0.0.0.0
PORT=8080

# NapCat WebSocket 地址
ONEBOT_WS_HOSTS=["ws://127.0.0.1:3001"]

# 管理员QQ号
SUPERUSERS=["你的QQ号"]

# 命令前缀
COMMAND_START=["!", "/"]
LOG_LEVEL=INFO
```

### 5. 安装并配置 NapCat

#### 方式A: 使用 Docker (推荐)

```bash
# 安装 Docker
curl -fsSL https://get.docker.com | sh

# 运行 NapCat
docker run -d \
  --name napcat \
  --restart always \
  -p 3000:3000 \
  -p 3001:3001 \
  -v /opt/napcat/config:/app/napcat/config \
  mlikiowa/napcat-docker:latest
```

#### 方式B: 直接安装

```bash
# 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 克隆 NapCat
cd /opt
git clone https://github.com/NapNeko/NapCat.git
cd NapCat

# 安装依赖并运行
npm install
npm start
```

#### NapCat 配置

在 NapCat 的 WebUI (`http://47.103.57.247:6099`) 中配置：
- 登录QQ账号
- 开启正向WebSocket: `ws://0.0.0.0:3001`
- 协议选择: iPad 或 aPad (推荐)

### 6. 启动 NoneBot2

```bash
cd /opt/qqbot
source venv/bin/activate

# 测试运行
python bot.py
```

### 7. 使用 PM2 管理 (推荐)

```bash
# 安装 PM2
npm install -g pm2

# 创建启动脚本
cat > start.sh << 'EOF'
#!/bin/bash
cd /opt/qqbot
source /opt/qqbot/venv/bin/activate
exec python bot.py
EOF
chmod +x start.sh

# 启动
pm2 start start.sh --name qqbot --interpreter none

# 查看状态
pm2 status
pm2 logs qqbot

# 设置开机自启
pm2 startup
pm2 save
```

---

## 四、目录结构

```
/opt/qqbot/
├── bot.py              # 入口文件
├── pyproject.toml      # 项目配置
├── requirements.txt    # Python依赖
├── .env                # 环境变量
├── data/               # 游戏数据
│   ├── pokemon.json
│   ├── moves.json
│   ├── items.json
│   ├── maps.json
│   └── typeChart.json
├── plugins/            # 插件
│   └── pokemon_game.py # 游戏插件
└── saves/              # 存档目录 (自动创建)
```

---

## 五、常用命令

```bash
# 查看日志
pm2 logs qqbot

# 重启
pm2 restart qqbot

# 停止
pm2 stop qqbot

# 查看状态
pm2 status

# 更新代码后重启
cd /opt/qqbot
git pull  # 或重新上传
pip install -r requirements.txt
pm2 restart qqbot
```

---

## 六、游戏指令

| 指令 | 说明 |
|------|------|
| `!开始` | 开始新游戏 |
| `!帮助` | 显示帮助信息 |
| `!状态` | 查看玩家状态 |

游戏中直接输入数字进行操作。

---

## 七、常见问题

### Q: NapCat 无法连接？
A: 确保 `.env` 中的 `ONEBOT_WS_HOSTS` 地址与 NapCat 监听地址一致。

### Q: 机器人不回复消息？
A: 
1. 检查 PM2 日志是否有错误
2. 确认 NapCat 已登录成功
3. 检查 SUPERUSERS 是否包含你的QQ号

### Q: 如何备份数据？
A: 定期备份 `/opt/qqbot/saves/` 目录。

### Q: 如何更新游戏内容？
A: 修改 `data/` 目录下的JSON文件，然后重启机器人。

---

## 八、安全建议

1. **使用小号**：不要使用主QQ号
2. **防火墙**：只开放必要端口 (8080, 3000, 3001)
3. **定期更新**：保持依赖最新版本
4. **监控日志**：定期检查异常行为
