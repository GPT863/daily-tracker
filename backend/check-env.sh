#!/bin/bash

# DailyTracker Backend 环境检查脚本
# 用于检查服务器是否满足部署要求

echo "======================================"
echo " DailyTracker Backend 环境检查"
echo "======================================"
echo ""

# 检查是否为root用户
check_root() {
    if [ "$EUID" -ne 0 ]; then
        echo -e "❌ 用户权限: 非root用户（部分操作可能需要root）"
    else
        echo -e "✅ 用户权限: root"
    fi
}

# 检查操作系统
check_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        echo -e "✅ 操作系统: $PRETTY_NAME"
    else
        echo -e "❌ 操作系统: 无法检测"
    fi
}

# 检查 .NET 运行时
check_dotnet() {
    if command -v dotnet &> /dev/null; then
        VERSION=$(dotnet --version 2>/dev/null | head -1)
        echo -e "✅ .NET 运行时: $VERSION"

        # 检查是否为 .NET 8
        if [[ $VERSION == 8.* ]]; then
            echo -e "   版本正确 ✓"
        else
            echo -e "   ⚠️  建议使用 .NET 8.0"
        fi
    else
        echo -e "❌ .NET 运行时: 未安装"
    fi
}

# 检查内存
check_memory() {
    TOTAL_MEM=$(free -m | awk 'NR==2{print $2}')
    echo -e "✅ 总内存: ${TOTAL_MEM}MB"

    if [ $TOTAL_MEM -lt 512 ]; then
        echo -e "   ⚠️  内存较低，建议至少 1GB"
    fi
}

# 检查磁盘空间
check_disk() {
    DISK_AVAILABLE=$(df -m / | awk 'NR==2{print $4}')
    echo -e "✅ 磁盘空间: 可用 ${DISK_AVAILABLE}MB"

    if [ $DISK_AVAILABLE -lt 500 ]; then
        echo -e "   ⚠️  磁盘空间不足，建议至少 500MB"
    fi
}

# 检查防火墙
check_firewall() {
    if command -v firewall-cmd &> /dev/null; then
        echo -e "✅ 防火墙: firewalld"
        if firewall-cmd --list-ports | grep -q 8080; then
            echo -e "   端口 8080: 已开放 ✓"
        else
            echo -e "   端口 8080: 未开放"
        fi
    elif command -v ufw &> /dev/null; then
        echo -e "✅ 防火墙: ufw"
        if ufw status | grep -q 8080; then
            echo -e "   端口 8080: 已开放 ✓"
        else
            echo -e "   端口 8080: 未开放"
        fi
    else
        echo -e "⚠️  防火墙: 未检测到"
    fi
}

# 检查8080端口
check_port() {
    if netstat -tlnp 2>/dev/null | grep -q :8080; then
        echo -e "⚠️  端口 8080: 已被占用"
        netstat -tlnp 2>/dev/null | grep :8080
    else
        echo -e "✅ 端口 8080: 可用"
    fi
}

# 检查systemd
check_systemd() {
    if command -v systemctl &> /dev/null; then
        echo -e "✅ systemd: 已安装"
    else
        echo -e "❌ systemd: 未安装（无法配置开机自启）"
    fi
}

# 检查MySQL客户端
check_mysql() {
    if command -v mysql &> /dev/null; then
        MYSQL_VERSION=$(mysql --version)
        echo -e "✅ MySQL 客户端: $MYSQL_VERSION"
    else
        echo -e "⚠️  MySQL 客户端: 未安装（不影响后端运行）"
    fi
}

# 主流程
main() {
    check_root
    check_os
    check_dotnet
    check_memory
    check_disk
    check_firewall
    check_port
    check_systemd
    check_mysql

    echo ""
    echo "======================================"
    echo "检查完成！"
    echo "======================================"
    echo ""
    echo "如果有 ❌ 标记，需要先解决问题"
    echo "如果有 ⚠️  标记，建议优化配置"
    echo ""
    echo "准备就绪后，运行："
    echo "  chmod +x deploy.sh"
    echo "  ./deploy.sh"
}

main
