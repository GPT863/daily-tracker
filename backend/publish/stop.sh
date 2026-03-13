#!/bin/bash

# DailyTracker Backend API 停止脚本

echo "======================================"
echo " DailyTracker Backend API - 停止服务"
echo "======================================"
echo ""

echo "正在查找 DailyTracker.Api 进程..."
echo ""

PIDS=$(pgrep -f "DailyTracker.Api")

if [ -n "$PIDS" ]; then
    echo "发现运行中的进程 PID: $PIDS"
    echo "正在终止..."
    kill $PIDS

    # 等待进程结束
    sleep 2

    # 检查是否还在运行
    if pgrep -f "DailyTracker.Api" > /dev/null; then
        echo "强制终止..."
        pkill -9 -f "DailyTracker.Api"
    fi

    echo ""
    echo "[成功] 服务已停止"
else
    echo "[提示] 未发现运行中的服务"
fi

echo ""
