# 服务器部署指南

本文档介绍如何将宝可梦QQ机器人部署到服务器上。

---

## 一、服务器要求

| 项目 | 最低要求 | 推荐配置 |
|------|----------|----------|
| CPU | 1核 | 2核+ |
| 内存 | 512MB | 1GB+ |
| 系统 | Ubuntu 18.04+ / CentOS 7+ | Ubuntu 20.04 |
| 存储 | 1GB | 5GB+ |

---

## 二、安装 Node.js

### Ubuntu/Debian

```bash
# 更新包管理器
sudo apt update

# 安装 Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 验证安装
node -v
npm -v
```

### CentOS/RHEL

```bash
# 安装 Node.js 20.x
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

# 验证安装
node -v
npm -v
```

---

## 三、上传代码到服务器

### 方法1: 使用 Git (推荐)

```bash
# 在服务器上克隆项目
cd /opt
git clone <你的仓库地址> pokemon-bot
cd pokemon-bot/game/packages/bot
```

### 方法2: 使用 SCP 上传

```bash
# 在本地电脑执行
scp -r "/Users/a11/Desktop/game/Digital Monster/game/packages/bot" \
  user@your-server-ip:/opt/pokemon-bot
```

### 方法3: 使用 SFTP 工具

使用 FileZilla、WinSCP 等工具上传整个 `bot` 目录到服务器。

---

## 四、安装依赖和配置

```bash
# 进入项目目录
cd /opt/pokemon-bot

# 安装依赖
npm install

# 首次运行生成配置文件
npm run dev
# 按 Ctrl+C 停止

# 编辑配置文件
nano config.json
```

修改 `config.json`：

```json
{
  "qq": 你的QQ号,
  "password": "你的QQ密码",
  "admins": [管理员QQ号],
  "groups": [允许的群号],
  "triggerPrefix": "!"
}
```

---

## 五、使用 PM2 管理进程

PM2 是一个进程管理器，可以让机器人在后台持续运行。

### 安装 PM2

```bash
sudo npm install -g pm2
```

### 启动机器人

```bash
# 编译项目
npm run build

# 使用 PM2 启动
pm2 start dist/index.js --name pokemon-bot

# 查看运行状态
pm2 status

# 查看日志
pm2 logs pokemon-bot

# 停止机器人
pm2 stop pokemon-bot

# 重启机器人
pm2 restart pokemon-bot
```

### 设置开机自启动

```bash
# 生成启动脚本
pm2 startup

# 按照提示执行输出的命令，类似：
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u username --hp /home/username

# 保存当前进程列表
pm2 save
```

---

## 六、完整部署脚本

创建一键部署脚本 `deploy.sh`：

```bash
#!/bin/bash

# 部署宝可梦QQ机器人
# 用法: bash deploy.sh

set -e

echo "=========================================="
echo "    宝可梦QQ机器人 部署脚本"
echo "=========================================="

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "正在安装 Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi

echo "Node.js 版本: $(node -v)"
echo "NPM 版本: $(npm -v)"

# 检查 PM2
if ! command -v pm2 &> /dev/null; then
    echo "正在安装 PM2..."
    sudo npm install -g pm2
fi

# 安装项目依赖
echo "正在安装项目依赖..."
npm install

# 编译项目
echo "正在编译项目..."
npm run build

# 检查配置文件
if [ ! -f "config.json" ]; then
    echo "正在生成配置文件..."
    node -e "
    const fs = require('fs');
    const config = {
        qq: 123456789,
        password: 'your_password',
        admins: [123456789],
        groups: [],
        triggerPrefix: '!'
    };
    fs.writeFileSync('config.json', JSON.stringify(config, null, 2));
    console.log('请编辑 config.json 后重新运行此脚本');
    "
    echo ""
    echo "=========================================="
    echo "请编辑 config.json 配置文件："
    echo "  nano config.json"
    echo "配置完成后重新运行此脚本"
    echo "=========================================="
    exit 0
fi

# 创建存档目录
mkdir -p saves

# 使用 PM2 启动
echo "正在启动机器人..."
pm2 start dist/index.js --name pokemon-bot

# 设置开机自启动
echo "设置开机自启动..."
pm2 startup
pm2 save

echo ""
echo "=========================================="
echo "部署完成！"
echo ""
echo "常用命令："
echo "  pm2 status          - 查看状态"
echo "  pm2 logs pokemon-bot - 查看日志"
echo "  pm2 restart pokemon-bot - 重启"
echo "  pm2 stop pokemon-bot - 停止"
echo "=========================================="
```

使用方法：

```bash
# 赋予执行权限
chmod +x deploy.sh

# 运行部署脚本
bash deploy.sh
```

---

## 七、防火墙配置

如果服务器有防火墙，需要确保出站连接正常：

```bash
# Ubuntu UFW
sudo ufw allow out 443/tcp
sudo ufw allow out 80/tcp

# CentOS firewalld
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

---

## 八、日志管理

### 查看实时日志

```bash
pm2 logs pokemon-bot
```

### 日志文件位置

```
~/.pm2/logs/pokemon-bot-out.log  # 标准输出
~/.pm2/logs/pokemon-bot-error.log  # 错误日志
```

### 清空日志

```bash
pm2 flush pokemon-bot
```

### 日志轮转（防止日志文件过大）

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

---

## 九、更新机器人

```bash
# 停止机器人
pm2 stop pokemon-bot

# 拉取最新代码（如果使用 Git）
git pull

# 或者重新上传文件

# 重新安装依赖（如有更新）
npm install

# 重新编译
npm run build

# 重启机器人
pm2 restart pokemon-bot
```

---

## 十、常见问题

### Q: 登录需要验证怎么办？

A: 查看日志中的验证链接：
```bash
pm2 logs pokemon-bot
```
打开链接完成验证，然后重启：
```bash
pm2 restart pokemon-bot
```

### Q: 内存占用过高？

A: 限制 Node.js 内存：
```bash
pm2 start dist/index.js --name pokemon-bot --node-args="--max-old-space-size=256"
```

### Q: 如何查看机器人是否在线？

A:
```bash
pm2 status
# 或查看日志
pm2 logs pokemon-bot --lines 50
```

### Q: 如何备份数据？

A: 定期备份 `saves` 目录：
```bash
# 创建备份
tar -czf pokemon-saves-$(date +%Y%m%d).tar.gz saves/

# 下载到本地
scp user@server:/opt/pokemon-bot/pokemon-saves-*.tar.gz ./
```

---

## 十一、Docker 部署（可选）

如果喜欢使用 Docker：

### Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .
RUN npm run build

RUN mkdir -p saves

CMD ["node", "dist/index.js"]
```

### docker-compose.yml

```yaml
version: '3.8'
services:
  pokemon-bot:
    build: .
    container_name: pokemon-bot
    restart: always
    volumes:
      - ./config.json:/app/config.json
      - ./saves:/app/saves
    environment:
      - TZ=Asia/Shanghai
```

### 使用 Docker 部署

```bash
# 构建镜像
docker-compose build

# 启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止
docker-compose down
```

---

## 十二、安全建议

1. **使用小号**：不要使用主QQ号运行机器人
2. **定期备份**：备份 `saves` 目录和 `config.json`
3. **监控日志**：定期检查异常登录
4. **限制权限**：不要使用 root 用户运行
5. **更新依赖**：定期 `npm update` 更新依赖

---

## 快速部署清单

```bash
# 1. 连接服务器
ssh user@your-server

# 2. 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 3. 安装 PM2
sudo npm install -g pm2

# 4. 上传代码到 /opt/pokemon-bot

# 5. 进入目录
cd /opt/pokemon-bot

# 6. 安装依赖
npm install

# 7. 编译
npm run build

# 8. 配置
nano config.json

# 9. 启动
pm2 start dist/index.js --name pokemon-bot

# 10. 设置开机自启
pm2 startup
pm2 save
```

完成！机器人现在应该已经在服务器上运行了。
