#!/bin/bash

# DailyTracker Backend API 启动脚本
# 用于在 Linux 上快速启动服务

echo "======================================"
echo " DailyTracker Backend API"
echo "======================================"
echo ""

# 检查 .NET 运行时
if ! command -v dotnet &> /dev/null; then
    echo "[错误] 未检测到 .NET 运行时"
    echo ""
    echo "请先安装 ASP.NET Core 8.0 运行时"
    echo ""
    echo "Ubuntu/Debian:"
    echo "  apt-get install aspnetcore-runtime-8.0"
    echo ""
    echo "CentOS/RHEL:"
    echo "  yum install aspnetcore-runtime-8.0"
    echo ""
    exit 1
fi

echo "[信息] .NET 运行时已安装"
dotnet --version
echo ""

# 设置环境变量
export ASPNETCORE_ENVIRONMENT=Production
export ASPNETCORE_URLS=http://0.0.0.0:8080

echo "======================================"
echo " 启动配置"
echo "======================================"
echo "  环境: $ASPNETCORE_ENVIRONMENT"
echo "  监听地址: $ASPNETCORE_URLS"
echo "  数据库: Tencent Cloud MySQL"
echo ""
echo "======================================"
echo " 服务启动中..."
echo "======================================"
echo ""

# 启动应用
dotnet DailyTracker.Api.dll
