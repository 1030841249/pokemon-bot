#!/bin/bash
set -e

echo "=========================================="
echo "    宝可梦QQ机器人 部署脚本 (NoneBot2)"
echo "=========================================="
echo ""

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

# 检查 Python
echo "检查 Python..."
if ! command -v python3 &> /dev/null; then
    echo "未检测到 Python3，正在安装..."
    sudo apt update
    sudo apt install -y python3 python3-venv python3-pip
fi
echo "Python 版本: $(python3 --version)"
echo ""

# 创建虚拟环境
if [ ! -d "venv" ]; then
    echo "创建虚拟环境..."
    python3 -m venv venv
fi

# 激活虚拟环境并安装依赖
echo "安装依赖..."
source venv/bin/activate
pip install -r requirements.txt -q
echo ""

# 创建存档目录
mkdir -p saves

# 检查 PM2
echo "检查 PM2..."
if ! command -v pm2 &> /dev/null; then
    echo "未检测到 PM2，正在安装..."
    sudo npm install -g pm2
fi
echo ""

# 创建启动脚本
cat > start.sh << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
source venv/bin/activate
exec python bot.py
EOF
chmod +x start.sh

# 检查是否已在运行
if pm2 describe qqbot > /dev/null 2>&1; then
    echo "检测到机器人已在运行，正在重启..."
    pm2 restart qqbot
else
    echo "启动机器人..."
    pm2 start start.sh --name qqbot --interpreter none
fi

echo ""
echo "设置开机自启动..."
pm2 startup 2>/dev/null || true
pm2 save

echo ""
echo "=========================================="
echo "部署完成！"
echo ""
pm2 status qqbot
echo ""
echo "常用命令："
echo "  pm2 status          - 查看状态"
echo "  pm2 logs qqbot      - 查看日志"
echo "  pm2 restart qqbot   - 重启"
echo "  pm2 stop qqbot      - 停止"
echo ""
echo "存档目录: $PROJECT_DIR/saves"
echo "=========================================="

sleep 2
pm2 logs qqbot --lines 15
