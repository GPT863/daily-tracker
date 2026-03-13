#!/bin/bash

# DailyTracker Backend 自动部署脚本
# 支持：CentOS 7/8, Ubuntu 18.04+, Debian 10+

set -e

echo "======================================"
echo " DailyTracker Backend 部署脚本"
echo "======================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}请使用 root 用户执行此脚本${NC}"
    exit 1
fi

# 检测系统类型
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        VERSION=$VERSION_ID
    else
        echo -e "${RED}无法检测系统类型${NC}"
        exit 1
    fi

    echo -e "${GREEN}检测到系统: $OS $VERSION${NC}"
}

# 安装 .NET 8 运行时
install_dotnet() {
    echo -e "${YELLOW}正在安装 .NET 8 运行时...${NC}"

    case $OS in
        centos|rhel|almalinux|rocky)
            # CentOS/RHEL 系列
            yum install -y libicu libunwind
            rpm -Uvh https://packages.microsoft.com/config/rhel/9/packages-microsoft-prod.rpm || \
            rpm -Uvh https://packages.microsoft.com/config/rhel/8/packages-microsoft-prod.rpm
            yum install -y aspnetcore-runtime-8.0
            ;;

        ubuntu|debian)
            # Ubuntu/Debian 系列
            apt-get update
            apt-get install -y libicu70 libunwind8 || \
            apt-get install -y libicu66 libunwind8

            if [ "$OS" = "ubuntu" ]; then
                wget https://packages.microsoft.com/config/ubuntu/22.04/packages-microsoft-prod.deb -O packages-microsoft-prod.deb || \
                wget https://packages.microsoft.com/config/ubuntu/20.04/packages-microsoft-prod.deb -O packages-microsoft-prod.deb
            else
                wget https://packages.microsoft.com/config/debian/11/packages-microsoft-prod.deb -O packages-microsoft-prod.deb || \
                wget https://packages.microsoft.com/config/debian/10/packages-microsoft-prod.deb -O packages-microsoft-prod.deb
            fi

            dpkg -i packages-microsoft-prod.deb
            apt-get update
            apt-get install -y aspnetcore-runtime-8.0
            rm -f packages-microsoft-prod.deb
            ;;

        *)
            echo -e "${RED}不支持的操作系统: $OS${NC}"
            exit 1
            ;;
    esac

    echo -e "${GREEN}.NET 8 运行时安装完成${NC}"
    dotnet --info
}

# 配置防火墙
configure_firewall() {
    echo -e "${YELLOW}正在配置防火墙...${NC}"

    case $OS in
        centos|rhel|almalinux|rocky)
            if command -v firewall-cmd &> /dev/null; then
                firewall-cmd --permanent --add-port=8080/tcp
                firewall-cmd --reload
                echo -e "${GREEN}防火墙配置完成（firewalld）${NC}"
            else
                echo -e "${YELLOW}未检测到 firewalld，跳过防火墙配置${NC}"
            fi
            ;;

        ubuntu|debian)
            if command -v ufw &> /dev/null; then
                ufw allow 8080/tcp
                echo -e "${GREEN}防火墙配置完成（ufw）${NC}"
            else
                echo -e "${YELLOW}未检测到 ufw，跳过防火墙配置${NC}"
            fi
            ;;

        *)
            echo -e "${YELLOW}跳过防火墙配置${NC}"
            ;;
    esac
}

# 发布应用
publish_app() {
    echo -e "${YELLOW}正在发布应用...${NC}"

    cd backend/src/DailyTracker.Api

    # 检查是否需要配置数据库
    if [ ! -f "appsettings.Production.json" ]; then
        echo -e "${YELLOW}提示：请先配置 appsettings.Production.json${NC}"
        echo -e "${YELLOW}特别是数据库连接字符串和JWT密钥${NC}"
        cp appsettings.json appsettings.Production.json
        echo -e "${YELLOW}已创建 appsettings.Production.json，请手动编辑配置${NC}"
        read -p "是否现在编辑配置文件？(y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            ${EDITOR:-nano} appsettings.Production.json
        fi
    fi

    dotnet publish -c Release -o ./publish

    echo -e "${GREEN}应用发布完成${NC}"
}

# 创建 systemd 服务
create_service() {
    echo -e "${YELLOW}正在创建 systemd 服务...${NC}"

    # 获取当前目录的绝对路径
    CURRENT_DIR=$(pwd)
    PUBLISH_DIR="$CURRENT_DIR/backend/src/DailyTracker.Api/publish"

    cat > /etc/systemd/system/daily-tracker-api.service <<EOF
[Unit]
Description=DailyTracker Backend API
After=network.target

[Service]
Type=notify
WorkingDirectory=$PUBLISH_DIR
ExecStart=/usr/bin/dotnet $PUBLISH_DIR/DailyTracker.Api.dll --urls "http://0.0.0.0:8080"
Restart=always
RestartSec=10
KillSignal=SIGINT
SyslogIdentifier=daily-tracker-api
User=root
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=DOTNET_PRINT_TELEMETRY_MESSAGE=false

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    echo -e "${GREEN}systemd 服务创建完成${NC}"
}

# 启动服务
start_service() {
    echo -e "${YELLOW}正在启动服务...${NC}"

    systemctl enable daily-tracker-api
    systemctl start daily-tracker-api

    sleep 3

    if systemctl is-active --quiet daily-tracker-api; then
        echo -e "${GREEN}服务启动成功！${NC}"
    else
        echo -e "${RED}服务启动失败，请查看日志：${NC}"
        journalctl -u daily-tracker-api -n 20
        exit 1
    fi
}

# 显示部署结果
show_result() {
    echo ""
    echo "======================================"
    echo -e "${GREEN}🎉 部署完成！${NC}"
    echo "======================================"
    echo ""
    echo "服务地址："
    echo -e "  http://$(hostname -I | awk '{print $1}'):8080"
    echo ""
    echo "健康检查："
    echo -e "  curl http://$(hostname -I | awk '{print $1}'):8080/health"
    echo ""
    echo "常用命令："
    echo -e "  查看状态: ${YELLOW}systemctl status daily-tracker-api${NC}"
    echo -e "  查看日志: ${YELLOW}journalctl -u daily-tracker-api -f${NC}"
    echo -e "  重启服务: ${YELLOW}systemctl restart daily-tracker-api${NC}"
    echo -e "  停止服务: ${YELLOW}systemctl stop daily-tracker-api${NC}"
    echo ""
    echo "======================================"
    echo ""
    echo -e "${YELLOW}⚠️  重要提示：${NC}"
    echo "1. 请在云服务商控制台配置安全组，开放 8080 端口"
    echo "2. 修改 appsettings.Production.json 中的 JWT 密钥"
    echo "3. 配置数据库连接字符串"
    echo "4. 建议后续配置 Nginx 反向代理和 HTTPS"
    echo ""
}

# 主流程
main() {
    detect_os
    install_dotnet
    configure_firewall
    publish_app
    create_service
    start_service
    show_result
}

# 执行主流程
main
