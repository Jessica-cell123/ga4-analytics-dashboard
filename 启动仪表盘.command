#!/bin/bash
cd "$(dirname "$0")"
echo "🚀 GA4 数据分析仪表盘启动中..."
python3 -m http.server 8080 > /dev/null 2>&1 &
SERVER_PID=$!
sleep 1
open "http://localhost:8080/dashboard.html"
echo ""
echo "✅ 仪表盘已打开！"
echo "关闭此窗口即可停止服务"
wait $SERVER_PID
