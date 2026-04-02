#!/bin/bash

# 宝可梦QQ机器人 一键部署脚本
# 用法: bash deploy.sh

set -e

echo "=========================================="
echo "    宝可梦QQ机器人 部署脚本"
echo "=========================================="
echo ""

# 检查是否为 root 用户
if [ "$EUID" -eq 0 ]; then
    echo "警告: 不建议使用 root 用户运行"
    echo "建议使用普通用户运行此脚本"
    read -p "是否继续？(y/n): " continue_root
    if [ "$continue_root" != "y" ]; then
        exit 1
    fi
fi

# 检查 Node.js
echo "检查 Node.js..."
if ! command -v node &> /dev/null; then
    echo "未检测到 Node.js，正在安装..."
    
    # 检测系统类型
    if [ -f /etc/debian_version ]; then
        # Debian/Ubuntu
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt install -y nodejs
    elif [ -f /etc/redhat-release ]; then
        # CentOS/RHEL
        curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
        sudo yum install -y nodejs
    else
        echo "不支持的系统，请手动安装 Node.js"
        exit 1
    fi
fi

echo "Node.js 版本: $(node -v)"
echo "NPM 版本: $(npm -v)"
echo ""

# 检查 PM2
echo "检查 PM2..."
if ! command -v pm2 &> /dev/null; then
    echo "未检测到 PM2，正在安装..."
    sudo npm install -g pm2
fi

echo "PM2 版本: $(pm2 -v)"
echo ""

# 进入脚本所在目录
cd "$(dirname "$0")"

# 安装项目依赖
echo "正在安装项目依赖..."
npm install
echo ""

# 编译项目
echo "正在编译项目..."
npm run build
echo ""

# 检查配置文件
if [ ! -f "config.json" ]; then
    echo "正在生成配置文件..."
    cat > config.json << 'EOF'
{
  "qq": 123456789,
  "password": "your_password",
  "admins": [123456789],
  "groups": [],
  "triggerPrefix": "!"
}
EOF
    
    echo ""
    echo "=========================================="
    echo "配置文件已生成！"
    echo ""
    echo "请编辑 config.json 填写你的QQ信息："
    echo "  nano config.json"
    echo ""
    echo "配置项说明："
    echo "  qq: 机器人QQ号"
    echo "  password: 机器人QQ密码"
    echo "  admins: 管理员QQ号列表"
    echo "  groups: 允许使用的群号(留空则所有群可用)"
    echo ""
    echo "配置完成后重新运行此脚本"
    echo "=========================================="
    exit 0
fi

# 检查配置是否已修改
if grep -q "123456789" config.json; then
    echo "警告: config.json 中的QQ号仍为默认值"
    read -p "是否继续部署？(y/n): " continue_deploy
    if [ "$continue_deploy" != "y" ]; then
        echo "请先修改 config.json"
        exit 1
    fi
fi

# 创建存档目录
mkdir -p saves

# 检查是否已经在运行
if pm2 describe pokemon-bot > /dev/null 2>&1; then
    echo "检测到机器人已在运行"
    read -p "是否重启？(y/n): " restart_bot
    if [ "$restart_bot" = "y" ]; then
        pm2 restart pokemon-bot
    fi
else
    # 使用 PM2 启动
    echo "正在启动机器人..."
    pm2 start dist/index.js --name pokemon-bot
fi

echo ""

# 设置开机自启动
read -p "是否设置开机自启动？(y/n): " auto_start
if [ "$auto_start" = "y" ]; then
    echo "设置开机自启动..."
    pm2 startup
    pm2 save
fi

echo ""
echo "=========================================="
echo "部署完成！"
echo ""
echo "机器人状态："
pm2 status pokemon-bot
echo ""
echo "常用命令："
echo "  pm2 status              - 查看状态"
echo "  pm2 logs pokemon-bot    - 查看日志"
echo "  pm2 restart pokemon-bot - 重启机器人"
echo "  pm2 stop pokemon-bot    - 停止机器人"
echo "  pm2 monit               - 监控面板"
echo ""
echo "存档目录: $(pwd)/saves"
echo "日志目录: ~/.pm2/logs/"
echo "=========================================="

# 显示最新日志
echo ""
echo "最新日志 (按 Ctrl+C 退出日志查看):"
echo "----------------------------------------"
sleep 2
pm2 logs pokemon-bot --lines 20
