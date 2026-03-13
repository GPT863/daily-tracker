@echo off
REM DailyTracker Backend 快速上传部署工具
REM 用于将后端文件上传到Linux服务器

echo ======================================
echo  DailyTracker Backend 上传工具
echo ======================================
echo.

REM 检查是否安装了 pscp (PuTTY's SCP)
where pscp >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未找到 pscp 命令
    echo.
    echo 请选择安装方式：
    echo 1. 下载 PuTTY（包含 pscp）
    echo    访问：https://www.chiark.greenend.org.uk/~sgtatham/putty/latest.html
    echo.
    echo 2. 使用 WinSCP 图形界面工具
    echo    访问：https://winscp.net/
    echo.
    echo 3. 手动上传 backend 文件夹到服务器的 /opt 目录
    echo.
    pause
    exit /b 1
)

REM 输入服务器信息
set /p SERVER_IP="请输入服务器IP地址: "
set /p SERVER_USER="请输入SSH用户名（默认root）: "

if "%SERVER_USER%"=="" set SERVER_USER=root

set /p SERVER_PATH="请输入目标路径（默认 /opt/daily-tracker-backend）: "

if "%SERVER_PATH%"=="" set SERVER_PATH=/opt/daily-tracker-backend

echo.
echo ======================================
echo  上传信息
echo ======================================
echo  服务器: %SERVER_USER%@%SERVER_IP%
echo  目标路径: %SERVER_PATH%
echo  源文件: backend/
echo.
echo 准备上传，请确认...
pause

REM 执行上传
echo.
echo 正在上传文件到服务器...
echo.

pscp -r -P 22 backend %SERVER_USER%@%SERVER_IP%:%SERVER_PATH%

if %errorlevel% equ 0 (
    echo.
    echo ======================================
    echo [成功] 文件上传完成！
    echo ======================================
    echo.
    echo 接下来的步骤：
    echo 1. SSH 登录服务器：
    echo    ssh %SERVER_USER%@%SERVER_IP%
    echo.
    echo 2. 进入项目目录：
    echo    cd %SERVER_PATH%/backend
    echo.
    echo 3. 执行部署脚本：
    echo    chmod +x deploy.sh
    echo    ./deploy.sh
    echo.
) else (
    echo.
    echo ======================================
    echo [失败] 文件上传失败
    echo ======================================
    echo.
    echo 可能的原因：
    echo 1. 服务器IP或端口错误
    echo 2. SSH用户名或密码错误
    echo 3. 网络连接问题
    echo.
    echo 请检查后重试。
)

echo.
pause
