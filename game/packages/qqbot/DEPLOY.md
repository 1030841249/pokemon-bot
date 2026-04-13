# QQ机器人部署指南 (NoneBot2 + NapCat)

本文档介绍如何使用 NoneBot2 + NapCat 部署宝可梦文字冒险QQ机器人。

---

## 一、架构说明

```
┌─────────────┐                ┌─────────────┐
│   QQ客户端   │ ◄────────────► │  NapCat      │
│ (手机扫码)   │    OneBot11    │ (协议实现)   │
└─────────────┘                └──────┬───────┘
                                      │ WebSocket
                                ┌─────▼───────┐
                                │  NoneBot2    │
                                │  (游戏逻辑)  │
                                └─────────────┘
```

---

## 二、服务器环境要求

| 项目 | 最低要求 | 推荐配置 |
|------|---------|---------|
| 系统 | Ubuntu 20.04 / CentOS 7 | Ubuntu 22.04 |
| Python | 3.10+ | 3.11+ |
| Node.js | 18+ | 20+ |
| 内存 | 512MB | 1GB+ |
| 存储 | 1GB | 2GB+ |

---

## 三、完整部署步骤

### 步骤1: 准备服务器

```bash
# SSH连接服务器
ssh root@你的服务器IP

# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装基础工具
sudo apt install -y curl wget git vim
```

### 步骤2: 安装 Python 环境

```bash
# 安装 Python 3.10+ (Ubuntu 22.04 自带 Python 3.10)
sudo apt install -y python3 python3-pip python3-venv

# 验证版本
python3 --version  # 应显示 Python 3.10.x 或更高

# 创建项目目录
sudo mkdir -p /opt/pokemon-bot
sudo chown -R $USER:$USER /opt/pokemon-bot
```

### 步骤3: 上传项目文件

**方式A: 使用 scp 上传 (本地执行)**

```bash
# 在你的本地电脑执行
scp -r /Users/a11/Desktop/game/pokemon-bot/game/packages/qqbot root@你的服务器IP:/opt/pokemon-bot/

# 重命名为 qqbot
ssh root@你的服务器IP "mv /opt/pokemon-bot/qqbot /opt/pokemon-bot/qqbot_temp && mv /opt/pokemon-bot/qqbot_temp /opt/pokemon-bot/qqbot"
```

**方式B: 使用 git (服务器执行)**

```bash
cd /opt/pokemon-bot
git clone 你的仓库地址 qqbot
```

### 步骤4: 配置 Python 虚拟环境

```bash
cd /opt/pokemon-bot/qqbot

# 创建虚拟环境
python3 -m venv venv

# 激活虚拟环境
source venv/bin/activate

# 安装依赖
pip install --upgrade pip
pip install -r requirements.txt

# 验证安装
pip list | grep nonebot
# 应显示 nonebot2 和 nonebot-adapter-onebot
```

### 步骤5: 配置环境变量

```bash
cd /opt/pokemon-bot/qqbot

# 创建 .env 文件
cat > .env << 'EOF'
HOST=0.0.0.0
PORT=8080

# NapCat WebSocket 地址 (正向WS)
ONEBOT_WS_HOSTS=["ws://127.0.0.1:3001"]

# 管理员QQ号 (改成你的QQ号)
SUPERUSERS=["123456789"]

# 命令前缀
COMMAND_START=["!", "/"]

# 日志级别
LOG_LEVEL=INFO

# 昵称 (机器人名字)
NICKNAME=["宝可梦机器人"]
EOF

# 检查文件
cat .env
```

### 步骤6: 安装 Node.js (NapCat 需要)

```bash
# 安装 Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 验证版本
node --version   # 应显示 v20.x.x
npm --version    # 应显示 10.x.x
```

### 步骤7: 安装 NapCat

**方式A: Docker 部署 (推荐)**

```bash
# 安装 Docker
curl -fsSL https://get.docker.com | sh

# 将当前用户加入 docker 组 (免 sudo)
sudo usermod -aG docker $USER

# 重新登录或执行
newgrp docker

# 创建 NapCat 数据目录
mkdir -p /opt/napcat/config
mkdir -p /opt/napcat/data

# 运行 NapCat 容器
docker run -d \
  --name napcat \
  --restart always \
  --network host \
  -v /opt/napcat/config:/app/napcat/config \
  -v /opt/napcat/data:/app/napcat/data \
  mlikiowa/napcat-docker:latest

# 查看日志获取登录二维码
docker logs -f napcat
```

**方式B: 直接安装**

```bash
# 创建目录
mkdir -p /opt/napcat
cd /opt/napcat

# 下载 NapCat (从 GitHub Releases)
wget https://github.com/NapNeko/NapCat/releases/download/v2.x.x/NapCat.Shell.zip
unzip NapCat.Shell.zip

# 安装依赖
npm install

# 运行
npm start
```

### 步骤8: 配置 NapCat 登录

```bash
# 查看 NapCat 日志，获取二维码链接
docker logs -f napcat

# 或者访问 WebUI (如果开放了端口)
# http://你的服务器IP:6099
```

**登录步骤：**
1. 查看日志中的二维码链接
2. 用手机QQ扫码登录
3. 登录成功后，配置 WebSocket

**配置正向 WebSocket：**

```bash
# 进入 NapCat 配置目录
cd /opt/napcat/config

# 编辑配置文件 (文件名可能不同)
# 找到或创建 onebot11.json 或类似文件
# 确保包含以下配置：
```

```json
{
  "http": {
    "enable": true,
    "host": "0.0.0.0",
    "port": 3000
  },
  "ws": {
    "enable": true,
    "host": "0.0.0.0",
    "port": 3001
  }
}
```

```bash
# 重启 NapCat
docker restart napcat
```

### 步骤9: 测试运行 NoneBot2

```bash
cd /opt/pokemon-bot/qqbot

# 激活虚拟环境
source venv/bin/activate

# 测试运行
python bot.py
```

看到以下输出表示成功：
```
[INFO] nonebot | NoneBot is initializing...
[INFO] nonebot | Succeeded to load adapter "OneBot V11"
[INFO] nonebot | Succeeded to load plugin "pokemon_game"
[INFO] nonebot | Running on http://0.0.0.0:8080
```

按 `Ctrl+C` 退出测试。

### 步骤10: 使用 PM2 后台运行

```bash
# 安装 PM2
sudo npm install -g pm2

# 创建启动脚本
cd /opt/pokemon-bot/qqbot
cat > start.sh << 'EOF'
#!/bin/bash
cd /opt/pokemon-bot/qqbot
source /opt/pokemon-bot/qqbot/venv/bin/activate
exec python bot.py
EOF
chmod +x start.sh

# 启动服务
pm2 start start.sh --name pokemon-bot --interpreter none

# 查看状态
pm2 status

# 查看日志
pm2 logs pokemon-bot

# 设置开机自启
pm2 startup
pm2 save
```

---

## 四、验证部署

### 1. 检查服务状态

```bash
# 检查 PM2 状态
pm2 status

# 应显示 pokemon-bot 状态为 online

# 检查端口
netstat -tlnp | grep -E "3001|8080"
```

### 2. QQ群测试

在QQ群发送：
- `!帮助` - 应显示帮助信息
- `!开始` - 应显示游戏主菜单
- `1` - 选择新游戏

### 3. 查看日志

```bash
# 实时查看日志
pm2 logs pokemon-bot --lines 100

# 查看错误日志
pm2 logs pokemon-bot --err
```

---

## 五、常用运维命令

```bash
# ========== PM2 命令 ==========
pm2 status              # 查看所有服务状态
pm2 logs pokemon-bot    # 查看日志
pm2 restart pokemon-bot # 重启服务
pm2 stop pokemon-bot    # 停止服务
pm2 delete pokemon-bot  # 删除服务

# ========== NapCat 命令 ==========
docker logs -f napcat   # 查看日志
docker restart napcat   # 重启
docker stop napcat      # 停止
docker start napcat     # 启动

# ========== 更新代码 ==========
cd /opt/pokemon-bot/qqbot
# 上传新代码后
source venv/bin/activate
pip install -r requirements.txt
pm2 restart pokemon-bot

# ========== 备份存档 ==========
tar -czvf saves_backup_$(date +%Y%m%d).tar.gz saves/
```

---

## 六、目录结构

```
/opt/pokemon-bot/qqbot/
├── bot.py                 # 入口文件
├── pyproject.toml         # 项目配置
├── requirements.txt       # Python依赖
├── .env                   # 环境变量配置
├── start.sh               # PM2启动脚本
├── venv/                  # Python虚拟环境
├── data/                  # 游戏数据
│   ├── pokemon.json       # 宝可梦数据
│   ├── moves.json         # 技能数据
│   ├── items.json         # 道具数据
│   ├── maps.json          # 地图数据
│   └── typeChart.json     # 属性克制表
├── plugins/               # NoneBot插件
│   ├── __init__.py
│   └── pokemon_game.py    # 游戏主逻辑
└── saves/                 # 玩家存档 (自动创建)
    ├── 群号_QQ号.json      # 群聊存档
    └── QQ号.json          # 私聊存档
```

---

## 七、游戏指令

| 指令 | 说明 |
|------|------|
| `!开始` / `!游戏` / `!菜单` | 开始游戏/显示主菜单 |
| `!帮助` / `!help` | 显示帮助信息 |
| `!状态` | 查看玩家状态 |
| `!pc` / `!电脑` | 打开PC电脑系统 |

**游戏中操作：** 直接输入数字选择选项

---

## 八、常见问题排查

### Q1: 机器人不回复消息？

**排查步骤：**

```bash
# 1. 检查 NoneBot 是否运行
pm2 status

# 2. 检查 NapCat 是否登录成功
docker logs napcat | grep -i "login\|online"

# 3. 检查 WebSocket 连接
# 在 NoneBot 日志中查找
pm2 logs pokemon-bot | grep -i "websocket\|connect"

# 4. 检查是否在 SUPERUSERS 中
cat .env | grep SUPERUSERS
```

### Q2: NapCat 无法登录？

```bash
# 查看详细错误
docker logs napcat

# 常见原因：
# 1. QQ号被风控 - 换个QQ号或等待一段时间
# 2. 协议问题 - 尝试切换协议 (iPad/aPad/Android)
# 3. 验证码 - 查看 WebUI 或日志中的验证码链接
```

### Q3: WebSocket 连接失败？

```bash
# 检查 NapCat WebSocket 端口
netstat -tlnp | grep 3001

# 检查 NoneBot 配置
cat .env | grep ONEBOT

# 确保 .env 中的地址正确
# ONEBOT_WS_HOSTS=["ws://127.0.0.1:3001"]
```

### Q4: 游戏数据加载失败？

```bash
# 检查数据文件是否存在
ls -la /opt/pokemon-bot/qqbot/data/

# 检查文件权限
chmod 644 /opt/pokemon-bot/qqbot/data/*.json

# 检查 JSON 格式是否正确
python -c "import json; json.load(open('/opt/pokemon-bot/qqbot/data/pokemon.json'))"
```

### Q5: 存档丢失或损坏？

```bash
# 检查存档目录
ls -la /opt/pokemon-bot/qqbot/saves/

# 恢复备份
tar -xzvf saves_backup_xxx.tar.gz -C /opt/pokemon-bot/qqbot/
```

---

## 九、安全建议

1. **使用小号运行** - 不要使用主QQ号
2. **配置防火墙** - 只开放必要端口
   ```bash
   sudo ufw allow 22      # SSH
   sudo ufw allow 3001    # WebSocket (仅内网)
   sudo ufw enable
   ```
3. **定期备份** - 自动备份脚本
   ```bash
   # 添加到 crontab
   0 3 * * * cd /opt/pokemon-bot/qqbot && tar -czvf /backup/saves_$(date +\%Y\%m\%d).tar.gz saves/
   ```
4. **监控日志** - 定期检查异常行为

---

## 十、快速部署脚本

创建一键部署脚本：

```bash
cat > /opt/deploy_pokemon_bot.sh << 'DEPLOY_EOF'
#!/bin/bash
set -e

echo "===== 宝可梦机器人部署脚本 ====="

# 安装依赖
echo "[1/6] 安装系统依赖..."
sudo apt update
sudo apt install -y python3 python3-pip python3-venv nodejs npm

# 安装 PM2
echo "[2/6] 安装 PM2..."
sudo npm install -g pm2

# 安装 Docker (如果没有)
if ! command -v docker &> /dev/null; then
    echo "[3/6] 安装 Docker..."
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
fi

# 创建虚拟环境
echo "[4/6] 配置 Python 环境..."
cd /opt/pokemon-bot/qqbot
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# 创建启动脚本
echo "[5/6] 创建启动脚本..."
cat > start.sh << 'EOF'
#!/bin/bash
cd /opt/pokemon-bot/qqbot
source /opt/pokemon-bot/qqbot/venv/bin/activate
exec python bot.py
EOF
chmod +x start.sh

# 启动服务
echo "[6/6] 启动服务..."
pm2 start start.sh --name pokemon-bot --interpreter none
pm2 startup
pm2 save

echo "===== 部署完成 ====="
echo "请确保 NapCat 已启动并登录"
echo "查看日志: pm2 logs pokemon-bot"
DEPLOY_EOF

chmod +x /opt/deploy_pokemon_bot.sh
```

---

*文档版本: 2.0.0 | 最后更新: 2026-04-13*
